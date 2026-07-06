import { NextRequest, NextResponse } from 'next/server'
import { gifts } from '@/lib/gifts-data'
import { readClaims, countClaims, insertClaim, deleteClaim } from '@/lib/claims'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const claims = await readClaims()
  return NextResponse.json(claims, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export async function POST(request: NextRequest) {
  let body: { giftId?: unknown; claimedBy?: unknown; phone?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const giftId    = String(body.giftId    ?? '').trim()
  const claimedBy = String(body.claimedBy ?? '').trim()
  const phone     = String(body.phone     ?? '').trim()

  if (!giftId || !claimedBy || !phone) {
    return NextResponse.json({ error: 'giftId, claimedBy e phone são obrigatórios' }, { status: 400 })
  }

  const gift = gifts.find(g => g.id === Number(giftId))
  if (!gift) {
    return NextResponse.json({ error: 'Presente não encontrado' }, { status: 404 })
  }

  if (gift.limit !== null) {
    const current = await countClaims(giftId)
    if (current >= gift.limit) {
      return NextResponse.json({ error: 'Presente já escolhido' }, { status: 409 })
    }
  }

  try {
    await insertClaim(giftId, { claimedBy, phone, claimedAt: new Date().toISOString() })
  } catch (err: unknown) {
    const pgErr = err as { code?: string }
    if (pgErr?.code === '23505') {
      return NextResponse.json({ error: 'Você já escolheu este presente' }, { status: 409 })
    }
    console.error('[POST /api/gifts]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  // Send WhatsApp confirmation (fire-and-forget — never blocks the response)
  sendWhatsApp({ giftId, giftName: gift.name, claimedBy, phone }).catch(
    err => console.error('[WA] send failed:', err)
  )

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  let body: { giftId?: unknown; claimedBy?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const giftId    = String(body.giftId    ?? '').trim()
  const claimedBy = String(body.claimedBy ?? '').trim()

  if (!giftId) {
    return NextResponse.json({ error: 'giftId é obrigatório' }, { status: 400 })
  }

  try {
    await deleteClaim(giftId, claimedBy || undefined)
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ── WhatsApp helper ───────────────────────────────────────────────────────────
async function sendWhatsApp({
  giftId, giftName, claimedBy, phone,
}: { giftId: string; giftName: string; claimedBy: string; phone: string }) {
  const serviceUrl = process.env.WHATSAPP_SERVICE_URL
  const serviceKey = process.env.WHATSAPP_SERVICE_KEY ?? ''

  // Build message from template (DB setting, fallback to hardcoded)
  let template = 'Ola {name}! Sua escolha de "{gift}" para o aniversario de 80 anos de Antonia Lucena foi confirmada. Obrigada!'
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const db   = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
      const rows = await Promise.all([
        db.from('app_settings').select('value').eq('key', 'whatsapp_template').single(),
        db.from('app_settings').select('value').eq('key', 'event_date').single(),
        db.from('app_settings').select('value').eq('key', 'event_time').single(),
        db.from('app_settings').select('value').eq('key', 'event_place').single(),
      ])
      const [tmpl, date, time, place] = rows.map(r => r.data?.value ?? '')
      if (tmpl) template = tmpl
      template = template
        .replace('{name}',  claimedBy)
        .replace('{gift}',  giftName)
        .replace('{date}',  date)
        .replace('{time}',  time)
        .replace('{place}', place)
    }
  } catch {}

  // Fallback replacements if DB fetch failed
  template = template
    .replace('{name}',  claimedBy)
    .replace('{gift}',  giftName)

  let status = 'sent'
  let error: string | null = null

  if (serviceUrl) {
    try {
      const res = await fetch(serviceUrl + '/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': serviceKey },
        body:    JSON.stringify({ phone, message: template }),
        signal:  AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        status = 'failed'; error = d.error ?? `HTTP ${res.status}`
      }
    } catch (err: unknown) {
      status = 'failed'; error = err instanceof Error ? err.message : String(err)
    }
  } else {
    status = 'pending'; error = 'WHATSAPP_SERVICE_URL not configured'
  }

  // Log to Supabase (best-effort)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
      await db.from('whatsapp_logs').insert({ gift_id: Number(giftId), claimed_by: claimedBy, phone, message: template, status, error })
    } catch {}
  }
}
