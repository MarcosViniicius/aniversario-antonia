import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/owner-auth'
import { createClient } from '@supabase/supabase-js'
import { gifts } from '@/lib/gifts-data'

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

export async function POST(request: NextRequest) {
  if (!auth()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { giftId?: unknown; claimedBy?: unknown }
  const giftId    = Number(body.giftId)
  const claimedBy = String(body.claimedBy ?? '').trim()

  if (!giftId || !claimedBy) {
    return NextResponse.json({ error: 'giftId e claimedBy são obrigatórios' }, { status: 400 })
  }

  // Fetch claim (phone) from Supabase
  const { data: claimRow } = await db()
    .from('gift_claims')
    .select('phone')
    .eq('gift_id', giftId)
    .eq('claimed_by', claimedBy)
    .single()

  if (!claimRow?.phone) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  }

  const phone    = claimRow.phone as string
  const gift     = gifts.find(g => g.id === giftId)
  const giftName = gift?.name ?? `Presente #${giftId}`
  const isPix    = gift?.category === 'pix'

  // Build message (same logic as /api/gifts)
  let template = `🎉 *Confirmado, {name}!*\n\nSua escolha de *"{gift}"* foi registrada com sucesso para o aniversário de *80 anos de Antônia Lucena*. 🎂\n\n📅 *Data:* {date}\n⏰ *Horário:* {time}\n📍 *Local:* {place}\n🗺️ https://maps.app.goo.gl/1SQhCcoGbJZSMuaM6\n\nTe esperamos com muito carinho! 💛`

  try {
    const { data: settingsData } = await db()
      .from('app_settings')
      .select('key, value')
      .in('key', ['whatsapp_template', 'event_date', 'event_time', 'event_place', 'pix_key', 'pix_owner_name', 'pix_receipt_phone'])

    const s: Record<string, string> = {}
    for (const row of settingsData ?? []) s[row.key] = row.value ?? ''

    if (s.whatsapp_template) template = s.whatsapp_template

    template = template
      .replace(/{name}/g,        claimedBy)
      .replace(/{gift}/g,        giftName)
      .replace(/{date}/g,        s.event_date          ?? '')
      .replace(/{time}/g,        s.event_time          ?? '')
      .replace(/{place}/g,       s.event_place         ?? '')
      .replace(/{pix_key}/g,     s.pix_key             ?? '')
      .replace(/{pix_owner}/g,   s.pix_owner_name      ?? '')
      .replace(/{pix_receipt}/g, s.pix_receipt_phone   ?? '')

    const hasPixVars = template.includes(s.pix_key ?? '__none__')
    if (isPix && s.pix_key && !hasPixVars) {
      template += `\n\nChave Pix: ${s.pix_key}`
      if (s.pix_owner_name)    template += ` (${s.pix_owner_name})`
      if (s.pix_receipt_phone) template += `\nEnvie o comprovante para: ${s.pix_receipt_phone}`
    }
  } catch (err) {
    console.error('[resend] erro ao buscar settings:', err)
  }

  // Fallback replacements
  template = template
    .replace(/{name}/g, claimedBy)
    .replace(/{gift}/g, giftName)

  // Send via WhatsApp microservice
  const baseUrl  = (process.env.WHATSAPP_SERVICE_URL ?? '').replace(/\/+$/, '')
  const apiKey   = process.env.WHATSAPP_SERVICE_KEY ?? ''
  let status = 'sent'
  let error: string | null = null

  if (!baseUrl) {
    return NextResponse.json({ error: 'WHATSAPP_SERVICE_URL não configurada' }, { status: 503 })
  }

  try {
    const res = await fetch(baseUrl + '/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body:    JSON.stringify({ phone, message: template }),
      signal:  AbortSignal.timeout(12_000),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({})) as { error?: string }
      status = 'failed'; error = d.error ?? `HTTP ${res.status}`
    }
  } catch (err: unknown) {
    status = 'failed'
    error  = err instanceof Error ? err.message : String(err)
  }

  // Log to Supabase
  await db().from('whatsapp_logs').insert({
    gift_id: giftId, claimed_by: claimedBy, phone, message: template, status, error,
  }).catch(e => console.error('[resend] log error:', e))

  if (status === 'failed') {
    return NextResponse.json({ error: error ?? 'Falha no envio' }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}
