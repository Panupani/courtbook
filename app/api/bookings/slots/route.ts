// Public endpoint: returns slot-occupancy data for a set of courts.
// Also lazily cancels any pending/unpaid holds older than 6 minutes for these
// courts — this acts as the server-side safety net replacing a cron job, and
// fires naturally via VenueBookingGrid's 20-second polling.
// Uses the service-role key so RLS doesn't hide other users' bookings.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { broadcastSlotUpdates } from '@/lib/supabase/broadcast'

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

  // ── Lazy expiry: cancel unpaid holds older than 6 minutes ──────────────────
  // Runs on every slot fetch (including the 20s polling in VenueBookingGrid),
  // acting as a cron-free safety net for abandoned checkouts.
  const cutoff = new Date(Date.now() - 6 * 60 * 1000).toISOString()

  const { data: expired } = await supabase
    .from('bookings')
    .select('id, court_id, booking_date, start_time')
    .in('court_id', courtIds)
    .eq('status', 'pending')
    .eq('payment_status', 'unpaid')
    .lt('created_at', cutoff)

  if (expired && expired.length > 0) {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('id', expired.map((b: any) => b.id))

    // Fire-and-forget broadcast — frees these slots for all other clients
    broadcastSlotUpdates(expired.map((b: any) => ({
      courtId:     b.court_id,
      bookingDate: b.booking_date,
      startTime:   String(b.start_time).slice(0, 5),
      status:      'cancelled',
    }))).catch(() => {})

    console.log(`[slots] Lazily expired ${expired.length} stale hold(s)`)
  }
  // ──────────────────────────────────────────────────────────────────────────

  const { data, error } = await supabase
    .from('bookings')
    .select('court_id, booking_date, start_time, status')
    .in('court_id', courtIds)
    .neq('status', 'cancelled')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bookings: data ?? [] })
}
