import { NextRequest, NextResponse } from 'next/server'
import { gifts } from '@/lib/gifts-data'
import { readClaims, writeClaims } from '@/lib/claims'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  const giftId    = String(body.giftId    ?? '').trim()
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

  if (gift.limit !== null && current.length >= gift.limit) {
    return NextResponse.json({ error: 'Presente já escolhido' }, { status: 409 })
  }

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
