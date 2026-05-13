// Manual/cron endpoint for a global sweep of stale holds.
// On Vercel Hobby, use this for on-demand cleanup; on Pro, wire it to a cron schedule.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { expireStaleHolds } from '@/lib/supabase/expireStaleHolds'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
  }

  const supabase = createClient(url, key)
  const cancelled = await expireStaleHolds(supabase)

  console.log(`[expire-holds] Cancelled ${cancelled} expired hold(s)`)
  return NextResponse.json({ cancelled })
}
