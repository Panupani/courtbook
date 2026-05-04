export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import type { OperatingHours } from '@/lib/types'

export default async function CourtPage({
  params,
}: {
  params: Promise<{ venueId: string; courtId: string }>
}) {
  const { venueId, courtId } = await params
  const supabase = await createClient()

  const [courtRes, hoursRes, venueRes] = await Promise.all([
    supabase.from('courts').select('*, venue:venues(*)').eq('id', courtId).eq('venue_id', venueId).single(),
    supabase.from('operating_hours').select('*').eq('court_id', courtId),
    supabase.from('venues').select('name').eq('id', venueId).single(),
  ])

  if (!courtRes.data) notFound()

  const court = courtRes.data
  const operatingHours = (hoursRes.data ?? []) as OperatingHours[]

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-500 flex items-center gap-1 flex-wrap">
        <Link href="/venues" className="hover:text-green-600">Venues</Link>
        <span>/</span>
        <Link href={`/venues/${venueId}`} className="hover:text-green-600">{venueRes.data?.name ?? 'Venue'}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{court.name}</span>
      </div>

      {/* Court image */}
      <div className="h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-8">
        {court.image_url
          ? <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" />
          : <span className="text-9xl">🏸</span>
        }
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{court.name}</h1>
          {court.description && <p className="mt-3 text-gray-600">{court.description}</p>}
        </div>
        <span className="flex-shrink-0 text-green-700 font-bold text-xl">{formatPrice(court.hourly_rate)}/hr</span>
      </div>

      {/* Book CTA */}
      <Link
        href={`/venues/${venueId}/book`}
        className="flex items-center justify-center gap-2 w-full bg-green-600 text-white font-semibold py-4 rounded-2xl hover:bg-green-700 transition-colors text-lg mb-10"
      >
        <span>📅</span> Book This Court
      </Link>

      {/* Operating hours */}
      {operatingHours.length > 0 && (
        <div className="bg-gray-50 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Operating Hours & Pricing</h3>
          <div className="space-y-2.5 text-sm">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, i) => {
              const h = operatingHours.find(o => o.day_of_week === i)
              return (
                <div key={i}>
                  <div className="flex justify-between text-gray-700">
                    <span className="font-medium w-10">{dayName}</span>
                    <span>
                      {h
                        ? `${h.open_time.slice(0, 5)} – ${h.close_time.slice(0, 5)}`
                        : <span className="text-gray-400">Closed</span>
                      }
                    </span>
                  </div>
                  {h?.peak_start_time && (
                    <div className="flex justify-between text-xs text-orange-600 mt-0.5 pl-10">
                      <span>Peak {h.peak_start_time.slice(0, 5)} – {h.peak_end_time?.slice(0, 5)}</span>
                      <span className="font-semibold">{formatPrice(h.peak_hourly_rate!)}/hr</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
            <span>Off-peak rate</span>
            <span className="font-semibold text-gray-700">{formatPrice(court.hourly_rate)}/hr</span>
          </div>
        </div>
      )}
    </div>
  )
}
