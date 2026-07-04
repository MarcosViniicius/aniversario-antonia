import { NextRequest, NextResponse } from 'next/server'
import { gifts } from '@/lib/gifts-data'
import { readClaims, countClaims, insertClaim, deleteClaim } from '@/lib/claims'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const claims = await readClaims()
  return NextResponse.json(claims, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: NextRequest) {
  let body: { giftId?: unknown; claimedBy?: unknown; phone?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const giftId    = String(body.giftId    ?? '').trim()
  const claimedBy = String(body.claimedBy ?? '').trim()
  const phone     = String(body.phone     ?? '').trim()

  if (!giftId || !claimedBy || !phone) {
    return NextResponse.json({ error: 'giftId, claimedBy e phone são obrigatórios' }, { status: 400 })
  }

  const gift = gifts.find(g => g.id === Number(giftId))
  if (!gift) {
    return NextResponse.json({ error: 'Presente não encontrado' }, { status: 404 })
  }

  // Check limit before inserting (only for limited gifts)
  if (gift.limit !== null) {
    const current = await countClaims(giftId)
    if (current >= gift.limit) {
      return NextResponse.json({ error: 'Presente já escolhido' }, { status: 409 })
    }
  }

  try {
    await insertClaim(giftId, { claimedBy, phone, claimedAt: new Date().toISOString() })
  } catch (err: unknown) {
    // Postgres unique violation: same person trying to claim again
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json({ error: 'Você já escolheu este presente' }, { status: 409 })
    }
    console.error('[POST /api/gifts]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
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

  try {
    await deleteClaim(giftId, claimedBy || undefined)
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
