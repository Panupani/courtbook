import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function assertSysAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p?.role === 'admin' ? user : null
}

// POST — assign user (by email) as venue_admin for a venue
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  if (!(await assertSysAdmin(supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, venueId } = await req.json() as { email: string; venueId: string }
  if (!email || !venueId) return NextResponse.json({ error: 'email and venueId required' }, { status: 400 })

  // Use service role to look up user by email
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: authData, error: authErr } = await service.auth.admin.listUsers()
  if (authErr) return NextResponse.json({ error: 'Could not look up users' }, { status: 500 })

  const authUser = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!authUser) return NextResponse.json({ error: 'User not found. They must sign up first.' }, { status: 404 })

  // Set role to venue_admin if currently a customer
  const { data: profile } = await service.from('profiles').select('role').eq('id', authUser.id).single()
  if (profile?.role === 'customer') {
    await service.from('profiles').update({ role: 'venue_admin' }).eq('id', authUser.id)
  }
  if (profile?.role === 'admin') {
    return NextResponse.json({ error: 'User is already a system admin.' }, { status: 400 })
  }

  const { error } = await service
    .from('venue_admin_assignments')
    .upsert({ user_id: authUser.id, venue_id: venueId }, { onConflict: 'user_id,venue_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// DELETE — remove a venue assignment; demote to customer if no venues remain
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  if (!(await assertSysAdmin(supabase))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, venueId } = await req.json() as { userId: string; venueId: string }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await service.from('venue_admin_assignments').delete().eq('user_id', userId).eq('venue_id', venueId)

  const { count } = await service
    .from('venue_admin_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) === 0) {
    await service.from('profiles').update({ role: 'customer' }).eq('id', userId)
  }

  return NextResponse.json({ ok: true })
}
