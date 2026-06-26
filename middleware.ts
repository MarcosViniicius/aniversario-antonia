import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const COOKIE = 'admin_session'
const SALT   = ':antonia80-admin-2026'

/** Web Crypto (Edge runtime) — same hash as the Node.js version in lib/admin-auth.ts */
async function computeTokenEdge(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + SALT)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard /admin/* — let /admin/login and /api/* pass freely
  if (!pathname.startsWith('/admin') || pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  const password = process.env.ADMIN_PASSWORD
  const cookie   = request.cookies.get(COOKIE)

  if (!password || !cookie?.value) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const expected = await computeTokenEdge(password)
  if (cookie.value !== expected) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
