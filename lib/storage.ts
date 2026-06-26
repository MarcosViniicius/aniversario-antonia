const KEY = 'antonia80anos-minha-escolha'

export interface UserClaim {
  giftId: number
  giftName: string
  userName: string
  claimedAt: string
}

export function getUserClaim(): UserClaim | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as UserClaim) : null
  } catch {
    return null
  }
}

export function saveUserClaim(claim: UserClaim): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(claim))
  } catch {
    // localStorage full or disabled — silent fail, server KV is primary
  }
}

export function clearUserClaim(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(KEY)
  } catch {
    // silent fail
  }
}
