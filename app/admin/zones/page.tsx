export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import ZoneManager from './ZoneManager'

export default async function AdminZonesPage() {
  const ctx = await getAdminContext()
  if (!ctx || !ctx.isSysAdmin) redirect('/admin')

  const supabase = await createClient()
  const { data: zones } = await supabase
    .from('zones')
    .select('*, venues(id)')
    .order('name')

  // Count venues per zone
  const zonesWithCount = (zones ?? []).map((z: any) => ({
    id: z.id,
    name: z.name,
    created_at: z.created_at,
    venueCount: (z.venues ?? []).length,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Location Zones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define zones (e.g. districts or areas). Assign each venue to a zone so customers can filter by location.
        </p>
      </div>
      <ZoneManager zones={zonesWithCount} />
    </div>
  )
}
