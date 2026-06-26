import { NextRequest, NextResponse } from 'next/server'
import { gifts } from '@/lib/gifts-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ClaimRecord {
  claimedBy: string
  claimedAt: string
}

// Each gift stores an array of claimants.
// Regular gifts (limit: 1) will have at most 1 entry.
// PIX (limit: null) can have unlimited entries.
type ClaimsData = Record<string, ClaimRecord[]>

const memStore: ClaimsData = {}

function hasKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

async function readClaims(): Promise<ClaimsData> {
  if (hasKv()) {
    try {
      const { kv } = await import('@vercel/kv')
      return (await kv.get<ClaimsData>('gift-claims-v2')) ?? {}
    } catch (err) {
      console.error('[KV] read error:', err)
    }
  }
  return JSON.parse(JSON.stringify(memStore)) as ClaimsData
}

async function writeClaims(data: ClaimsData): Promise<void> {
  if (hasKv()) {
    try {
      const { kv } = await import('@vercel/kv')
      await kv.set('gift-claims-v2', data)
      return
    } catch (err) {
      console.error('[KV] write error:', err)
    }
  }
  Object.keys(memStore).forEach(k => delete memStore[k])
  Object.assign(memStore, JSON.parse(JSON.stringify(data)))
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

  const giftId  = String(body.giftId  ?? '').trim()
  const claimedBy = String(body.claimedBy ?? '').trim()

  if (!giftId || !claimedBy) {
    return NextResponse.json({ error: 'giftId e claimedBy são obrigatórios' }, { status: 400 })
  }

  const gift = gifts.find(g => g.id === Number(giftId))
  if (!gift) {
    return NextResponse.json({ error: 'Presente não encontrado' }, { status: 404 })
  }

  const claims  = await readClaims()
  const current = claims[giftId] ?? []

  // Reject if limit reached (null = unlimited)
  if (gift.limit !== null && current.length >= gift.limit) {
    return NextResponse.json({ error: 'Presente já escolhido' }, { status: 409 })
  }

  // Prevent duplicate by same person
  if (current.some(c => c.claimedBy === claimedBy)) {
    return NextResponse.json({ error: 'Você já escolheu este presente' }, { status: 409 })
  }

  claims[giftId] = [...current, { claimedBy, claimedAt: new Date().toISOString() }]
  await writeClaims(claims)

  return NextResponse.json(claims[giftId], { status: 201 })
}

export async function DELETE(request: NextRequest) {
  let body: { giftId?: unknown; claimedBy?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const giftId    = String(body.giftId    ?? '').trim()
  const claimedBy = String(body.claimedBy ?? '').trim()

  if (!giftId) {
    return NextResponse.json({ error: 'giftId é obrigatório' }, { status: 400 })
  }

  const claims = await readClaims()
  const current = claims[giftId] ?? []

  claims[giftId] = claimedBy
    ? current.filter(c => c.claimedBy !== claimedBy)
    : []

  await writeClaims(claims)
  return NextResponse.json({ success: true })
}
