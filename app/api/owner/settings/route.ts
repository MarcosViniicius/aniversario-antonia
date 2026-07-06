import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/owner-auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function auth() {
  return verifyToken(cookies().get('owner_session')?.value)
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// GET — return all settings as { key: value }
export async function GET() {
  if (!auth()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await db().from('app_settings').select('key, value')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const map: Record<string, string> = {}
  for (const row of data ?? []) map[row.key] = row.value
  return NextResponse.json(map)
}

// PUT — update settings { key: value, ... }
export async function PUT(request: NextRequest) {
  if (!auth()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as Record<string, string>

  const rows = Object.entries(body).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }))

  if (rows.length === 0) return NextResponse.json({ ok: true })

  const { error } = await db()
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
