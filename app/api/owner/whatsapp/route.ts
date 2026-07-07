import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/owner-auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function auth() {
  const session = cookies().get('owner_session')
  return verifyToken(session?.value)
}

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, global: { fetch: (i, o) => fetch(i, { ...o, cache: 'no-store' }) } },
  )
}

// GET /api/owner/whatsapp — status + QR from the microservice
export async function GET(request: NextRequest) {
  if (!auth()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') // 'status' | 'qr' | 'logs'

  if (action === 'logs') {
    const { data, error } = await supabase()
      .from('whatsapp_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Proxy status or qr to the microservice
  const baseUrl = (process.env.WHATSAPP_SERVICE_URL ?? '').replace(/\/+$/, '')
  if (!baseUrl) {
    return NextResponse.json({
      error: 'WHATSAPP_SERVICE_URL não configurada na Vercel. Adicione a variável e faça Redeploy.',
    }, { status: 503 })
  }

  const endpoint = action === 'qr' ? '/qr' : '/status'
  try {
    const res = await fetch(baseUrl + endpoint, {
      headers: { 'x-api-key': process.env.WHATSAPP_SERVICE_KEY ?? '' },
      signal: AbortSignal.timeout(8_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      error: `Microserviço inacessível (${baseUrl}): ${msg}`,
    }, { status: 503 })
  }
}

// POST /api/owner/whatsapp — send a message OR logout
export async function POST(request: NextRequest) {
  if (!auth()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as Record<string, string>

  const baseUrl = (process.env.WHATSAPP_SERVICE_URL ?? '').replace(/\/+$/, '')
  if (!baseUrl) return NextResponse.json({ error: 'WHATSAPP_SERVICE_URL not configured' }, { status: 503 })

  if (body.action === 'logout') {
    const res  = await fetch(baseUrl + '/logout', {
      method: 'POST',
      headers: { 'x-api-key': process.env.WHATSAPP_SERVICE_KEY ?? '' },
    })
    return NextResponse.json(await res.json(), { status: res.status })
  }

  // Send message
  const { phone, message, giftId, claimedBy } = body
  if (!phone || !message) return NextResponse.json({ error: 'phone e message são obrigatórios' }, { status: 400 })

  let status = 'sent'
  let error: string | null = null

  try {
    const res = await fetch(baseUrl + '/send', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.WHATSAPP_SERVICE_KEY ?? '' },
      body:    JSON.stringify({ phone, message }),
      signal:  AbortSignal.timeout(10_000),
    })
    const data = await res.json()
    if (!res.ok) { status = 'failed'; error = data.error ?? 'Unknown error' }
  } catch (err: unknown) {
    status = 'failed'
    error  = err instanceof Error ? err.message : String(err)
  }

  // Log to Supabase
  await supabase().from('whatsapp_logs').insert({
    gift_id:    giftId   ? Number(giftId) : null,
    claimed_by: claimedBy ?? '',
    phone,
    message,
    status,
    error,
  })

  if (status === 'failed') {
    return NextResponse.json({ error }, { status: 502 })
  }
  return NextResponse.json({ success: true })
}
