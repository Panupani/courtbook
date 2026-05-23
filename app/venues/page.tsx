export const dynamic = 'force-dynamic'

import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import type { Venue, Zone } from '@/lib/types'
import ZoneFilter from './ZoneFilter'

// Leaflet must not run on the server — lazy-load the map
const VenueMap = nextDynamic(() => import('@/components/VenueMap'), { ssr: false })

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>
}) {
  const { zone: zoneId } = await searchParams
  const supabase = await createClient()

  // Fetch all zones (for the filter pills)
  const { data: zones } = await supabase
    .from('zones')
    .select('*')
    .order('name')

  // Fetch venues — filtered by zone if selected
  let query = supabase
    .from('venues')
    .select('*, zone:zones(id, name, created_at)')
    .eq('is_active', true)
    .order('name')

  if (zoneId) query = query.eq('zone_id', zoneId)

  const { data: venues } = await query

  const activeZone = (zones as Zone[] ?? []).find(z => z.id === zoneId)

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Find a Court</h1>
        <p className="mt-2 text-gray-500">Browse venues by area and book your slot</p>
      </div>

      {/* Zone filter pills */}
      {zones && zones.length > 0 && (
        <ZoneFilter zones={zones as Zone[]} activeZoneId={zoneId} />
      )}

      {/* Map */}
      <VenueMap venues={(venues ?? []) as (Venue & { zone?: Zone })[]} activeZoneId={zoneId} />

      {/* Results header */}
      {activeZone && (
        <div className="flex items-center gap-2 mb-5">
          <span className="text-sm text-gray-500">
            Showing venues in
          </span>
          <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-0.5 rounded-full">
            📍 {activeZone.name}
          </span>
          <Link href="/venues" className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">
            Clear
          </Link>
        </div>
      )}

      {!venues || venues.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <span className="text-6xl block mb-4">🏸</span>
          <p className="text-lg font-medium text-gray-600">
            {activeZone ? `No venues in ${activeZone.name} yet` : 'No venues available yet'}
          </p>
          <p className="text-sm mt-1">
            {activeZone ? (
              <Link href="/venues" className="text-green-600 hover:underline">Browse all zones →</Link>
            ) : 'Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(venues as (Venue & { zone?: Zone })[]).map(venue => (
            <Link
              key={venue.id}
              href={`/venues/${venue.id}`}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div className="h-48 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center overflow-hidden">
                {venue.image_url
                  ? <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover" />
                  : <span className="text-7xl">🏸</span>
                }
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors leading-tight">
                    {venue.name}
                  </h2>
                  {venue.zone && (
                    <span className="flex-shrink-0 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full mt-0.5">
                      {venue.zone.name}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <span>📍</span>{venue.address}
                </p>
                {venue.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">{venue.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">View courts</span>
                  <span className="text-gray-400 group-hover:text-green-600 transition-colors">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
