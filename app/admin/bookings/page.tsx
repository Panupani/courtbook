export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import { formatDate, formatPrice } from '@/lib/utils'
import BookingStatusButton from './BookingStatusButton'
import BookingFilters from './BookingFilters'
import SlipViewer from './SlipViewer'

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string; payment_status?: string }>
}) {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const { status, date, payment_status } = await searchParams
  const supabase = await createClient()

  // For venue admin, get their court IDs
  let courtIds: string[] | null = null
  if (!ctx.isSysAdmin) {
    const { data } = await supabase.from('courts').select('id').in('venue_id', ctx.venueIds)
    courtIds = (data ?? []).map((c: { id: string }) => c.id)
  }

  let query = supabase
    .from('bookings')
    .select('*, court:courts(name, venue:venues(name)), profile:profiles(full_name, phone)')
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })

  if (courtIds)                              query = query.in('court_id', courtIds)
  if (status && status !== 'all')            query = query.eq('status', status)
  if (payment_status && payment_status !== 'all') query = query.eq('payment_status', payment_status)
  if (date)                                  query = query.eq('booking_date', date)

  const { data: bookings } = await query.limit(100)

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending:   'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          {!ctx.isSysAdmin && (
            <p className="text-sm text-gray-500 mt-1">Showing bookings for your assigned venue{ctx.venueIds.length > 1 ? 's' : ''} only.</p>
          )}
        </div>
        <Link
          href="/admin/bookings/walkin"
          className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          🚶 Walk-in Booking
        </Link>
      </div>

      <BookingFilters initialStatus={status} initialDate={date} initialPaymentStatus={payment_status} />

      <div className="bg-white rounded-2xl border border-gray-200 overflow-auto">
        {!bookings || bookings.length === 0 ? (
          <p className="p-10 text-center text-gray-400">No bookings found.</p>
        ) : (
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Ref</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Court / Venue</th>
                <th className="px-5 py-3 text-left">Date & Time</th>
                <th className="px-5 py-3 text-left">Total</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Slip</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(bookings as any[]).map(b => (
                <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{b.profile?.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{b.profile?.phone ?? ''}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">{b.court?.name}</p>
                    <p className="text-xs text-gray-400">{b.court?.venue?.name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-gray-900">{formatDate(b.booking_date)}</p>
                    <p className="text-xs text-gray-400">{b.start_time} – {b.end_time}</p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900">{formatPrice(b.total_price)}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[b.status]}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {b.payment_slip_url
                      ? <SlipViewer url={b.payment_slip_url} />
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-right">
                    {b.status !== 'cancelled' && (
                      <BookingStatusButton
                        id={b.id}
                        courtId={b.court_id}
                        bookingDate={b.booking_date}
                        startTime={b.start_time.slice(0, 5)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
