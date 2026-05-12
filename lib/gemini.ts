// Shared Gemini vision helper used by all payment-verification routes.
// Auto-discovers which models are actually available with the current API key
// so hardcoded model names never go stale.

const BASE_V1BETA = 'https://generativelanguage.googleapis.com/v1beta/models'
const BASE_V1     = 'https://generativelanguage.googleapis.com/v1/models'

// Fallback list if ListModels fails — gemini-2.5-flash first (highest free quota)
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
]

export function extractJson(text: string): { valid: boolean; reason: string; transaction_id: string | null } | null {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return {
      valid:          parsed.valid === true,
      reason:         typeof parsed.reason === 'string' ? parsed.reason : 'Unable to verify slip',
      transaction_id: typeof parsed.transaction_id === 'string'
        ? (parsed.transaction_id.trim() || null)
        : null,
    }
  } catch {
    return null
  }
}

/** Fetch models that support generateContent, preferring gemini-2.x then 1.5. */
async function listGeminiModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_V1BETA}?key=${apiKey}`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const json = await res.json()
    return (json.models ?? [])
      .filter((m: any) =>
        (m.name ?? '').includes('gemini') &&
        (m.supportedGenerationMethods ?? []).includes('generateContent')
      )
      .map((m: any) => (m.name as string).replace('models/', ''))
      .sort((a: string, b: string) => {
        // Prefer 2.5 → 3.x → 2.0 → 1.5; skip TTS/audio-only/image-gen models
        const skip = (n: string) =>
          n.includes('tts') || n.includes('computer-use') || n.includes('robotics') ||
          n.includes('image') ? 99 : 0
        const gen = (n: string) =>
          n.includes('2.5') ? 0 : n.includes('3.') ? 1 : n.includes('2.0') ? 2 : n.includes('1.5') ? 3 : 4
        // prefer non-preview, non-exp, non-lite variants first within same generation
        const stable = (n: string) =>
          n.includes('preview') || n.includes('exp') ? 1 : n.includes('lite') ? 0.5 : 0
        return (skip(a) + gen(a) + stable(a)) - (skip(b) + gen(b) + stable(b))
      })
      // Remove models that only support audio/images (no text output)
      .filter((n: string) => !n.includes('tts') && !n.includes('computer-use') && !n.includes('robotics'))
  } catch {
    return []
  }
}

export interface GeminiResult {
  valid: boolean
  reason: string
  transaction_id: string | null
}

/**
 * Try Gemini models one-by-one (auto-discovered + fallback list) until one
 * returns a parseable result. Returns null only if every attempt fails.
 */
export async function verifySlipWithGemini(
  apiKey: string,
  prompt: string,
  base64Data: string,
  mimeType: string,
  tag = '[gemini]'
): Promise<{ result: GeminiResult | null; lastError: string }> {
  // Discover available models first (5 s timeout so we don't stall)
  const discovered = await listGeminiModels(apiKey)
  const models = discovered.length > 0 ? discovered : FALLBACK_MODELS
  console.log(`${tag} Models to try:`, models.slice(0, 6))

  let lastError = ''

  for (const base of [BASE_V1BETA, BASE_V1]) {
    for (const model of models) {
      try {
        const res = await fetch(`${base}/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ]}],
            generationConfig: { temperature: 0, maxOutputTokens: 300 },
          }),
          signal: AbortSignal.timeout(25_000),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          const msg: string = err?.error?.message ?? `HTTP ${res.status}`
          lastError = `${model} → ${res.status}: ${msg}`
          console.warn(`${tag} ${lastError}`)

          if (res.status === 400 || res.status === 403 || msg.includes('API_KEY') || msg.includes('invalid')) {
            return { result: null, lastError: `API key error: ${msg}` }
          }
          if (res.status === 429 || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
            continue  // try next model
          }
          if (res.status === 404) {
            continue  // model not available — try next
          }
          continue  // other error — try next
        }

        const json = await res.json()
        const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
        console.log(`${tag} ${model} raw:`, text.slice(0, 400))

        const parsed = extractJson(text)
        if (parsed !== null) {
          console.log(`${tag} ✓ ${model}:`, parsed)
          return { result: parsed, lastError: '' }
        }
        // JSON parse failed — try next model
        lastError = `${model} → unparseable response`
      } catch (e: any) {
        lastError = `${model} → exception: ${e?.message ?? String(e)}`
        console.warn(`${tag} ${lastError}`)
        continue
      }
    }
  }

  return { result: null, lastError }
}
