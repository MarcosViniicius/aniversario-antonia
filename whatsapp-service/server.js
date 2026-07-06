const express    = require('express')
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode     = require('qrcode')
const fs         = require('fs')
const path       = require('path')

// Remove Chromium singleton lock files left by a previous container instance.
// Without this, a redeployed container fails to start because the lock references
// a different hostname/PID from the old container.
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

if (!APIKEY) {
  console.warn('[WARN] API_KEY not set — all requests will be rejected')
}

app.use(express.json())

// ── Auth middleware ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.headers['x-api-key'] !== APIKEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// ── WhatsApp client state ─────────────────────────────────────────────────────
let qrDataURL    = null   // base64 QR image while disconnected
let isReady      = false
let connectedPhone = null

function buildClient() {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      // In Docker: PUPPETEER_EXECUTABLE_PATH points to system Chromium.
      // Outside Docker: undefined → Puppeteer uses its own bundled browser.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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
    isReady       = false
    connectedPhone = null
    console.log('[WA] QR code generated — scan with WhatsApp')
  })

  client.on('authenticated', () => {
    qrDataURL = null
    console.log('[WA] Authenticated')
  })

  client.on('ready', () => {
    isReady       = true
    qrDataURL     = null
    connectedPhone = client.info?.wid?.user ?? null
    console.log('[WA] Ready — phone:', connectedPhone)
  })

  client.on('disconnected', (reason) => {
    isReady       = false
    connectedPhone = null
    qrDataURL     = null
    console.log('[WA] Disconnected:', reason, '— restarting in 5s')
    setTimeout(buildClient, 5_000)
  })

  client.on('auth_failure', (msg) => {
    console.error('[WA] Auth failure:', msg)
  })

  client.initialize().catch(err => {
    console.error('[WA] Initialize error:', err.message)
    setTimeout(buildClient, 10_000)
  })

  return client
}

let waClient = buildClient()

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /status — connection info
app.get('/status', (_req, res) => {
  res.json({
    connected:    isReady,
    phone:        connectedPhone,
    hasQR:        !!qrDataURL,
  })
})

// GET /qr — returns base64 QR image (or connected:true if already up)
app.get('/qr', (_req, res) => {
  if (isReady)     return res.json({ connected: true })
  if (!qrDataURL)  return res.json({ waiting: true, message: 'QR not yet generated — retry in a few seconds' })
  res.json({ qr: qrDataURL })
})

// POST /send — send a WhatsApp message
// Body: { phone: "(85) 99999-9999", message: "Olá!" }
app.post('/send', async (req, res) => {
  const { phone, message } = req.body ?? {}

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' })
  }

  if (!isReady) {
    return res.status(503).json({ error: 'WhatsApp not connected — scan the QR code first' })
  }

  // Normalize phone → 55XXXXXXXXXXX@c.us
  const digits = String(phone).replace(/\D/g, '')
  const normalized = (digits.startsWith('55') ? digits : '55' + digits) + '@c.us'

  try {
    await waClient.sendMessage(normalized, message)
    res.json({ success: true, to: normalized })
  } catch (err) {
    console.error('[WA] Send error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /logout — disconnect WhatsApp session
app.post('/logout', async (_req, res) => {
  try {
    await waClient.logout()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`[WA Service] Listening on port ${PORT}`)
})
