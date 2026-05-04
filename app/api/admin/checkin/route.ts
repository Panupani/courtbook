import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'

export async function PATCH(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { bookingId, undo } = await req.json() as { bookingId: string; undo?: boolean }
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  const supabase = await createClient()

  // Venue admin scope check
  if (!ctx.isSysAdmin) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('court:courts(venue_id)')
      .eq('id', bookingId)
      .single()
    const venueId = (booking?.court as any)?.venue_id
    if (!venueId || !ctx.venueIds.includes(venueId)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ checked_in_at: undo ? null : new Date().toISOString() })
    .eq('id', bookingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
