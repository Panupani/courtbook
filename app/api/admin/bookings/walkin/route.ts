import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { courtId, date, slots, customerName, customerPhone, notes } =
    await req.json() as {
      courtId: string
      date: string
      slots: { start: string; end: string; price: number }[]
      customerName?: string
      customerPhone?: string
      notes?: string
    }

  if (!courtId || !date || !slots?.length) {
    return NextResponse.json({ error: 'courtId, date and slots required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch court + venue (need venue for fee rate + scope check)
  const { data: court } = await supabase
    .from('courts')
    .select('venue_id, venue:venues(platform_fee_rate)')
    .eq('id', courtId)
    .single()

  if (!court) return NextResponse.json({ error: 'Court not found' }, { status: 404 })

  if (!ctx.isSysAdmin && !ctx.venueIds.includes(court.venue_id)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const feeRate: number = (court.venue as any)?.platform_fee_rate ?? 0.10

  // Check no slot is already booked (race-condition guard)
  const { data: existing } = await supabase
    .from('bookings')
    .select('start_time')
    .eq('court_id', courtId)
    .eq('booking_date', date)
    .neq('status', 'cancelled')
    .in('start_time', slots.map(s => s.start))

  if (existing && existing.length > 0) {
    const taken = existing.map((b: { start_time: string }) => b.start_time).join(', ')
    return NextResponse.json({ error: `Slot(s) already booked: ${taken}` }, { status: 409 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Build note string with customer info
  const parts = [
    '[Walk-in]',
    customerName  ? `Name: ${customerName}`   : null,
    customerPhone ? `Tel: ${customerPhone}`    : null,
    notes         ? `Note: ${notes}`           : null,
  ].filter(Boolean)
  const finalNotes = parts.join(' | ')

  const rows = slots.map(slot => ({
    user_id:             user!.id,
    court_id:            courtId,
    booking_date:        date,
    start_time:          slot.start,
    end_time:            slot.end,
    total_price:         slot.price,
    platform_fee_amount: Math.round(slot.price * feeRate * 100) / 100,
    status:              'confirmed',
    payment_method:      'cash',
    payment_status:      'paid',
    notes:               finalNotes,
  }))

  const { data, error } = await supabase.from('bookings').insert(rows).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, ids: (data ?? []).map((b: { id: string }) => b.id) })
}
