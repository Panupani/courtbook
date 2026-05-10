import { NextResponse } from 'next/server'
import { getAdminContext } from '@/lib/admin'

// GET /api/admin/test-gemini
// 1. Lists available models for the API key
// 2. Tests text-only generation on each candidate model
// Returns a detailed result object for diagnosing API key / quota issues.

const BASE_V1BETA = 'https://generativelanguage.googleapis.com/v1beta'
const BASE_V1     = 'https://generativelanguage.googleapis.com/v1'

const CANDIDATE_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-8b-latest',
]

export async function GET() {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'GEMINI_API_KEY is not set in environment variables.' })
  }

  // Step 1: list available models
  let availableModels: string[] = []
  let listError = ''
  try {
    const listRes = await fetch(`${BASE_V1BETA}/models?key=${apiKey}`)
    const listJson = await listRes.json()
    if (listRes.ok && listJson.models) {
      availableModels = listJson.models
        .map((m: any) => m.name?.replace('models/', '') ?? '')
        .filter((n: string) =>
          n.startsWith('gemini') &&
          (listJson.models.find((m: any) => m.name === `models/${n}`)
            ?.supportedGenerationMethods ?? []).includes('generateContent')
        )
    } else {
      listError = listJson?.error?.message ?? `HTTP ${listRes.status}`
    }
  } catch (e: any) {
    listError = e?.message ?? String(e)
  }

  // Step 2: test text generation on candidate models
  const results: Record<string, string> = {}
  const modelsToTest = availableModels.length > 0
    ? availableModels.slice(0, 8)
    : CANDIDATE_MODELS

  for (const model of modelsToTest) {
    for (const base of [BASE_V1BETA, BASE_V1]) {
      try {
        const res = await fetch(`${base}/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "hello"' }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 16 },
          }),
        })
        const json = await res.json()
        if (!res.ok) {
          const msg = json?.error?.message ?? `HTTP ${res.status}`
          results[`${model} (${base.includes('v1beta') ? 'v1beta' : 'v1'})`] = `${res.status}: ${msg}`
          if (res.status !== 404) break
          continue
        }
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '(empty)'
        results[`${model} (${base.includes('v1beta') ? 'v1beta' : 'v1'})`] = `✓ OK: ${text.trim().slice(0, 60)}`
        break
      } catch (e: any) {
        results[`${model} (${base.includes('v1beta') ? 'v1beta' : 'v1'})`] = `exception: ${e?.message ?? String(e)}`
      }
    }
  }

  const anyOk = Object.values(results).some(v => v.startsWith('✓'))

  return NextResponse.json({
    ok: anyOk,
    apiKeySet: true,
    availableModels,
    listError: listError || undefined,
    modelTests: results,
    hint: anyOk
      ? 'API key works. Check which models show ✓ OK above.'
      : 'No models responded successfully. The key may be wrong or the API may not be enabled for this project.',
  })
}
