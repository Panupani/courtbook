'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Venue } from '@/lib/types'

interface Props {
  venue?: Partial<Venue>
}

export default function VenueForm({ venue }: Props) {
  const isEdit = Boolean(venue?.id)
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState(venue?.name ?? '')
  const [address, setAddress] = useState(venue?.address ?? '')
  const [description, setDescription] = useState(venue?.description ?? '')
  const [imageUrl, setImageUrl] = useState(venue?.image_url ?? '')
  const [promptpayId, setPromptpayId] = useState(venue?.promptpay_id ?? '')
  const [feeRate, setFeeRate] = useState<number>((venue?.platform_fee_rate ?? 0.05) * 100)
  const [isActive, setIsActive] = useState(venue?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      name,
      address,
      description: description || null,
      image_url: imageUrl || null,
      promptpay_id: promptpayId || null,
      platform_fee_rate: Math.round(feeRate) / 100,
      is_active: isActive,
    }

    const { error: err } = isEdit
      ? await supabase.from('venues').update(payload).eq('id', venue!.id!)
      : await supabase.from('venues').insert(payload)

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    router.push('/admin/venues')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 max-w-xl space-y-5">
      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
        <input required value={name} onChange={e => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g. Smash Arena Bangkok" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
        <input required value={address} onChange={e => setAddress(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="123 Sport Ave, Bangkok" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          placeholder="A brief description of this venue…" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
        <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="https://…" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PromptPay ID (Venue-specific)</label>
        <input value={promptpayId} onChange={e => setPromptpayId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g. 0812345678 or 1234567890123" />
        <p className="text-[10px] text-gray-400 mt-1">If set, customers will pay to this ID instead of the global one.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fee Rate</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0} max={100} step={1}
            value={feeRate}
            onChange={e => setFeeRate(Number(e.target.value))}
            className="w-24 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">
          Platform commission deducted per booking. Default 10%.
          Net to venue = booking total × {100 - Math.round(feeRate)}%.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-green-600" />
        <label htmlFor="isActive" className="text-sm text-gray-700">Active (visible to customers)</label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Venue'}
        </button>
        <button type="button" onClick={() => router.back()}
          className="border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  )
}
