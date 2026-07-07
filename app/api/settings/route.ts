import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PUBLIC_KEYS = ['pix_key', 'pix_receipt_phone', 'pix_owner_name']

export async function GET() {
  const result: Record<string, string> = {}

  // Env-var fallback
  if (process.env.NEXT_PUBLIC_PIX_KEY) result.pix_key = process.env.NEXT_PUBLIC_PIX_KEY
  if (process.env.PIX_RECEIPT_PHONE)   result.pix_receipt_phone = process.env.PIX_RECEIPT_PHONE

  // Supabase overrides env vars
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } },
      )
      const { data } = await db
        .from('app_settings')
        .select('key, value')
        .in('key', PUBLIC_KEYS)

      for (const row of data ?? []) {
        if (row.value) result[row.key] = row.value
      }
    } catch (err) {
      console.error('[/api/settings] Supabase error:', err)
    }
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
