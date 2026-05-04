import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'

export async function DELETE(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json() as { id: string }
  if (!id) return NextResponse.json({ error: 'Court id required' }, { status: 400 })

  const supabase = await createClient()

  // Venue admins can only delete courts in their assigned venues
  if (!ctx.isSysAdmin) {
    const { data: court } = await supabase.from('courts').select('venue_id').eq('id', id).single()
    if (!court || !ctx.venueIds.includes(court.venue_id)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
  }

  const { error } = await supabase.from('courts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
