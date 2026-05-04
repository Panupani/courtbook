'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ApproveActions({ bookingId }: { bookingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function act(action: 'approve' | 'reject') {
    setLoading(action)
    await fetch('/api/admin/approve-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, action }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="flex gap-2">
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
  )
}
