import { NextResponse } from 'next/server'
import { getGifts } from '@/lib/gifts-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const gifts = await getGifts()
  return NextResponse.json(gifts, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
