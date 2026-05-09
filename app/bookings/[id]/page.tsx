export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'

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

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, court:courts(*, venue:venues(*))')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!booking) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Banner */}
      {booking.status === 'confirmed' && booking.payment_status === 'paid' && (
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Confirmed!</h1>
          <p className="mt-2 text-gray-500">Your payment was verified. See you on the court!</p>
        </div>
      )}
      {booking.status !== 'cancelled' && booking.payment_status === 'pending' && (
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🕐</div>
          <h1 className="text-3xl font-bold text-gray-900">Slip Under Review</h1>
          <p className="mt-2 text-gray-500 max-w-sm mx-auto">
            Your slot is reserved. Staff will verify your payment slip and confirm the booking shortly.
          </p>
        </div>
      )}
      {booking.status === 'cancelled' && (
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Cancelled</h1>
          <p className="mt-2 text-gray-500 max-w-sm mx-auto">
            This booking has been cancelled. Book another court below.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-xs font-medium uppercase tracking-wider">Booking Reference</p>
              <p className="text-xl font-mono font-bold mt-1">{booking.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${statusColors[booking.status] ?? ''}`}>
              {booking.status}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Venue</p>
              <p className="font-semibold text-gray-900 mt-1">{booking.court?.venue?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Court</p>
              <p className="font-semibold text-gray-900 mt-1">{booking.court?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Date</p>
              <p className="font-semibold text-gray-900 mt-1">{formatDate(booking.booking_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Time</p>
              <p className="font-semibold text-gray-900 mt-1">{booking.start_time.slice(0, 5)} – {booking.end_time.slice(0, 5)}</p>
            </div>
          </div>

          {booking.notes && (
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Notes</p>
              <p className="text-gray-700 mt-1">{booking.notes}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
            <p className="text-gray-500 text-sm">Total Amount</p>
            <p className="text-2xl font-bold text-green-700">{formatPrice(booking.total_price)}</p>
          </div>

          {/* Payment info */}
          {booking.payment_method && (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Payment</p>
                <p className="text-sm font-semibold text-gray-800">📱 PromptPay</p>
                {booking.payment_slip_url && (
                  <a href={booking.payment_slip_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline mt-1 inline-block">
                    View slip →
                  </a>
                )}
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize ${paymentStatusColors[booking.payment_status] ?? ''}`}>
                {booking.payment_status}
              </span>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Booked on {new Date(booking.created_at).toLocaleString('en-GB')}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {booking.group_id ? (
          <Link
            href={`/bookings/group/${booking.group_id}`}
            className="flex-1 text-center bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors"
          >
            View Full Booking Group
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="flex-1 text-center bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors"
          >
            View My Bookings
          </Link>
        )}
        <Link
          href="/venues"
          className="flex-1 text-center border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Book Another Court
        </Link>
      </div>
    </div>
  )
}
