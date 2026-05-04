export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Court, OperatingHours, Booking, Venue } from '@/lib/types'
import VenueBookingGrid from '@/components/booking/VenueBookingGrid'

export default async function VenueBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ venueId: string }>
  searchParams: Promise<{ groupId?: string }>
}) {
  const { venueId } = await params
  const { groupId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [venueRes, courtsRes] = await Promise.all([
    supabase.from('venues').select('*').eq('id', venueId).eq('is_active', true).single(),
    supabase.from('courts').select('*').eq('venue_id', venueId).eq('is_active', true).order('name'),
  ])

  if (!venueRes.data) notFound()

  const venue = venueRes.data as Venue
  const courts = (courtsRes.data ?? []) as Court[]

  if (courts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">No courts available at this venue.</p>
        <Link href={`/venues/${venueId}`} className="mt-4 inline-block text-green-600 hover:underline">
          ← Back to venue
        </Link>
      </div>
    )
  }

  const courtIds = courts.map(c => c.id)

  const [hoursRes, bookingsRes] = await Promise.all([
    supabase.from('operating_hours').select('*').in('court_id', courtIds),
    supabase.from('bookings').select('*').in('court_id', courtIds).neq('status', 'cancelled'),
  ])

  const allHours = (hoursRes.data ?? []) as OperatingHours[]
  const allBookings = (bookingsRes.data ?? []) as Booking[]

  // Map hours and bookings by court id
  const hoursByCourt: Record<string, OperatingHours[]> = {}
  const bookingsByCourt: Record<string, Booking[]> = {}
  for (const c of courts) {
    hoursByCourt[c.id] = allHours.filter(h => h.court_id === c.id)
    bookingsByCourt[c.id] = allBookings.filter(b => b.court_id === c.id)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-5 text-sm text-gray-500 flex items-center gap-1 flex-wrap">
        <Link href="/venues" className="hover:text-green-600">Venues</Link>
        <span>/</span>
        <Link href={`/venues/${venueId}`} className="hover:text-green-600">{venue.name}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Book Courts</span>
      </div>

      {groupId && (
        <div className="mb-5 flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800 px-5 py-3 rounded-xl text-sm">
          <span>🔗 <strong>Adding to booking group</strong> — select slots then confirm</span>
          <Link href={`/bookings/group/${groupId}`} className="text-blue-600 hover:underline font-medium text-xs ml-4 whitespace-nowrap">
            View current group →
          </Link>
        </div>
      )}

      <VenueBookingGrid
        venue={venue}
        courts={courts}
        hoursByCourt={hoursByCourt}
        bookingsByCourt={bookingsByCourt}
        userId={user?.id ?? null}
        existingGroupId={groupId}
      />
    </div>
  )
}
