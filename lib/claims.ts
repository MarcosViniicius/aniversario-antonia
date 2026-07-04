import { createClient } from '@supabase/supabase-js'

export interface ClaimRecord {
  claimedBy: string
  phone: string
  claimedAt: string
}

export type ClaimsData = Record<string, ClaimRecord[]>

// ── Supabase client (server-side only, never exposed to browser) ─────────────
function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  return createClient(url, key, { auth: { persistSession: false } })
}

function hasSupabase(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// In-memory fallback for local dev without Supabase configured
const memStore: ClaimsData = {}

// ── Read all claims, grouped by gift_id ──────────────────────────────────────
export async function readClaims(): Promise<ClaimsData> {
  if (!hasSupabase()) return JSON.parse(JSON.stringify(memStore)) as ClaimsData

  const { data, error } = await getClient()
    .from('gift_claims')
    .select('gift_id, claimed_by, phone, claimed_at')
    .order('claimed_at', { ascending: true })

  if (error) {
    console.error('[Supabase] readClaims:', error.message)
    return {}
  }

  const result: ClaimsData = {}
  for (const row of data ?? []) {
    const key = String(row.gift_id)
    if (!result[key]) result[key] = []
    result[key].push({ claimedBy: row.claimed_by, phone: row.phone, claimedAt: row.claimed_at })
  }
  return result
}

// ── Count claims for a specific gift ─────────────────────────────────────────
export async function countClaims(giftId: string): Promise<number> {
  if (!hasSupabase()) return (memStore[giftId] ?? []).length

  const { count, error } = await getClient()
    .from('gift_claims')
    .select('*', { count: 'exact', head: true })
    .eq('gift_id', Number(giftId))

  if (error) {
    console.error('[Supabase] countClaims:', error.message)
    return 0
  }
  return count ?? 0
}

// ── Insert a single claim ─────────────────────────────────────────────────────
// Throws on DB error. Caller checks for duplicate (Postgres code 23505).
export async function insertClaim(giftId: string, claim: ClaimRecord): Promise<void> {
  if (!hasSupabase()) {
    memStore[giftId] = [...(memStore[giftId] ?? []), claim]
    return
  }

  const { error } = await getClient().from('gift_claims').insert({
    gift_id:    Number(giftId),
    claimed_by: claim.claimedBy,
    phone:      claim.phone,
    claimed_at: claim.claimedAt,
  })

  if (error) throw error
}

// ── Delete one or all claims for a gift ──────────────────────────────────────
// Returns number of rows deleted.
export async function deleteClaim(giftId: string, claimedBy?: string): Promise<number> {
  if (!hasSupabase()) {
    const before = (memStore[giftId] ?? []).length
    memStore[giftId] = claimedBy
      ? (memStore[giftId] ?? []).filter(c => c.claimedBy !== claimedBy)
      : []
    return before - (memStore[giftId]?.length ?? 0)
  }

  let query = getClient().from('gift_claims').delete({ count: 'exact' }).eq('gift_id', Number(giftId))
  if (claimedBy) query = query.eq('claimed_by', claimedBy)

  const { error, count } = await query
  if (error) {
    console.error('[Supabase] deleteClaim:', error.message)
    throw error
  }
  return count ?? 0
}
