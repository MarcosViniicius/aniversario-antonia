import { NextRequest, NextResponse } from 'next/server'
import { computeToken, ADMIN_COOKIE } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: { password?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const provided = String(body.password ?? '').trim()
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD não configurado no servidor.' },
      { status: 503 },
    )
  }

  if (!provided || provided !== expected) {
    // Constant-time-ish: always compute token even on wrong password
    computeToken(provided || 'wrong')
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
  }

  const token    = computeToken(expected)
  const response = NextResponse.json({ success: true })

  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   60 * 60 * 24 * 7, // 7 days
    path:     '/',
  })

  return response
}
