import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODELS = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

async function callGemini(
  apiKey: string,
  model: string,
  prompt: string,
  base64Data: string,
  mimeType: string
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
    console.error(`[verify-slip] ${model} → ${res.status}: ${msg}`)
    throw Object.assign(new Error(msg), { status: res.status })
  }

  const json = await res.json()
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  console.log(`[verify-slip] ${model} response:`, text)

  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (!jsonMatch) return null

  const parsed = JSON.parse(jsonMatch[0])
  return {
    valid: parsed.valid === true,
    reason: typeof parsed.reason === 'string' ? parsed.reason : 'Unable to verify slip',
  }
}

async function uploadSlip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  base64Data: string,
  mediaType: string
): Promise<string | null> {
  try {
    const ext = mediaType.split('/')[1] ?? 'jpg'
    const fileName = `${userId}/${Date.now()}.${ext}`
    const buffer = Buffer.from(base64Data, 'base64')
    const { data, error } = await supabase.storage
      .from('payment-slips')
      .upload(fileName, buffer, { contentType: mediaType, upsert: false })
    if (error || !data) return null
    const { data: urlData } = supabase.storage.from('payment-slips').getPublicUrl(data.path)
    return urlData.publicUrl
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Payment verification is not configured. Contact the venue.' }, { status: 503 })
  }

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

  const rawMime = base64Match[1].toLowerCase()
  const mediaType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime
  const base64Data = base64Match[2]

  if (base64Data.length > 4_000_000) {
    return NextResponse.json({ error: 'Slip image is too large. Please use a screenshot instead of a full photo.' }, { status: 400 })
  }

  // Upload slip first so admin can review it even if AI is unavailable
  const slipUrl = await uploadSlip(supabase, user.id, base64Data, mediaType)

  const prompt = `Analyze this payment slip image.

Reply with JSON only — no markdown, no extra text:
{"valid": boolean, "amount": number | null, "reason": string}

Rules:
- valid = true ONLY when: (1) this is a completed Thai PromptPay transfer receipt AND (2) the transferred amount equals ฿${expectedAmount.toFixed(2)} (±1 THB tolerance)
- valid = false for: pending/queued transfers, wrong amount, non-PromptPay images, or anything edited
- reason: one short English sentence`

  // Try each model — fall through on 404, stop on quota/auth errors
  let aiResult: { valid: boolean; reason: string } | null = null
  let quotaExceeded = false
  let authError = false

  for (const model of MODELS) {
    try {
      aiResult = await callGemini(apiKey, model, prompt, base64Data, mediaType)
      if (aiResult !== null) break
    } catch (err: any) {
      const status: number = err?.status ?? 0
      const msg: string = err?.message ?? ''

      if (status === 400 || status === 403 || msg.includes('API_KEY') || msg.includes('API key')) {
        authError = true; break
      }
      if (status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        quotaExceeded = true; break
      }
      // 404 = model not found → try next
      if (status !== 404 && !msg.includes('not found')) break
    }
  }

  // Hard failures — don't proceed
  if (authError) {
    return NextResponse.json({ error: 'Verification key is invalid. Contact the venue.' }, { status: 503 })
  }

  // AI rejected the slip
  if (aiResult !== null && !aiResult.valid) {
    return NextResponse.json({ error: aiResult.reason }, { status: 422 })
  }

  // Decide booking status
  const aiAvailable = aiResult !== null
  const bookingStatus   = aiAvailable ? 'confirmed' : 'pending'
  const paymentStatus   = aiAvailable ? 'paid'      : 'pending'

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

  const rows = bookings.map((b: any) => ({
    ...b,
    user_id:             user.id,
    payment_method:      'promptpay',
    payment_status:      paymentStatus,
    payment_slip_url:    slipUrl,
    status:              bookingStatus,
    platform_fee_amount: Math.round((b.total_price ?? 0) * feeRate * 100) / 100,
  }))

  const { data, error } = await supabase.from('bookings').insert(rows).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({
    ids: data.map((r: { id: string }) => r.id),
    pending: !aiAvailable,
    ...(quotaExceeded && { message: 'AI verification is temporarily busy — your booking is held for manual review by staff.' }),
  })
}
