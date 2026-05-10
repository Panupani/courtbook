'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import type { TimeSlot } from '@/lib/types'

interface Venue { id: string; name: string }
interface Court { id: string; name: string; hourly_rate: number; venue_id: string }

interface Props {
  venues: Venue[]
  courts: Court[]
}

export default function WalkInForm({ venues, courts }: Props) {
  const router = useRouter()
  const today  = new Date().toISOString().split('T')[0]

  if (venues.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
        <p className="text-4xl mb-3">🏟️</p>
        <p className="font-semibold text-gray-600 mb-1">No venues assigned</p>
        <p className="text-sm">Ask a system admin to assign venues to your account.</p>
      </div>
    )
  }

  const [venueId, setVenueId]           = useState(venues[0]?.id ?? '')
  const [courtId, setCourtId]           = useState('')
  const [date, setDate]                 = useState(new Date().toISOString().split('T')[0])
  const [slots, setSlots]               = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsMsg, setSlotsMsg]         = useState('')
  const [selected, setSelected]         = useState<TimeSlot[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')

  const filteredCourts = courts.filter(c => c.venue_id === venueId)

  // Reset court when venue changes (courts dep covers the case where parent re-fetches)
  useEffect(() => {
    const first = filteredCourts[0]?.id ?? ''
    setCourtId(first)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, courts])

  // Load slots when court or date changes
  const loadSlots = useCallback(async () => {
    if (!courtId || !date) return
    setSlotsLoading(true)
    setSlots([])
    setSelected([])
    setSlotsMsg('')
    try {
      const res = await fetch(`/api/admin/slots?courtId=${courtId}&date=${date}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
      setSlotsMsg(data.message ?? '')
    } finally {
      setSlotsLoading(false)
    }
  }, [courtId, date])

  useEffect(() => { loadSlots() }, [loadSlots])

  const toggleSlot = (slot: TimeSlot) => {
    if (!slot.available) return
    setSelected(prev =>
      prev.find(s => s.start === slot.start)
        ? prev.filter(s => s.start !== slot.start)
        : [...prev, slot].sort((a, b) => a.start.localeCompare(b.start))
    )
  }

  const total = selected.reduce((s, slot) => s + slot.price, 0)

  const handleSubmit = async () => {
    if (!courtId || !date || selected.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bookings/walkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId, date,
          slots: selected.map(s => ({ start: s.start, end: s.end, price: s.price })),
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create booking')
        return
      }
      router.push('/admin/bookings')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Court & Date selector ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Select Court & Date</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {venues.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Venue</label>
              <select
                value={venueId}
                onChange={e => setVenueId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className={venues.length > 1 ? '' : 'sm:col-span-2'}>
            <label className="block text-xs font-medium text-gray-500 mb-1">Court</label>
            {filteredCourts.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No courts for this venue</p>
            ) : (
              <select
                value={courtId}
                onChange={e => setCourtId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {filteredCourts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* ── Time Slots ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Select Time Slots</h2>

        {slotsLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Loading slots…
          </div>
        ) : slotsMsg ? (
          <p className="text-sm text-gray-400 py-4">{slotsMsg}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No operating hours configured for this day.</p>
        ) : (
          <>
            <div className="flex gap-4 text-xs mb-3">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-300 inline-block"/>Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/>Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block"/>Booked</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300 inline-block"/>Peak</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map(slot => {
                const isSelected = selected.some(s => s.start === slot.start)
                return (
                  <button
                    key={slot.start}
                    onClick={() => toggleSlot(slot)}
                    disabled={!slot.available}
                    className={`
                      rounded-xl px-2 py-3 text-center text-xs font-medium transition-all border
                      ${!slot.available
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-green-500 text-white border-green-500 shadow-sm'
                          : slot.isPeak
                            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400'
                            : 'bg-green-50 text-green-800 border-green-200 hover:border-green-400'
                      }
                    `}
                  >
                    <div>{slot.start}</div>
                    <div className="mt-0.5 font-semibold">{formatPrice(slot.price)}</div>
                    {slot.isPeak && !isSelected && (
                      <div className="text-[9px] text-amber-600 mt-0.5">Peak</div>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Customer Info ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Customer Info <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="e.g. 081-234-5678"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* ── Summary & Submit ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Summary</h2>

        {selected.length === 0 ? (
          <p className="text-sm text-gray-400">No slots selected yet.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {selected.map(s => (
              <div key={s.start} className="flex justify-between text-sm">
                <span className="text-gray-700">{s.start} – {s.end}{s.isPeak ? ' 🔥' : ''}</span>
                <span className="font-medium text-gray-900">{formatPrice(s.price)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-base">
              <span>Total (Cash)</span>
              <span className="text-green-700">{formatPrice(total)}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 mb-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.length === 0}
            className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Creating…' : `Confirm Walk-in · ${formatPrice(total)}`}
          </button>
        </div>
      </div>

    </div>
  )
}
