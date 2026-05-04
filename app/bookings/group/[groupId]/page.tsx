export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'

export default async function GroupBookingPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, court:courts(*, venue:venues(*))')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .order('booking_date')
    .order('start_time')

  if (!bookings || bookings.length === 0) notFound()

  const totalPrice = bookings.reduce((sum: number, b: any) => sum + b.total_price, 0)
  const allConfirmed = bookings.every((b: any) => b.status === 'confirmed')

  // Group by court for display
  const byCourt = bookings.reduce((acc: Record<string, any[]>, b: any) => {
    const key = `${b.court_id}__${b.booking_date}`
    acc[key] = acc[key] ?? []
    acc[key].push(b)
    return acc
  }, {})

  // Get venue info for "add another court" link
  const venueId = bookings[0]?.court?.venue_id ?? (bookings[0]?.court as any)?.venue?.id

  const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending:   'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const paymentStatusColors: Record<string, string> = {
    paid:    'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    unpaid:  'bg-gray-100 text-gray-600',
  }

  const firstPaymentStatus = bookings[0]?.payment_status
  const firstSlipUrl = bookings[0]?.payment_slip_url

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Banner */}
      {firstPaymentStatus === 'pending' ? (
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🕐</div>
          <h1 className="text-3xl font-bold text-gray-900">Slip Under Review</h1>
          <p className="mt-2 text-gray-500 max-w-sm mx-auto">
            Your slots are reserved. Staff will verify your payment slip and confirm shortly.
          </p>
        </div>
      ) : allConfirmed ? (
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900">
            {bookings.length > 1 ? 'All Slots Confirmed!' : 'Booking Confirmed!'}
          </h1>
          <p className="mt-2 text-gray-500">
            {bookings.length} slot{bookings.length > 1 ? 's' : ''} reserved across{' '}
            {Object.keys(byCourt).length} court{Object.keys(byCourt).length > 1 ? 's' : ''}.
          </p>
        </div>
      ) : null}

      {/* Group reference */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-green-200 text-xs font-medium uppercase tracking-wider">Group Booking</p>
            <p className="text-lg font-mono font-bold mt-0.5">{groupId.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-xs">{bookings.length} slot{bookings.length > 1 ? 's' : ''}</p>
            <p className="text-xl font-bold">{formatPrice(totalPrice)}</p>
          </div>
        </div>

        {/* Bookings grouped by court + date */}
        <div className="divide-y divide-gray-100">
          {Object.values(byCourt).map((group: any[]) => {
            const first = group[0]
            const courtTotal = group.reduce((s: number, b: any) => s + b.total_price, 0)
            return (
              <div key={`${first.court_id}_${first.booking_date}`} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{first.court?.name}</p>
                    <p className="text-xs text-gray-500">{first.court?.venue?.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{formatDate(first.booking_date)}</p>
                  </div>
                  <span className="text-sm font-bold text-gray-700">{formatPrice(courtTotal)}</span>
                </div>

                <div className="space-y-1.5">
                  {group.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[b.status]}`}>
                          {b.status}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-800">{formatPrice(b.total_price)}</span>
                    </div>
                  ))}
                </div>

                {first.notes && (
                  <p className="text-xs text-gray-400 mt-2">Notes: {first.notes}</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Total + payment */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
          <div className="flex items-center justify-between font-bold">
            <span className="text-gray-700">Grand Total</span>
            <span className="text-green-700 text-lg">{formatPrice(totalPrice)}</span>
          </div>
          {firstPaymentStatus && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <span>📱 PromptPay</span>
                {firstSlipUrl && (
                  <a href={firstSlipUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline">
                    View slip →
                  </a>
                )}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${paymentStatusColors[firstPaymentStatus] ?? ''}`}>
                {firstPaymentStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/dashboard"
          className="flex-1 text-center bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors"
        >
          View My Bookings
        </Link>
        {venueId && (
          <Link
            href={`/venues/${venueId}/book?groupId=${groupId}`}
            className="flex-1 text-center border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            + Add More Slots
          </Link>
        )}
      </div>
    </div>
  )
}
