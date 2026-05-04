export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { AssignForm, RevokeButton } from './StaffActions'

export default async function AdminStaffPage() {
  const ctx = await getAdminContext()
  if (!ctx || !ctx.isSysAdmin) redirect('/admin')

  const supabase = await createClient()

  const [venuesRes, assignmentsRes] = await Promise.all([
    supabase.from('venues').select('id, name').eq('is_active', true).order('name'),
    supabase
      .from('venue_admin_assignments')
      .select('id, user_id, venue_id, created_at, profile:profiles(full_name, role), venue:venues(name)')
      .order('created_at', { ascending: false }),
  ])

  const venues = venuesRes.data ?? []
  const assignments = assignmentsRes.data ?? []

  // Group assignments by user
  const byUser = new Map<string, { profile: any; venues: { id: string; name: string; assignId: string }[] }>()
  for (const a of assignments as any[]) {
    if (!byUser.has(a.user_id)) {
      byUser.set(a.user_id, { profile: a.profile, venues: [] })
    }
    byUser.get(a.user_id)!.venues.push({ id: a.venue_id, name: a.venue?.name, assignId: a.id })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          Assign users as Venue Admins. They must have an account first.
        </p>
      </div>

      {/* Assign form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">Assign Venue Admin</h2>
        {venues.length === 0 ? (
          <p className="text-sm text-gray-400">No venues yet. <a href="/admin/venues/new" className="text-green-600 hover:underline">Add a venue first →</a></p>
        ) : (
          <AssignForm venues={venues as { id: string; name: string }[]} />
        )}
      </div>

      {/* Current staff */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-4">Current Venue Admins</h2>
        {byUser.size === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
            <p>No venue admins assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(byUser.entries()).map(([userId, { profile, venues: assignedVenues }]) => (
              <div key={userId} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{profile?.full_name ?? 'Unknown'}</p>
                    <span className="text-[11px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                      Venue Admin
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {assignedVenues.map(v => (
                    <div key={v.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                      <span className="text-gray-700">🏢 {v.name}</span>
                      <RevokeButton userId={userId} venueId={v.id} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
