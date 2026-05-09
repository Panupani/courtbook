import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ── Step 1 of 2: upload slip + create bookings (pending status) ──────────────
// Gemini verification is intentionally NOT called here so that booking creation
// is instant and immune to AI timeouts. The frontend calls /api/bookings/run-verify
// after this to do the actual Gemini check and flip the status.

async function uploadSlip(
  userId: string,
  base64Data: string,
  mediaType: string
): Promise<string | null> {
  // Use the service-role client so storage uploads always succeed regardless
  // of bucket RLS policies (authentication is enforced at the route level).
  const adminClient = await createAdminClient()
  try {
    const ext = mediaType.split('/')[1] ?? 'jpg'
    const fileName = `${userId}/${Date.now()}.${ext}`
    const buffer = Buffer.from(base64Data, 'base64')
    const { data, error } = await adminClient.storage
      .from('payment-slips')
      .upload(fileName, buffer, { contentType: mediaType, upsert: false })
    if (error || !data) {
      console.error('[verify-slip] Storage upload failed:', error?.message)
      return null
    }
    const { data: urlData } = adminClient.storage.from('payment-slips').getPublicUrl(data.path)
    return urlData.publicUrl
  } catch (e) {
    console.error('[verify-slip] uploadSlip threw:', e)
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { bookings, slipImage, expectedAmount } = body as {
    bookings: Record<string, unknown>[]
    slipImage: string
    expectedAmount: number
  }

  if (!slipImage || !Array.isArray(bookings) || bookings.length === 0) {
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

  // Upload slip to storage so admin can view it
  const slipUrl = await uploadSlip(user.id, base64Data, mediaType)
  console.log('[verify-slip] Slip uploaded:', slipUrl ? 'ok' : 'failed')

  // Fetch fee rate from first booking's court venue
  let feeRate = 0.10
  if (bookings[0]?.court_id) {
    const { data: courtData } = await supabase
      .from('courts')
      .select('venue:venues(platform_fee_rate)')
      .eq('id', bookings[0].court_id as string)
      .single()
    feeRate = (courtData?.venue as any)?.platform_fee_rate ?? 0.10
  }

  // Create bookings as pending — verification happens in /api/bookings/run-verify
  const rows = bookings.map((b: any) => ({
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

  return NextResponse.json({
    ids: data.map((r: { id: string }) => r.id),
    slipUrl,
    pending: true,
  })
}
