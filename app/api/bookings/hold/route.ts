// Creates pending "hold" bookings the moment the customer clicks
// "Proceed to Payment" — slots are blocked immediately for everyone.
// DELETE cancels the hold if the customer goes back to slot selection.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { broadcastSlotUpdates } from '@/lib/supabase/broadcast'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookings: items, groupId } = await req.json() as {
    bookings: {
      court_id: string
      booking_date: string
      start_time: string
      end_time: string
      total_price: number
      notes?: string | null
    }[]
    groupId: string
  }

  if (!Array.isArray(items) || items.length === 0 || !groupId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Fetch fee rate from the court's venue
  let feeRate = 0.05
  const { data: courtData } = await supabase
    .from('courts')
    .select('venue:venues(platform_fee_rate)')
    .eq('id', items[0].court_id)
    .single()
  feeRate = (courtData?.venue as any)?.platform_fee_rate ?? 0.05

  const rows = items.map(b => ({
    user_id:             user.id,
    court_id:            b.court_id,
    booking_date:        b.booking_date,
    start_time:          b.start_time,
    end_time:            b.end_time,
    total_price:         b.total_price,
    platform_fee_amount: Math.round(b.total_price * feeRate * 100) / 100,
    status:              'pending',
    payment_method:      'promptpay',
    payment_status:      'unpaid',   // no slip yet — distinguishes hold from verified-pending
    notes:               b.notes ?? null,
    group_id:            groupId,
  }))

  const { data, error } = await supabase
    .from('bookings')
    .insert(rows)
    .select('id, court_id, booking_date, start_time')

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'One or more slots were just taken. Please go back and choose a different time.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Broadcast immediately so all clients see the slot as pending
  broadcastSlotUpdates((data ?? []).map((b: any) => ({
    courtId:     b.court_id,
    bookingDate: b.booking_date,
    startTime:   String(b.start_time).slice(0, 5),
    status:      'pending',
  })))

  return NextResponse.json({
    ids:     (data ?? []).map((b: any) => b.id as string),
    groupId,
  })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  // Fetch before cancelling so we can broadcast the freed slots.
  // Cancel both 'unpaid' holds AND slip-uploaded 'pending' holds —
  // as long as the booking hasn't already been confirmed (status !== 'confirmed').
  const { data: held } = await supabase
    .from('bookings')
    .select('id, court_id, booking_date, start_time')
    .in('id', ids)
    .eq('user_id', user.id)
    .in('payment_status', ['unpaid', 'pending'])
    .neq('status', 'confirmed')   // never clobber a confirmed booking

  if (held && held.length > 0) {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .in('id', held.map((b: any) => b.id))
      .eq('user_id', user.id)

    broadcastSlotUpdates(held.map((b: any) => ({
      courtId:     b.court_id,
      bookingDate: b.booking_date,
      startTime:   String(b.start_time).slice(0, 5),
      status:      'cancelled',
    })))
  }

  return NextResponse.json({ ok: true })
}
