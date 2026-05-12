import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySlipWithGemini } from '@/lib/gemini'

export const maxDuration = 60

interface DateTimeInfo {
  gregorian:   string   // "10 May 2025"
  buddhistYear: number  // 2568
  shortDate:   string   // "10/05/68"
}

function bangkokNow(): DateTimeInfo {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(now)

  const day      = parts.find(x => x.type === 'day')!.value
  const month    = parts.find(x => x.type === 'month')!.value
  const year     = Number(parts.find(x => x.type === 'year')!.value)
  const monthName = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', month: 'long' }).format(now)

  return {
    gregorian:    `${day} ${monthName} ${year}`,
    buddhistYear:  year + 543,
    shortDate:    `${day}/${month}/${String(year + 543).slice(-2)}`,
  }
}

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

  // Fetch bookings + venue info (for PromptPay ID and name check)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, status, payment_status, court:courts(venue:venues(name, promptpay_id))')
    .in('id', ids)
    .eq('user_id', user.id)

  if (!bookings || bookings.length !== ids.length) {
    return NextResponse.json({ error: 'Bookings not found' }, { status: 404 })
  }

  // Already confirmed by a previous poll — return immediately
  if (bookings.every((b: any) => b.payment_status === 'paid')) {
    return NextResponse.json({ confirmed: true, reason: 'Payment already confirmed.' })
  }

  // Extract venue PromptPay ID for receiver check
  const venue       = (bookings[0] as any)?.court?.venue as { promptpay_id?: string } | null
  const promptpayId = venue?.promptpay_id ?? null

  // Parse base64 image
  const base64Match = slipImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
  if (!base64Match) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })

  const rawMime    = base64Match[1].toLowerCase()
  const mimeType   = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime
  const base64Data = base64Match[2]

  const dt = bangkokNow()

  const promptpayRule = promptpayId
    ? `3. The receiver's PromptPay number on the slip matches (or is a masked version of) ${promptpayId} — digits may be hidden as X but the visible digits must match\n`
    : ''

  const dateRuleNum = promptpayId ? '4' : '3'

  const prompt = `You are verifying a Thai PromptPay payment slip image.

Reply with ONLY a raw JSON object — no markdown, no code fences, no explanation.
Format: {"valid": true, "amount": 500, "transaction_id": "230510XYZ123", "reason": "one short sentence"}
        {"valid": false, "amount": null, "transaction_id": null,           "reason": "one short sentence"}

Today's date in Bangkok: ${dt.gregorian} (Buddhist Era year ${dt.buddhistYear}, short date ${dt.shortDate})

Rules — valid = true ONLY when ALL of the following are true:
1. The image is a completed Thai bank transfer receipt (status = success / โอนสำเร็จ — NOT pending or processing)
2. The transferred amount is ฿${expectedAmount.toFixed(2)} (tolerance ±2 THB)
${promptpayRule}${dateRuleNum}. The transfer was made TODAY (${dt.shortDate} or ${dt.gregorian}). Note: Thai slips use Buddhist Era year (${dt.buddhistYear}).

Additionally: extract the bank reference number printed on the slip (labeled รายการอ้างอิง, Ref, Reference, or similar) and return it as transaction_id. If not visible, return null.

valid = false if: wrong amount, pending/processing status, wrong PromptPay number, or slip is from a previous day
reason: one short English sentence explaining the decision (max 15 words)`

  const { result, lastError } = await verifySlipWithGemini(apiKey, prompt, base64Data, mimeType, '[run-verify]')

  if (result === null) {
    console.error('[run-verify] All models failed. lastError:', lastError)
    return NextResponse.json({ confirmed: false, retry: true, reason: 'AI is busy. Retrying…' }, { status: 503 })
  }

  if (!result.valid) {
    return NextResponse.json({ confirmed: false, retry: false, reason: result.reason })
  }

  // Duplicate slip check — same transaction_id must not exist on another booking
  if (result.transaction_id) {
    const { data: dup } = await supabase
      .from('bookings')
      .select('id')
      .eq('transaction_id', result.transaction_id)
      .not('id', 'in', `(${ids.join(',')})`)
      .limit(1)
      .maybeSingle()

    if (dup) {
      return NextResponse.json({
        confirmed: false,
        retry: false,
        reason: 'This payment slip has already been used for another booking.',
      })
    }
  }

  // ✅ Approved — update all bookings
  const { error: updateErr } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      ...(result.transaction_id ? { transaction_id: result.transaction_id } : {}),
    })
    .in('id', ids)
    .eq('user_id', user.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ confirmed: true, reason: result.reason })
}
