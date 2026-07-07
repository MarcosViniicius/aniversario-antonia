import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { gifts as staticGifts, type Gift, type GiftCategory } from '@/lib/gifts-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return NextResponse.json(staticGifts)
  }

  try {
    const db = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await db
      .from('gifts')
      .select('id, name, brand, category, gift_limit, active, sort_order')
      .eq('active', true)
      .order('sort_order')

    if (error || !data?.length) {
      return NextResponse.json(staticGifts)
    }

    const mapped: Gift[] = data.map(row => ({
      id:       row.id,
      name:     row.name,
      brand:    row.brand || undefined,
      category: row.category as GiftCategory,
      limit:    row.gift_limit,
    }))

    return NextResponse.json(mapped, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(staticGifts)
  }
}
