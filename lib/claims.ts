export interface ClaimRecord {
  claimedBy: string
  claimedAt: string
}

// Each gift key maps to an array of claimants.
// limit:1 gifts will have at most 1 entry; limit:null (PIX) can have many.
export type ClaimsData = Record<string, ClaimRecord[]>

const KV_KEY = 'gift-claims-v2'

// In-memory fallback for dev / when KV is not configured.
// WARNING: not shared across serverless instances — configure Vercel KV for production.
const memStore: ClaimsData = {}

export function hasKv(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

export async function readClaims(): Promise<ClaimsData> {
  if (hasKv()) {
    try {
      const { kv } = await import('@vercel/kv')
      return (await kv.get<ClaimsData>(KV_KEY)) ?? {}
    } catch (err) {
      console.error('[KV] read error:', err)
    }
  }
  return JSON.parse(JSON.stringify(memStore)) as ClaimsData
}

export async function writeClaims(data: ClaimsData): Promise<void> {
  if (hasKv()) {
    try {
      const { kv } = await import('@vercel/kv')
      await kv.set(KV_KEY, data)
      return
    } catch (err) {
      console.error('[KV] write error:', err)
    }
  }
  Object.keys(memStore).forEach(k => delete memStore[k])
  Object.assign(memStore, JSON.parse(JSON.stringify(data)))
}
