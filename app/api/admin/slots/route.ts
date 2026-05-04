import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import { generateSlots } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const courtId = searchParams.get('courtId')
  const date = searchParams.get('date')

  if (!courtId || !date) {
    return NextResponse.json({ error: 'courtId and date required' }, { status: 400 })
  }

  const supabase = await createClient()

  // Venue admin scope check
  if (!ctx.isSysAdmin) {
    const { data: court } = await supabase.from('courts').select('venue_id').eq('id', courtId).single()
    if (!court || !ctx.venueIds.includes(court.venue_id)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
  }

  const dayOfWeek = new Date(date + 'T00:00:00').getDay()

  const [courtRes, hoursRes, bookingsRes] = await Promise.all([
    supabase.from('courts').select('id, name, hourly_rate').eq('id', courtId).single(),
    supabase.from('operating_hours').select('*').eq('court_id', courtId).eq('day_of_week', dayOfWeek).single(),
    supabase.from('bookings').select('start_time').eq('court_id', courtId).eq('booking_date', date).neq('status', 'cancelled'),
  ])

  if (!courtRes.data) return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  if (!hoursRes.data) return NextResponse.json({ slots: [], message: 'Closed on this day' })

  const bookedStarts = new Set((bookingsRes.data ?? []).map((b: { start_time: string }) => b.start_time))
  const slots = generateSlots(hoursRes.data, courtRes.data.hourly_rate).map(s => ({
    ...s,
    available: !bookedStarts.has(s.start),
  }))

  return NextResponse.json({ slots })
}
