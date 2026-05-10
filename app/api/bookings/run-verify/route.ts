import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySlipWithGemini } from '@/lib/gemini'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ confirmed: false, retry: false, reason: 'AI verification not configured.' }, { status: 503 })
  }

  const { ids, slipImage, expectedAmount } = await req.json() as {
    ids: string[]
    slipImage: string
    expectedAmount: number
  }

  if (!Array.isArray(ids) || ids.length === 0 || !slipImage || !expectedAmount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify these bookings belong to the current user and are still pending
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, payment_status')
    .in('id', ids)
    .eq('user_id', user.id)

  if (!bookings || bookings.length !== ids.length) {
    return NextResponse.json({ error: 'Bookings not found' }, { status: 404 })
  }

  // Already confirmed by a previous poll — return success immediately
  if (bookings.every((b: any) => b.payment_status === 'paid')) {
    return NextResponse.json({ confirmed: true, reason: 'Payment already confirmed.' })
  }

  // Parse base64 image
  const base64Match = slipImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (!base64Match) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })

  const rawMime    = base64Match[1].toLowerCase()
  const mimeType   = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime
  const base64Data = base64Match[2]

  const prompt = `You are verifying a Thai PromptPay payment slip image.

Reply with ONLY a raw JSON object — no markdown, no code fences, no explanation.
Format: {"valid": true, "amount": 500, "reason": "one short sentence"}
        {"valid": false, "amount": null, "reason": "one short sentence"}

Rules:
- valid = true ONLY when the image is a completed Thai bank transfer receipt AND the amount is ฿${expectedAmount.toFixed(2)} (tolerance ±2 THB)
- valid = false for wrong amount, pending status, non-receipt images
- reason: one short English sentence (max 15 words)`

  const { result, lastError } = await verifySlipWithGemini(apiKey, prompt, base64Data, mimeType, '[run-verify]')

  if (result === null) {
    console.error('[run-verify] All models failed. lastError:', lastError)
    return NextResponse.json({ confirmed: false, retry: true, reason: 'AI is busy. Retrying…' }, { status: 503 })
  }

  if (!result.valid) {
    return NextResponse.json({ confirmed: false, retry: false, reason: result.reason })
  }

  // ✅ Approved — update all bookings
  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', payment_status: 'paid' })
    .in('id', ids)
    .eq('user_id', user.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ confirmed: true, reason: result.reason })
}
