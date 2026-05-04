export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminContext } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import WalkInForm from './WalkInForm'

export default async function WalkInBookingPage() {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const supabase = await createClient()

  let venuesQuery = supabase.from('venues').select('id, name').eq('is_active', true).order('name')
  if (!ctx.isSysAdmin) venuesQuery = venuesQuery.in('id', ctx.venueIds)
  const { data: venues } = await venuesQuery

  let courtsQuery = supabase.from('courts').select('id, name, hourly_rate, venue_id').eq('is_active', true).order('name')
  if (!ctx.isSysAdmin) courtsQuery = courtsQuery.in('venue_id', ctx.venueIds)
  const { data: courts } = await courtsQuery

  if (!venues || venues.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>No venues available.</p>
        <Link href="/admin/venues/new" className="mt-2 inline-block text-green-600 hover:underline">Add a venue →</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/bookings" className="text-gray-400 hover:text-gray-600 text-sm">← Bookings</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">Walk-in Booking</h1>
      </div>

      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        💡 Walk-in bookings are <strong>confirmed immediately</strong> with <strong>cash payment</strong>. Customer info is saved in the booking notes.
      </div>

      <WalkInForm
        venues={(venues ?? []) as { id: string; name: string }[]}
        courts={(courts ?? []) as { id: string; name: string; hourly_rate: number; venue_id: string }[]}
      />
    </div>
  )
}
