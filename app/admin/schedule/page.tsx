export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import ScheduleEditor from '@/components/admin/ScheduleEditor'
import type { Court, OperatingHours } from '@/lib/types'

export default async function AdminSchedulePage() {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const supabase = await createClient()
  let query = supabase.from('courts').select('*, venue:venues(name)').order('name')
  if (!ctx.isSysAdmin) query = query.in('venue_id', ctx.venueIds)
  const { data: courts } = await query

  const courtIds = (courts ?? []).map((c: any) => c.id)
  const { data: allHours } = courtIds.length > 0
    ? await supabase.from('operating_hours').select('*').in('court_id', courtIds)
    : { data: [] }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="mt-1 text-gray-500 text-sm">Set operating hours and time slot duration per court</p>
      </div>

      {!courts || courts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No courts found.
          {ctx.isSysAdmin && <a href="/admin/courts/new" className="ml-1 text-green-600 hover:underline">Add a court first →</a>}
        </div>
      ) : (
        <div className="space-y-6">
          {(courts as any[]).map(court => {
            const courtHours = (allHours ?? []).filter((h: any) => h.court_id === court.id) as OperatingHours[]
            return (
              <div key={court.id}>
                <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">{court.venue?.name}</p>
                <ScheduleEditor court={court as Court} hours={courtHours} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
