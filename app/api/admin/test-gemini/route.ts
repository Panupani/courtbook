import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin'

// GET /api/admin/test-gemini
// Sends a simple text-only prompt to Gemini to verify the API key works.
// Returns a detailed result object for debugging.

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
]
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function GET() {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GEMINI_API_KEY is not set in environment variables.' })
  }

  const results: Record<string, string> = {}

  for (const model of MODELS) {
    try {
      const res = await fetch(`${BASE}/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Reply with exactly: {"ok":true}' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 32 },
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        const msg = json?.error?.message ?? `HTTP ${res.status}`
        results[model] = `ERROR ${res.status}: ${msg}`
        continue
      }

      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '(empty)'
      results[model] = `OK — response: ${text.trim().slice(0, 100)}`
    } catch (e: any) {
      results[model] = `EXCEPTION: ${e?.message ?? String(e)}`
    }
  }

  const anyOk = Object.values(results).some(v => v.startsWith('OK'))

  return NextResponse.json({ ok: anyOk, apiKeySet: true, models: results })
}
