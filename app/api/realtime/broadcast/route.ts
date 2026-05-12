// Thin server route: lets authenticated client-side code trigger a slot broadcast
// without exposing the service-role key to the browser.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { broadcastSlotUpdates, type SlotUpdate } from '@/lib/supabase/broadcast'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as SlotUpdate
  if (!body.courtId || !body.bookingDate || !body.startTime || !body.status) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await broadcastSlotUpdates([body])
  return NextResponse.json({ ok: true })
}
