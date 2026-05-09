import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Step 2 of 2: call Gemini, update booking status ─────────────────────────
// Called by the frontend after /api/bookings/verify-slip creates the pending
// bookings. Returns { confirmed, reason }. Safe to retry — idempotent.

export const maxDuration = 60 // use max allowed (Hobby = 10s, Pro = 60s)

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function extractJson(text: string): { valid: boolean; reason: string } | null {
  // Strip markdown code fences
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
  // Greedy match — gets outermost JSON object (first { to last })
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('[run-verify] No JSON in response:', text.slice(0, 300))
    return null
  }
  try {
    const parsed = JSON.parse(match[0])
    return {
      valid:  parsed.valid === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'Unable to verify slip',
    }
  } catch (e) {
    console.error('[run-verify] JSON.parse failed:', match[0].slice(0, 200), e)
    return null
  }
}

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
    console.error(`[run-verify] ${model} → ${res.status}: ${msg}`)
    throw Object.assign(new Error(msg), { status: res.status })
  }

  const json = await res.json()
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  console.log(`[run-verify] ${model} raw:`, text.slice(0, 500))
  return extractJson(text)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[run-verify] GEMINI_API_KEY not set')
    return NextResponse.json({ error: 'AI verification not configured' }, { status: 503 })
  }

  const { ids, slipImage, expectedAmount } = await req.json() as {
    ids: string[]
    slipImage: string       // base64 data URL still held by frontend
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

  // If already confirmed by a previous poll — return success immediately
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

Reply with ONLY a raw JSON object — no markdown, no code fences, no explanation before or after.
Exact format: {"valid": true, "amount": 500, "reason": "one short sentence"}
               {"valid": false, "amount": null, "reason": "one short sentence"}

Rules:
- valid = true ONLY when ALL of the following are true:
  1. The image is a completed Thai PromptPay or bank transfer receipt (status shows success / โอนสำเร็จ)
  2. The transferred amount is ฿${expectedAmount.toFixed(2)} (tolerance: ±2 THB)
- valid = false for: wrong amount, pending/processing status, non-receipt images, suspicious edits
- reason: one short English sentence (max 15 words)`

  let aiResult: { valid: boolean; reason: string } | null = null
  let lastError = ''

  for (const model of MODELS) {
    console.log(`[run-verify] Trying model: ${model}`)
    try {
      aiResult = await callGemini(apiKey, model, prompt, base64Data, mimeType)
      if (aiResult !== null) {
        console.log(`[run-verify] ✓ ${model}:`, aiResult)
        break
      }
      // null = JSON parse failed → try next
    } catch (err: any) {
      const status: number = err?.status ?? 0
      const msg:    string = err?.message ?? ''
      lastError = `${model} ${status}: ${msg}`

      if (status === 400 || status === 403 || msg.includes('API_KEY') || msg.includes('API key') || msg.includes('invalid')) {
        console.error('[run-verify] Auth error — stopping:', lastError)
        return NextResponse.json({ error: 'Gemini API key error. Contact support.' }, { status: 503 })
      }
      if (status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        console.warn('[run-verify] Quota exceeded — trying next model:', model)
        continue   // try next model, don't give up on quota
      }
      if (status === 404) { continue }
      console.warn(`[run-verify] ${model} failed (${status}), trying next model`)
    }
  }

  console.log('[run-verify] Final — aiResult:', aiResult, '| lastError:', lastError)

  if (aiResult === null) {
    // Transient failure — tell the frontend to retry
    return NextResponse.json(
      { confirmed: false, retry: true, reason: 'AI is busy. Retrying…' },
      { status: 503 }
    )
  }

  if (!aiResult.valid) {
    // Slip rejected — leave as pending for manual review, return reason
    return NextResponse.json({ confirmed: false, retry: false, reason: aiResult.reason })
  }

  // ✅ Slip approved — update all bookings to confirmed
  const { error: updateErr } = await supabase
    .from('bookings')
    .update({ status: 'confirmed', payment_status: 'paid' })
    .in('id', ids)
    .eq('user_id', user.id)

  if (updateErr) {
    console.error('[run-verify] DB update failed:', updateErr.message)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ confirmed: true, reason: aiResult.reason })
}
