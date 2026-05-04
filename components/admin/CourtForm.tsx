'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Court, Venue } from '@/lib/types'

interface Props {
  court?: Partial<Court>
  venues: Venue[]
}

export default function CourtForm({ court, venues }: Props) {
  const isEdit = Boolean(court?.id)
  const router = useRouter()
  const supabase = createClient()

  const [venueId, setVenueId] = useState(court?.venue_id ?? venues[0]?.id ?? '')
  const [name, setName] = useState(court?.name ?? '')
  const [description, setDescription] = useState(court?.description ?? '')
  const [imageUrl, setImageUrl] = useState(court?.image_url ?? '')
  const [hourlyRate, setHourlyRate] = useState(String(court?.hourly_rate ?? ''))
  const [isActive, setIsActive] = useState(court?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      venue_id: venueId,
      name,
      description: description || null,
      image_url: imageUrl || null,
      hourly_rate: parseFloat(hourlyRate),
      is_active: isActive,
    }

    const { error: err } = isEdit
      ? await supabase.from('courts').update(payload).eq('id', court!.id!)
      : await supabase.from('courts').insert(payload)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push('/admin/courts')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 max-w-xl space-y-5">
      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
        <select required value={venueId} onChange={e => setVenueId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Court Name *</label>
        <input required value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g. Court A" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate (THB) *</label>
        <input required type="number" min="0" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="200" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          placeholder="Optional court description…" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
        <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="https://…" />
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-green-600" />
        <label htmlFor="isActive" className="text-sm text-gray-700">Active (visible to customers)</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Court'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}
