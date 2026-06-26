import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'admin_session'
const SALT = ':antonia80-admin-2026'

/** Web Crypto (Edge runtime) — mesmo hash que lib/admin-auth.ts no Node */
async function computeTokenEdge(password: string): Promise<string> {
  const data = new TextEncoder().encode(password + SALT)
  const buf  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams, protocol } = request.nextUrl

  if (!pathname.startsWith('/admin')) return NextResponse.next()

  // ── URL-based auto-login via ?p=<senha> ───────────────────────────────────
  // Funciona em qualquer rota /admin/* (ex: /admin?p=senha ou /admin/login?p=senha)
  // Segurança: a senha é consumida aqui (Edge, antes do JS da página);
  // o redirect imediato para /admin limpa a URL do histórico do browser.
  // NÃO compartilhe o link — use apenas para abrir no seu próprio dispositivo.
  const p = searchParams.get('p')
  if (p !== null) {
    const adminPw = process.env.ADMIN_PASSWORD
    if (adminPw && p === adminPw) {
      const token    = await computeTokenEdge(adminPw)
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.set(ADMIN_COOKIE, token, {
        httpOnly: true,
        secure:   protocol === 'https:',
        sameSite: 'strict',
        maxAge:   60 * 60 * 24 * 7, // 7 dias
        path:     '/',
      })
      return response
    }
    // Senha errada → login limpo (sem expor detalhes na URL)
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // ── Página de login não precisa de cookie ─────────────────────────────────
  if (pathname === '/admin/login') return NextResponse.next()

  // ── Demais rotas /admin/* exigem cookie válido ────────────────────────────
  const adminPw = process.env.ADMIN_PASSWORD
  const cookie  = request.cookies.get(ADMIN_COOKIE)

  if (!adminPw || !cookie?.value) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const expected = await computeTokenEdge(adminPw)
  if (cookie.value !== expected) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
