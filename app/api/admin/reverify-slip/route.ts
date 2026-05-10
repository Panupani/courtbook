import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import { verifySlipWithGemini } from '@/lib/gemini'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  const supabase = await createClient()
  const { bookingId } = await req.json() as { bookingId: string }
  if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, total_price, payment_slip_url, court:courts(venue_id)')
    .eq('id', bookingId)
    .single()

  if (bookingErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (!ctx.isSysAdmin) {
    const venueId = (booking.court as any)?.venue_id
    if (!venueId || !ctx.venueIds.includes(venueId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (!booking.payment_slip_url) {
    return NextResponse.json({ error: 'No slip image for this booking' }, { status: 400 })
  }

  // Download slip from storage URL
  let base64Data: string
  let mimeType: string
  try {
    const imgRes = await fetch(booking.payment_slip_url, { signal: AbortSignal.timeout(10_000) })
    if (!imgRes.ok) throw new Error(`Fetch ${imgRes.status}`)
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    mimeType = contentType.split(';')[0].trim()
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg'
    const buf = await imgRes.arrayBuffer()
    base64Data = Buffer.from(buf).toString('base64')
  } catch (e: any) {
    return NextResponse.json({ error: `Could not retrieve slip image: ${e?.message}` }, { status: 502 })
  }

  const prompt = `You are verifying a Thai PromptPay payment slip image.

Reply with ONLY a raw JSON object — no markdown, no code fences, no explanation.
Format: {"valid": true, "amount": 500, "reason": "one short sentence"}
        {"valid": false, "amount": null, "reason": "one short sentence"}

Rules:
- valid = true ONLY when the image is a completed Thai bank transfer receipt AND the amount is ฿${Number(booking.total_price).toFixed(2)} (tolerance ±2 THB)
- valid = false for wrong amount, pending status, non-receipt images
- reason: one short English sentence (max 15 words)`

  const { result, lastError } = await verifySlipWithGemini(apiKey, prompt, base64Data, mimeType, '[reverify-slip]')

  if (result === null) {
    return NextResponse.json({
      error: `AI could not process the slip. ${lastError ? `Error: ${lastError}.` : ''} Try visiting /api/admin/test-gemini to diagnose.`,
    }, { status: 503 })
  }

  if (!result.valid) {
    return NextResponse.json({ verified: false, reason: result.reason })
  }

  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', payment_status: 'paid' })
    .eq('id', bookingId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

  return NextResponse.json({ verified: true, reason: result.reason })
}
