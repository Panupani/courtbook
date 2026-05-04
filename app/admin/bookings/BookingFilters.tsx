'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function BookingFilters({ 
  initialStatus, 
  initialDate 
}: { 
  initialStatus?: string, 
  initialDate?: string 
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

  return (
    <form className="flex flex-wrap gap-3 mb-6">
      <select 
        name="status" 
        defaultValue={initialStatus ?? 'all'}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        onChange={e => updateFilters('status', e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="confirmed">Confirmed</option>
        <option value="pending">Pending</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <input 
        type="date" 
        name="date" 
        defaultValue={initialDate ?? ''}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        onChange={e => updateFilters('date', e.target.value)} 
      />
      {(initialStatus || initialDate) && (
        <a 
          href="/admin/bookings" 
          className="border border-gray-300 text-gray-600 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
        >
          Clear filters
        </a>
      )}
    </form>
  )
}
