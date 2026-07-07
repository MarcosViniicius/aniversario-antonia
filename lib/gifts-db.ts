import { createClient } from '@supabase/supabase-js'
import { gifts as staticGifts, type Gift, type GiftCategory } from './gifts-data'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      // Next.js 14 caches fetch calls by default; opt out so DB edits reflect immediately.
      fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}

/**
 * Reads all active gifts from Supabase, ordered by sort_order.
 * Falls back to the static list only if the DB is unavailable.
 */
export async function getGifts(): Promise<Gift[]> {
  try {
    const { data, error } = await getClient()
      .from('gifts')
      .select('id, name, brand, category, gift_limit, active, sort_order')
      .eq('active', true)
      .order('sort_order')

    if (error) {
      console.error('[gifts-db] Supabase error:', error.message, '— using static fallback')
      return staticGifts
    }

    if (!data?.length) {
      console.warn('[gifts-db] gifts table is empty — using static fallback')
      return staticGifts
    }

    console.log(`[gifts-db] loaded ${data.length} gifts from DB`)
    return data.map(row => ({
      id:       row.id       as number,
      name:     row.name     as string,
      brand:    (row.brand   as string) || undefined,
      category: row.category as GiftCategory,
      limit:    row.gift_limit as number | null,
    }))
  } catch (err) {
    console.error('[gifts-db] unexpected error:', err, '— using static fallback')
    return staticGifts
  }
}
