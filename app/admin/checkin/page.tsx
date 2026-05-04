export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminContext } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import CheckInBoard from './CheckInBoard'
import DateNav from './DateNav'

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const { date: qDate } = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = qDate ?? today

  const supabase = await createClient()

  // Get court IDs scoped to this admin
  let courtsQuery = supabase.from('courts').select('id')
  if (!ctx.isSysAdmin) courtsQuery = courtsQuery.in('venue_id', ctx.venueIds)
  const { data: courtsData } = await courtsQuery
  const courtIds = (courtsData ?? []).map((c: { id: string }) => c.id)

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, booking_date, start_time, end_time, total_price, status, payment_method, notes, checked_in_at, court:courts(name, venue:venues(name)), profile:profiles(full_name, phone)')
    .eq('booking_date', date)
    .in('court_id', courtIds.length > 0 ? courtIds : ['00000000-0000-0000-0000-000000000000'])
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-in</h1>
          <p className="text-sm text-gray-500 mt-0.5">{displayDate}</p>
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/checkin?date=${shiftDate(date, -1)}`}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 text-sm"
          >
            ‹
          </Link>
          <DateNav date={date} />
          <Link
            href={`/admin/checkin?date=${shiftDate(date, 1)}`}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 text-sm"
          >
            ›
          </Link>
          {date !== today && (
            <Link
              href="/admin/checkin"
              className="px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700"
            >
              Today
            </Link>
          )}
        </div>
      </div>

      <CheckInBoard bookings={(bookings ?? []) as any} date={date} />
    </div>
  )
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
