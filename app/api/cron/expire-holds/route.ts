// Vercel Cron endpoint — cancels pending/unpaid holds older than 6 minutes.
// Acts as a server-side safety net for users who close the browser mid-checkout
// without the client-side cancelHoldAndGoBack() running.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { broadcastSlotUpdates } from '@/lib/supabase/broadcast'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify caller is Vercel Cron (or an authorized test call)
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const supabase = createClient(url, key)

  // 6 minutes gives the client-side 5-min timer a 1-min buffer to cancel first
  const cutoff = new Date(Date.now() - 6 * 60 * 1000).toISOString()

  const { data: expired, error: fetchErr } = await supabase
    .from('bookings')
    .select('id, court_id, booking_date, start_time')
    .eq('status', 'pending')
    .eq('payment_status', 'unpaid')
    .lt('created_at', cutoff)

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ cancelled: 0 })
  }

  const ids = expired.map((b: any) => b.id)

  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .in('id', ids)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  await broadcastSlotUpdates(expired.map((b: any) => ({
    courtId:     b.court_id,
    bookingDate: b.booking_date,
    startTime:   String(b.start_time).slice(0, 5),
    status:      'cancelled',
  })))

  console.log(`[expire-holds] Cancelled ${ids.length} expired hold(s):`, ids)

  return NextResponse.json({ cancelled: ids.length })
}
