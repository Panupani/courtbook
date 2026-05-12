export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import { formatDate, formatPrice } from '@/lib/utils'
import ApproveActions from './ApproveActions'

export default async function AdminPaymentsPage() {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const supabase = await createClient()

  let courtIds: string[] | null = null
  if (!ctx.isSysAdmin) {
    const { data } = await supabase.from('courts').select('id').in('venue_id', ctx.venueIds)
    courtIds = (data ?? []).map((c: { id: string }) => c.id)
  }

  let query = supabase
    .from('bookings')
    .select('*, court:courts(name, venue:venues(name)), profile:profiles(full_name, phone)')
    .eq('payment_method', 'promptpay')
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })

  if (courtIds) query = query.in('court_id', courtIds)

  const { data: bookings } = await query

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pending Payments</h1>
        <p className="text-gray-500 text-sm mt-1">
          PromptPay slips waiting for manual review.
        </p>
      </div>

      {!bookings || bookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold text-gray-700">No pending payments</p>
          <p className="text-sm text-gray-400 mt-1">All slips have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(bookings as any[]).map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 flex-shrink-0 bg-gray-50 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 min-h-36">
                  {b.payment_slip_url ? (
                    <a href={b.payment_slip_url} target="_blank" rel="noopener noreferrer">
                      <img src={b.payment_slip_url} alt="Payment slip" className="max-h-48 max-w-full object-contain p-2 hover:opacity-90 transition-opacity" />
                    </a>
                  ) : (
                    <p className="text-xs text-gray-400 p-4 text-center">No slip image stored</p>
                  )}
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Customer</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{b.profile?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{b.profile?.phone ?? ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Court</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{b.court?.name}</p>
                      <p className="text-xs text-gray-400">{b.court?.venue?.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Date & Time</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{formatDate(b.booking_date)}</p>
                      <p className="text-xs text-gray-400">{b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Amount</p>
                      <p className="font-bold text-green-700 text-lg mt-0.5">{formatPrice(b.total_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Booking Ref</p>
                      <p className="font-mono text-xs text-gray-500 mt-0.5">{b.id.slice(0,8).toUpperCase()}</p>
                    </div>
                    {b.transaction_id && (
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Transaction Ref</p>
                        <p className="font-mono text-xs text-gray-700 mt-0.5">{b.transaction_id}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Submitted</p>
                      <p className="text-xs text-gray-600 mt-0.5">{new Date(b.created_at).toLocaleString('en-GB')}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs bg-yellow-100 text-yellow-700 font-semibold px-2.5 py-1 rounded-full">Awaiting review</span>
                    <ApproveActions bookingId={b.id} hasSlip={!!b.payment_slip_url} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
