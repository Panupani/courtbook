export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Court, Venue } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

export default async function VenuePage({
  params,
}: {
  params: Promise<{ venueId: string }>
}) {
  const { venueId } = await params
  const supabase = await createClient()

  const { data: venue } = await supabase
    .from('venues')
    .select('*')
    .eq('id', venueId)
    .eq('is_active', true)
    .single()

  if (!venue) notFound()

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('venue_id', venueId)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Venue Header */}
      <div className="mb-8">
        <Link href="/venues" className="text-sm text-gray-500 hover:text-green-600 mb-4 inline-flex items-center gap-1">
          ← Back to venues
        </Link>
        <div className="mt-4 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-80 h-56 rounded-2xl overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex-shrink-0 flex items-center justify-center">
            {(venue as Venue).image_url
              ? <img src={(venue as Venue).image_url!} alt={venue.name} className="w-full h-full object-cover" />
              : <span className="text-7xl">🏸</span>
            }
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
              <p className="mt-2 text-gray-500 flex items-center gap-1"><span>📍</span>{venue.address}</p>
              {venue.description && <p className="mt-4 text-gray-600">{venue.description}</p>}
              <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-full">
                <span>🏸</span>{courts?.length ?? 0} court{courts?.length !== 1 ? 's' : ''} available
              </div>
            </div>
            {courts && courts.length > 0 && (
              <Link
                href={`/venues/${venueId}/book`}
                className="mt-6 inline-flex items-center justify-center gap-2 bg-green-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-700 transition-colors text-base w-full md:w-auto"
              >
                <span>📅</span> Book Courts
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Courts info */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Courts</h2>
        {!courts || courts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No courts available at this venue.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(courts as Court[]).map(court => (
              <Link
                key={court.id}
                href={`/venues/${venueId}/courts/${court.id}`}
                className="group bg-white rounded-2xl border border-gray-200 hover:shadow-lg transition-all hover:-translate-y-0.5 overflow-hidden"
              >
                <div className="h-40 bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center overflow-hidden">
                  {court.image_url
                    ? <img src={court.image_url} alt={court.name} className="w-full h-full object-cover" />
                    : <span className="text-5xl">🏸</span>
                  }
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 group-hover:text-green-600 transition-colors">{court.name}</h3>
                  {court.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{court.description}</p>}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-green-700 font-bold text-sm">{formatPrice(court.hourly_rate)} / hr</span>
                    <span className="text-xs text-gray-400 hover:text-green-600 transition-colors">View details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
