const express    = require('express')
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode     = require('qrcode')
const fs         = require('fs')
const path       = require('path')

// Remove Chromium singleton lock files left by a previous container instance.
function cleanChromiumLocks(dir) {
  if (!fs.existsSync(dir)) return
  for (const name of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
    const file = path.join(dir, name)
    try { fs.unlinkSync(file); console.log('[WA] Removed stale lock:', file) } catch {}
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) cleanChromiumLocks(path.join(dir, entry.name))
  }
}
cleanChromiumLocks('./.wwebjs_auth')

const app    = express()
const PORT   = process.env.PORT || 3100
const APIKEY = process.env.API_KEY || ''

if (!APIKEY) console.warn('[WARN] API_KEY not set — all requests will be rejected')

app.use(express.json())

// ── Auth middleware ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== APIKEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// ── WhatsApp client state ─────────────────────────────────────────────────────
let waClient      = null
let qrDataURL     = null
let isReady       = false
let connectedPhone = null
let isRestarting  = false

async function restartClient(delayMs = 5_000) {
  if (isRestarting) return
  isRestarting   = true
  isReady        = false
  connectedPhone = null
  qrDataURL      = null

  const old = waClient
  waClient = null

  if (old) {
    try { await old.destroy() } catch {}
  }
  cleanChromiumLocks('./.wwebjs_auth')

  setTimeout(() => {
    isRestarting = false
    waClient = buildClient()
  }, delayMs)
}

function buildClient() {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions',
        '--no-first-run',
      ],
    },
  })

  client.on('qr', async (qr) => {
    try { qrDataURL = await qrcode.toDataURL(qr) } catch {}
    isReady        = false
    connectedPhone = null
    console.log('[WA] QR code generated — scan with WhatsApp')
  })

  client.on('authenticated', () => {
    qrDataURL = null
    console.log('[WA] Authenticated')
  })

  client.on('ready', () => {
    isReady        = true
    qrDataURL      = null
    connectedPhone = client.info?.wid?.user ?? null
    console.log('[WA] Ready — phone:', connectedPhone)
  })

  client.on('disconnected', (reason) => {
    console.log('[WA] Disconnected:', reason, '— restarting in 5s')
    restartClient(5_000)
  })

  client.on('auth_failure', (msg) => {
    console.error('[WA] Auth failure:', msg, '— restarting in 10s')
    restartClient(10_000)
  })

  client.initialize().catch(err => {
    console.error('[WA] Initialize error:', err.message)
    restartClient(10_000)
  })

  return client
}

waClient = buildClient()

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/status', (_req, res) => {
  res.json({ connected: isReady, phone: connectedPhone, hasQR: !!qrDataURL })
})

app.get('/qr', (_req, res) => {
  if (isReady)    return res.json({ connected: true })
  if (!qrDataURL) return res.json({ waiting: true, message: 'QR not yet generated — retry in a few seconds' })
  res.json({ qr: qrDataURL })
})

app.post('/send', async (req, res) => {
  const { phone, message } = req.body ?? {}

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' })
  }
  if (!isReady || !waClient) {
    return res.status(503).json({ error: 'WhatsApp not connected — scan the QR code first' })
  }

  // Normalize → 55XXXXXXXXXXX@c.us
  const digits     = String(phone).replace(/\D/g, '')
  const normalized = (digits.startsWith('55') ? digits : '55' + digits) + '@c.us'

  try {
    const sendTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('sendMessage timeout')), 20_000)
    )
    await Promise.race([waClient.sendMessage(normalized, message), sendTimeout])
    console.log('[WA] Sent to', normalized)
    res.json({ success: true, to: normalized })
  } catch (err) {
    console.error('[WA] Send error:', err.message)
    if (err.message.includes('timeout')) {
      console.warn('[WA] Browser em estado inválido — reiniciando sessão')
      restartClient(1_000)
    }
    res.status(500).json({ error: err.message })
  }
})

app.post('/logout', async (_req, res) => {
  try {
    await waClient?.logout()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[WA Service] Listening on port ${PORT}`)
})
