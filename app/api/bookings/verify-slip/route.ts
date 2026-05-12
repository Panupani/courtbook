import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { broadcastSlotUpdates } from '@/lib/supabase/broadcast'

// ── Step 1 of 2: upload slip + create bookings (pending status) ──────────────
// Gemini verification is intentionally NOT called here so that booking creation
// is instant and immune to AI timeouts. The frontend calls /api/bookings/run-verify
// after this to do the actual Gemini check and flip the status.

async function uploadSlip(
  userId: string,
  base64Data: string,
  mediaType: string
): Promise<{ url: string | null; error: string | null }> {
  // Use the service-role client so storage uploads always succeed regardless
  // of bucket RLS policies (authentication is enforced at the route level).
  const adminClient = createAdminClient()
  try {
    const ext = mediaType.split('/')[1] ?? 'jpg'
    const fileName = `${userId}/${Date.now()}.${ext}`
    const buffer = Buffer.from(base64Data, 'base64')
    const { data, error } = await adminClient.storage
      .from('payment-slips')
      .upload(fileName, buffer, { contentType: mediaType, upsert: false })
    if (error || !data) {
      const msg = error?.message ?? 'Unknown storage error'
      console.error('[verify-slip] Storage upload failed:', msg)
      return { url: null, error: msg }
    }
    const { data: urlData } = adminClient.storage.from('payment-slips').getPublicUrl(data.path)
    console.log('[verify-slip] Slip uploaded successfully:', urlData.publicUrl)
    return { url: urlData.publicUrl, error: null }
  } catch (e: any) {
    const msg = e?.message ?? String(e)
    console.error('[verify-slip] uploadSlip threw:', msg)
    return { url: null, error: msg }
  }
}

export async function POST(req: NextRequest) {
  // Check service role key is configured — required for storage uploads
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'placeholder-service-key') {
    console.error('[verify-slip] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing. Contact support.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { bookings, holdIds, slipImage, expectedAmount } = body as {
    bookings?: Record<string, unknown>[]
    holdIds?:  string[]
    slipImage: string
    expectedAmount: number
  }

  const hasHold = Array.isArray(holdIds) && holdIds.length > 0
  if (!slipImage || (!hasHold && (!Array.isArray(bookings) || bookings.length === 0))) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const base64Match = slipImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (!base64Match) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })

  const rawMime   = base64Match[1].toLowerCase()
  const mediaType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime
  const base64Data = base64Match[2]

  if (base64Data.length > 6_000_000) {
    return NextResponse.json({ error: 'Slip image is too large. Please use a screenshot instead.' }, { status: 400 })
  }

  // Upload slip to storage — fail loudly if it doesn't work
  const { url: slipUrl, error: uploadError } = await uploadSlip(user.id, base64Data, mediaType)
  if (uploadError) {
    return NextResponse.json(
      { error: `Failed to save payment slip: ${uploadError}` },
      { status: 500 }
    )
  }

  // ── PATH A: hold bookings already exist — just attach the slip ─────────────
  if (hasHold) {
    const { data: held, error: fetchErr } = await supabase
      .from('bookings')
      .select('id')
      .in('id', holdIds!)
      .eq('user_id', user.id)
      .eq('payment_status', 'unpaid')   // must be an unattached hold

    if (fetchErr || !held || held.length !== holdIds!.length) {
      return NextResponse.json(
        { error: 'Hold bookings not found or already processed.' },
        { status: 404 }
      )
    }

    const { error: updateErr } = await supabase
      .from('bookings')
      .update({ payment_slip_url: slipUrl, payment_method: 'promptpay', payment_status: 'pending' })
      .in('id', holdIds!)
      .eq('user_id', user.id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    return NextResponse.json({ ids: holdIds, slipUrl, pending: true })
  }

  // ── PATH B: no hold — insert new pending bookings (legacy / fallback) ───────
  let feeRate = 0.05
  if (bookings![0]?.court_id) {
    const { data: courtData } = await supabase
      .from('courts')
      .select('venue:venues(platform_fee_rate)')
      .eq('id', bookings![0].court_id as string)
      .single()
    feeRate = (courtData?.venue as any)?.platform_fee_rate ?? 0.05
  }

  const rows = bookings!.map((b: any) => ({
    ...b,
    user_id:             user.id,
    payment_method:      'promptpay',
    payment_status:      'pending',
    payment_slip_url:    slipUrl,
    status:              'pending',
    platform_fee_amount: Math.round((b.total_price ?? 0) * feeRate * 100) / 100,
  }))

  const { data, error } = await supabase.from('bookings').insert(rows).select('id')
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'One or more slots were just taken by another booking. Please go back and choose a different time.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Broadcast pending so other clients see these slots blocked
  broadcastSlotUpdates(rows.map((r: any) => ({
    courtId:     r.court_id,
    bookingDate: r.booking_date,
    startTime:   String(r.start_time).slice(0, 5),
    status:      'pending',
  })))

  return NextResponse.json({
    ids: data.map((r: { id: string }) => r.id),
    slipUrl,
    pending: true,
  })
}
