import { createHash } from 'crypto'

export const OWNER_COOKIE = 'owner_session'
const SALT = ':antonia80-owner-2026'

export function computeToken(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

export function verifyToken(cookieValue: string | undefined): boolean {
  const pw = process.env.OWNER_PASSWORD
  if (!pw || !cookieValue) return false
  return cookieValue === computeToken(pw)
}
