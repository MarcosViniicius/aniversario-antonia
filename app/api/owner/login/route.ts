import { NextRequest, NextResponse } from 'next/server'
import { computeToken, OWNER_COOKIE } from '@/lib/owner-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({})) as { password?: string }

  const ownerPw = process.env.OWNER_PASSWORD
  if (!ownerPw || password !== ownerPw) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const token    = computeToken(ownerPw)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   60 * 60 * 24 * 30, // 30 dias
    path:     '/',
  })
  return response
}
