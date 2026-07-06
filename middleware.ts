import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'admin_session'
export const OWNER_COOKIE = 'owner_session'

const ADMIN_SALT = ':antonia80-admin-2026'
const OWNER_SALT = ':antonia80-owner-2026'

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams, protocol } = request.nextUrl

  // ── /admin/* ──────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // URL auto-login via ?p=<senha>
    const p = searchParams.get('p')
    if (p !== null) {
      const adminPw = process.env.ADMIN_PASSWORD
      if (adminPw && p === adminPw) {
        const token    = await sha256(adminPw + ADMIN_SALT)
        const response = NextResponse.redirect(new URL('/admin', request.url))
        response.cookies.set(ADMIN_COOKIE, token, {
          httpOnly: true, secure: protocol === 'https:', sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7, path: '/',
        })
        return response
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    if (pathname === '/admin/login') return NextResponse.next()

    const adminPw = process.env.ADMIN_PASSWORD
    const cookie  = request.cookies.get(ADMIN_COOKIE)
    if (!adminPw || !cookie?.value) return NextResponse.redirect(new URL('/admin/login', request.url))
    const expected = await sha256(adminPw + ADMIN_SALT)
    if (cookie.value !== expected) return NextResponse.redirect(new URL('/admin/login', request.url))
    return NextResponse.next()
  }

  // ── /owner/* ──────────────────────────────────────────────────────────────
  if (pathname.startsWith('/owner')) {
    if (pathname === '/owner/login') return NextResponse.next()

    const ownerPw = process.env.OWNER_PASSWORD
    const cookie  = request.cookies.get(OWNER_COOKIE)
    if (!ownerPw || !cookie?.value) return NextResponse.redirect(new URL('/owner/login', request.url))
    const expected = await sha256(ownerPw + OWNER_SALT)
    if (cookie.value !== expected) return NextResponse.redirect(new URL('/owner/login', request.url))
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/owner', '/owner/:path*'],
}
