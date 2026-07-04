import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { deleteClaim } from '@/lib/claims'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  const cookieStore = cookies()
  const session = cookieStore.get(ADMIN_COOKIE)

  if (!verifyToken(session?.value)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

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
    const removed = await deleteClaim(giftId, claimedBy || undefined)
    return NextResponse.json({ success: true, removed })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
