'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AssignForm({ venues }: { venues: { id: string; name: string }[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, venueId }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setEmail('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="email"
        required
        placeholder="staff@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <select
        value={venueId}
        onChange={e => setVenueId(e.target.value)}
        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
      >
        {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60 text-sm whitespace-nowrap"
      >
        {loading ? 'Assigning…' : '+ Assign Staff'}
      </button>
      {error && <p className="text-red-500 text-sm self-center">{error}</p>}
    </form>
  )
}

export function RevokeButton({ userId, venueId }: { userId: string; venueId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function revoke() {
    setLoading(true)
    await fetch('/api/admin/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, venueId }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={revoke}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
    >
      {loading ? '…' : 'Revoke'}
    </button>
  )
}
