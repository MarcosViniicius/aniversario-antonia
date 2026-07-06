import { NextResponse } from 'next/server'
import { OWNER_COOKIE } from '@/lib/owner-auth'

export const runtime = 'nodejs'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(OWNER_COOKIE, '', { maxAge: 0, path: '/' })
  return response
}
