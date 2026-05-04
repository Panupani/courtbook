import { createClient } from '@/lib/supabase/server'

export interface AdminContext {
  isSysAdmin: boolean
  venueIds: string[]   // sys admin = [] (means no filter); venue_admin = their assigned venue IDs
}

/** Returns null if the user is not an admin of any kind. */
export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  if (profile.role === 'admin') {
    return { isSysAdmin: true, venueIds: [] }
  }

  if (profile.role === 'venue_admin') {
    const { data: assignments } = await supabase
      .from('venue_admin_assignments')
      .select('venue_id')
      .eq('user_id', user.id)
    return {
      isSysAdmin: false,
      venueIds: (assignments ?? []).map((a: { venue_id: string }) => a.venue_id),
    }
  }

  return null
}

/**
 * Apply venue scoping to a Supabase query builder.
 * Pass the column name that holds venue_id (default 'venue_id').
 */
export function scopeByVenue<T>(
  query: T,
  ctx: AdminContext,
  venueCol = 'venue_id'
): T {
  if (ctx.isSysAdmin) return query
  // Always apply filter for venue admins — empty venueIds means no access (returns no rows)
  return (query as any).in(venueCol, ctx.venueIds.length > 0 ? ctx.venueIds : ['00000000-0000-0000-0000-000000000000']) as T
}
