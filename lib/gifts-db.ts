import { createClient } from '@supabase/supabase-js'
import { gifts as staticGifts, type Gift, type GiftCategory } from './gifts-data'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Reads all active gifts from Supabase, ordered by sort_order.
 * Falls back to the static list if the DB is unavailable.
 */
export async function getGifts(): Promise<Gift[]> {
  try {
    const { data, error } = await getClient()
      .from('gifts')
      .select('id, name, brand, category, gift_limit, active, sort_order')
      .eq('active', true)
      .order('sort_order')

    if (error || !data?.length) return staticGifts

    return data.map(row => ({
      id:       row.id       as number,
      name:     row.name     as string,
      brand:    (row.brand   as string) || undefined,
      category: row.category as GiftCategory,
      limit:    row.gift_limit as number | null,
    }))
  } catch {
    return staticGifts
  }
}
