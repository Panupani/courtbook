'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function BookingFilters({
  initialStatus,
  initialDate,
  initialPaymentStatus,
}: {
  initialStatus?: string
  initialDate?: string
  initialPaymentStatus?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilters = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    router.push(`/admin/bookings?${params.toString()}`)
  }

  const hasFilters = !!(initialStatus || initialDate || initialPaymentStatus)

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Booking status */}
      <select
        value={initialStatus ?? 'all'}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        onChange={e => updateFilters('status', e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="confirmed">Confirmed</option>
        <option value="pending">Pending</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {/* Payment status */}
      <select
        value={initialPaymentStatus ?? 'all'}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        onChange={e => updateFilters('payment_status', e.target.value)}
      >
        <option value="all">All payments</option>
        <option value="unpaid">Unpaid</option>
        <option value="pending">Pending payment</option>
        <option value="paid">Paid</option>
      </select>

      {/* Date picker */}
      <input
        type="date"
        value={initialDate ?? ''}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        onChange={e => updateFilters('date', e.target.value)}
      />

      {hasFilters && (
        <a
          href="/admin/bookings"
          className="border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-1"
        >
          ✕ Clear filters
        </a>
      )}
    </div>
  )
}
