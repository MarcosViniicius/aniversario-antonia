const KEY_V1 = 'antonia80anos-minha-escolha'
const KEY_V2 = 'antonia80anos-minhas-escolhas'

export interface UserClaim {
  giftId: number
  giftName: string
  userName: string
  phone: string
  claimedAt: string
}

export function getUserClaims(): UserClaim[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY_V2)
    if (raw) return JSON.parse(raw) as UserClaim[]

    // Migrate from v1 (single claim)
    const old = localStorage.getItem(KEY_V1)
    if (old) {
      const migrated = [JSON.parse(old) as UserClaim]
      localStorage.setItem(KEY_V2, JSON.stringify(migrated))
      localStorage.removeItem(KEY_V1)
      return migrated
    }
    return []
  } catch {
    return []
  }
}

export function saveUserClaims(claims: UserClaim[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY_V2, JSON.stringify(claims)) } catch {}
}

export function clearUserClaims(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY_V2)
    localStorage.removeItem(KEY_V1)
  } catch {}
}
