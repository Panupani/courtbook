import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function extractJson(text: string): { valid: boolean; reason: string } | null {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return {
      valid: parsed.valid === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'Unable to verify slip',
    }
  } catch {
    return null
  }
}

async function callGemini(
  apiKey: string, model: string, prompt: string,
  base64Data: string, mimeType: string
): Promise<{ valid: boolean; reason: string } | null> {
  const res = await fetch(`${BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64Data } },
      ]}],
      generationConfig: { temperature: 0, maxOutputTokens: 256 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message ?? `HTTP ${res.status}`
    throw Object.assign(new Error(msg), { status: res.status })
  }

  const json = await res.json()
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  console.log(`[reverify-slip] ${model} raw:`, text.slice(0, 300))
  return extractJson(text)
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })

  const supabase = await createClient()
  const { bookingId } = await req.json() as { bookingId: string }
  if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

  // Fetch booking
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, total_price, payment_slip_url, court:courts(venue_id)')
    .eq('id', bookingId)
    .single()

  if (bookingErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Scope check for venue admins
  if (!ctx.isSysAdmin) {
    const venueId = (booking.court as any)?.venue_id
    if (!venueId || !ctx.venueIds.includes(venueId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (!booking.payment_slip_url) {
    return NextResponse.json({ error: 'No slip image for this booking' }, { status: 400 })
  }

  // Fetch the slip image and convert to base64
  let base64Data: string
  let mimeType: string
  try {
    const imgRes = await fetch(booking.payment_slip_url)
    if (!imgRes.ok) throw new Error(`Fetch failed: ${imgRes.status}`)
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    mimeType = contentType.split(';')[0].trim()
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg'
    const buf = await imgRes.arrayBuffer()
    base64Data = Buffer.from(buf).toString('base64')
  } catch (e: any) {
    console.error('[reverify-slip] Failed to fetch slip image:', e)
    return NextResponse.json({ error: 'Could not retrieve slip image' }, { status: 502 })
  }

  const prompt = `You are verifying a Thai PromptPay payment slip image.

Reply with a JSON object only — no markdown, no code fences, no extra text.
Format: {"valid": true/false, "amount": number or null, "reason": "one short sentence"}

Rules:
- valid = true ONLY when ALL of these are true:
  1. The image is a completed Thai PromptPay transfer receipt (not pending/queued)
  2. The transferred amount equals ฿${Number(booking.total_price).toFixed(2)} (allow ±1 THB)
- valid = false for: wrong amount, pending/processing transfers, non-PromptPay images, edited/fake slips
- reason: one short English sentence explaining the decision`

  let aiResult: { valid: boolean; reason: string } | null = null

  for (const model of MODELS) {
    try {
      aiResult = await callGemini(apiKey, model, prompt, base64Data, mimeType)
      if (aiResult !== null) {
        console.log(`[reverify-slip] Success with ${model}:`, aiResult)
        break
      }
    } catch (err: any) {
      const status: number = err?.status ?? 0
      const msg: string = err?.message ?? ''
      if (status === 400 || status === 403 || msg.includes('API_KEY') || msg.includes('API key')) break
      if (status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) break
      if (status === 404) continue
      console.warn(`[reverify-slip] ${model} failed ${status}, trying next`)
    }
  }

  if (aiResult === null) {
    return NextResponse.json({ error: 'AI could not process the slip. Try again later.' }, { status: 503 })
  }

  if (!aiResult.valid) {
    return NextResponse.json({ verified: false, reason: aiResult.reason })
  }

  // Approve the booking
  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', payment_status: 'paid' })
    .eq('id', bookingId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

  return NextResponse.json({ verified: true, reason: aiResult.reason })
}
