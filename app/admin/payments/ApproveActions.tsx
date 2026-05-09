'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ApproveActions({ bookingId, hasSlip }: { bookingId: string; hasSlip: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | 'reverify' | null>(null)
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function act(action: 'approve' | 'reject') {
    setLoading(action)
    setAiMsg(null)
    await fetch('/api/admin/approve-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, action }),
    })
    setLoading(null)
    router.refresh()
  }

  async function reverify() {
    setLoading('reverify')
    setAiMsg(null)
    try {
      const res = await fetch('/api/admin/reverify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiMsg({ ok: false, text: data.error ?? 'AI verification failed.' })
      } else if (data.verified) {
        setAiMsg({ ok: true, text: `✓ AI approved: ${data.reason}` })
        router.refresh()
      } else {
        setAiMsg({ ok: false, text: `✕ AI rejected: ${data.reason}` })
      }
    } catch {
      setAiMsg({ ok: false, text: 'Network error. Try again.' })
    }
    setLoading(null)
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {aiMsg && (
        <p className={`text-xs px-3 py-1.5 rounded-lg max-w-xs text-right ${
          aiMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {aiMsg.text}
        </p>
      )}
      <div className="flex gap-2 flex-wrap justify-end">
        {hasSlip && (
          <button
            onClick={reverify}
            disabled={loading !== null}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {loading === 'reverify' ? 'Verifying…' : '🤖 Re-verify AI'}
          </button>
        )}
        <button
          onClick={() => act('approve')}
          disabled={loading !== null}
          className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading === 'approve' ? '…' : '✓ Approve'}
        </button>
        <button
          onClick={() => act('reject')}
          disabled={loading !== null}
          className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
        >
          {loading === 'reject' ? '…' : '✕ Reject'}
        </button>
      </div>
    </div>
  )
}
