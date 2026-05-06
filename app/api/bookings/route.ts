import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { bookings } = body as { bookings: Record<string, unknown>[] }

  if (!Array.isArray(bookings) || bookings.length === 0) {
    return NextResponse.json({ error: 'No bookings provided' }, { status: 400 })
  }

  // Force user_id to authenticated user — never trust the client
  const rows = bookings.map(b => ({ ...b, user_id: user.id }))

  const { data, error } = await supabase.from('bookings').insert(rows).select('id')

  if (error) {
    // Postgres unique-violation code = 23505
    // Triggered by the partial unique index: unique_active_slot
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'One or more slots were just taken by another booking. Please go back and choose a different time.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ids: data.map((r: { id: string }) => r.id) })
}
