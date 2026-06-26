import { createHash } from 'crypto'

export const ADMIN_COOKIE = 'admin_session'
const SALT = ':antonia80-admin-2026'

/** Node.js (server actions / API routes) */
export function computeToken(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

export function verifyToken(cookieValue: string | undefined): boolean {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw || !cookieValue) return false
  return cookieValue === computeToken(pw)
}
