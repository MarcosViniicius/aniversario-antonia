import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ClaimRecord {
  claimedBy: string
  claimedAt: string
}

type ClaimsData = Record<string, ClaimRecord>

// In-memory fallback — works in dev and when KV is not configured.
// NOTE: serverless instances don't share memory, so this only persists
// within a single instance lifetime. Configure Vercel KV for production.
const memStore: ClaimsData = {}

function hasKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function readClaims(): Promise<ClaimsData> {
  if (hasKv()) {
    try {
      const { kv } = await import('@vercel/kv')
      return (await kv.get<ClaimsData>('gift-claims')) ?? {}
    } catch (err) {
      console.error('[KV] read error:', err)
    }
  }
  return { ...memStore }
}

async function writeClaims(data: ClaimsData): Promise<void> {
  if (hasKv()) {
    try {
      const { kv } = await import('@vercel/kv')
      await kv.set('gift-claims', data)
      return
    } catch (err) {
      console.error('[KV] write error:', err)
    }
  }
  Object.keys(memStore).forEach(k => delete memStore[k])
  Object.assign(memStore, data)
}

export async function GET() {
  const claims = await readClaims()
  return NextResponse.json(claims, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: NextRequest) {
  let body: { giftId?: unknown; claimedBy?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const giftId = String(body.giftId ?? '').trim()
  const claimedBy = String(body.claimedBy ?? '').trim()

  if (!giftId || !claimedBy) {
    return NextResponse.json({ error: 'giftId e claimedBy são obrigatórios' }, { status: 400 })
  }

  const claims = await readClaims()

  if (claims[giftId]) {
    return NextResponse.json({ error: 'Presente já escolhido' }, { status: 409 })
  }

  claims[giftId] = { claimedBy, claimedAt: new Date().toISOString() }
  await writeClaims(claims)

  return NextResponse.json(claims[giftId], { status: 201 })
}

export async function DELETE(request: NextRequest) {
  let body: { giftId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const giftId = String(body.giftId ?? '').trim()
  if (!giftId) {
    return NextResponse.json({ error: 'giftId é obrigatório' }, { status: 400 })
  }

  const claims = await readClaims()
  delete claims[giftId]
  await writeClaims(claims)

  return NextResponse.json({ success: true })
}
