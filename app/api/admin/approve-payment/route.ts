import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { bookingId, action } = await req.json() as { bookingId: string; action: 'approve' | 'reject' }

  if (!bookingId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Venue admins can only act on bookings in their assigned courts
  if (!ctx.isSysAdmin) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('court:courts(venue_id)')
      .eq('id', bookingId)
      .single()
    const venueId = (booking?.court as any)?.venue_id
    if (!venueId || !ctx.venueIds.includes(venueId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const update = action === 'approve'
    ? { status: 'confirmed', payment_status: 'paid' }
    : { status: 'cancelled', payment_status: 'unpaid' }

  const { error } = await supabase.from('bookings').update(update).eq('id', bookingId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
