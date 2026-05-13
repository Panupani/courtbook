import type { SupabaseClient } from '@supabase/supabase-js'
import { broadcastSlotUpdates } from './broadcast'

const HOLD_TTL_MS = 6 * 60 * 1000  // 1-min buffer over the 5-min client-side timer

/**
 * Cancel pending/unpaid holds older than 6 minutes and broadcast freed slots.
 * Pass courtIds to scope to specific courts (slots endpoint); omit for a global sweep (cron).
 * Returns the number of holds cancelled.
 */
export async function expireStaleHolds(
  supabase: SupabaseClient,
  courtIds?: string[]
): Promise<number> {
  const cutoff = new Date(Date.now() - HOLD_TTL_MS).toISOString()

  let query = supabase
    .from('bookings')
    .select('id, court_id, booking_date, start_time')
    .eq('status', 'pending')
    .eq('payment_status', 'unpaid')
    .lt('created_at', cutoff)

  if (courtIds && courtIds.length > 0) {
    query = query.in('court_id', courtIds)
  }

  const { data: expired } = await query
  if (!expired || expired.length === 0) return 0

  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .in('id', expired.map((b: any) => b.id))

  broadcastSlotUpdates(expired.map((b: any) => ({
    courtId:     b.court_id,
    bookingDate: b.booking_date,
    startTime:   String(b.start_time).slice(0, 5),
    status:      'cancelled',
  }))).catch(() => {})

  return expired.length
}
