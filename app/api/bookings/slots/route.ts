// Public endpoint: returns slot-occupancy data for a set of courts.
// Lazily expires stale holds on each fetch — safety net for abandoned checkouts.
// Uses the service-role key so RLS doesn't hide other users' bookings.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { expireStaleHolds } from '@/lib/supabase/expireStaleHolds'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('courtIds') ?? ''
  const courtIds = raw.split(',').map(s => s.trim()).filter(Boolean)

  if (courtIds.length === 0) {
    return NextResponse.json({ bookings: [] })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const supabase = createClient(url, key)

  const expired = await expireStaleHolds(supabase, courtIds)
  if (expired > 0) console.log(`[slots] Lazily expired ${expired} stale hold(s)`)

  const { data, error } = await supabase
    .from('bookings')
    .select('court_id, booking_date, start_time, status')
    .in('court_id', courtIds)
    .neq('status', 'cancelled')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bookings: data ?? [] })
}
