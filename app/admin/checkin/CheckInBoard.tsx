'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

interface BookingRow {
  id: string
  booking_date: string
  start_time: string
  end_time: string
  total_price: number
  status: string
  payment_method: string | null
  notes: string | null
  checked_in_at: string | null
  court: { name: string; venue: { name: string } | null } | null
  profile: { full_name: string | null; phone: string | null } | null
}

interface Props {
  bookings: BookingRow[]
  date: string
}

function timeLabel(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

function slotStatus(b: BookingRow): 'checked-in' | 'upcoming' | 'no-show' | 'cancelled' {
  if (b.status === 'cancelled') return 'cancelled'
  if (b.checked_in_at) return 'checked-in'
  const now = new Date()
  const slotEnd = new Date(`${b.booking_date}T${b.end_time}`)
  return now > slotEnd ? 'no-show' : 'upcoming'
}

const STATUS_STYLE: Record<string, string> = {
  'checked-in': 'bg-green-100 text-green-700',
  'upcoming':   'bg-blue-100 text-blue-700',
  'no-show':    'bg-red-100 text-red-600',
  'cancelled':  'bg-gray-100 text-gray-500',
}

const STATUS_LABEL: Record<string, string> = {
  'checked-in': '✅ Checked In',
  'upcoming':   '🕐 Upcoming',
  'no-show':    '❌ No Show',
  'cancelled':  'Cancelled',
}

export default function CheckInBoard({ bookings: initial, date }: Props) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initial)
  const [, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'checked-in'>('all')

  // Without this, router.refresh() from AutoRefresh delivers new props that useState ignores
  useEffect(() => {
    setBookings(initial)
  }, [initial])

  // Forces re-render every 60 s so slotStatus() recalculates upcoming → no-show as time passes
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`checkin-${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `booking_date=eq.${date}` },
        () => { startTransition(() => router.refresh()) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [date, router])

  // Summary counts
  const total      = bookings.filter(b => b.status !== 'cancelled').length
  const checkedIn  = bookings.filter(b => b.checked_in_at).length
  const remaining  = bookings.filter(b => !b.checked_in_at && b.status === 'confirmed').length

  const [checkInError, setCheckInError] = useState<string | null>(null)

  const handleCheckIn = async (id: string, undo = false) => {
    setLoadingId(id)
    setCheckInError(null)
    try {
      const res = await fetch('/api/admin/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id, undo }),
      })
      if (res.ok) {
        const now = new Date().toISOString()
        setBookings(prev => prev.map(b =>
          b.id === id ? { ...b, checked_in_at: undo ? null : now } : b
        ))
        startTransition(() => router.refresh())
      } else {
        const data = await res.json().catch(() => ({}))
        setCheckInError(data.error ?? 'Check-in failed. Please try again.')
      }
    } catch {
      setCheckInError('Network error. Please try again.')
    } finally {
      setLoadingId(null)
    }
  }

  const filtered = bookings.filter(b => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return !b.checked_in_at && b.status === 'confirmed'
    if (filter === 'checked-in') return !!b.checked_in_at
    return true
  })

  // Group by court
  const grouped = filtered.reduce<Record<string, BookingRow[]>>((acc, b) => {
    const key = b.court?.name ?? 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {})

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Bookings</p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{checkedIn}</p>
          <p className="text-xs text-green-600 mt-1">Checked In</p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{remaining}</p>
          <p className="text-xs text-blue-600 mt-1">Remaining</p>
        </div>
      </div>

      {/* Error toast */}
      {checkInError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{checkInError}</span>
          <button onClick={() => setCheckInError(null)} className="ml-3 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(['all', 'upcoming', 'checked-in'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f === 'all' ? 'All' : f === 'upcoming' ? 'Upcoming' : 'Checked In'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🏸</p>
          <p>No bookings for this filter.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([courtName, rows]) => (
            <div key={courtName}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                🏸 {courtName}
              </h3>
              <div className="space-y-2">
                {rows
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map(b => {
                    const st = slotStatus(b)
                    const isLoading = loadingId === b.id
                    const checkedInTime = b.checked_in_at
                      ? new Date(b.checked_in_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                      : null
                    const isWalkIn = b.notes?.startsWith('[Walk-in]') ?? false

                    // Parse customer info from notes for walk-ins
                    let customerName = b.profile?.full_name ?? null
                    let customerPhone = b.profile?.phone ?? null
                    if (isWalkIn && b.notes) {
                      const nameMatch = b.notes.match(/Name: ([^|]+)/)
                      const phoneMatch = b.notes.match(/Tel: ([^|]+)/)
                      if (nameMatch) customerName = nameMatch[1].trim()
                      if (phoneMatch) customerPhone = phoneMatch[1].trim()
                    }

                    return (
                      <div
                        key={b.id}
                        className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                          st === 'checked-in' ? 'border-green-200 bg-green-50/50' :
                          st === 'no-show'    ? 'border-red-100 opacity-60' :
                          'border-gray-200'
                        }`}
                      >
                        {/* Time block */}
                        <div className="w-20 text-center flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">{timeLabel(b.start_time)}</p>
                          <p className="text-xs text-gray-400">–{timeLabel(b.end_time)}</p>
                        </div>

                        {/* Customer info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">
                              {customerName ?? 'Unknown'}
                            </p>
                            {isWalkIn && (
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-semibold">
                                Walk-in
                              </span>
                            )}
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[st]}`}>
                              {STATUS_LABEL[st]}
                            </span>
                          </div>
                          {customerPhone && (
                            <p className="text-xs text-gray-400 mt-0.5">{customerPhone}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{formatPrice(b.total_price)}</span>
                            {b.payment_method && (
                              <span className="capitalize">· {b.payment_method}</span>
                            )}
                            {checkedInTime && (
                              <span className="text-green-600">· In at {checkedInTime}</span>
                            )}
                          </div>
                        </div>

                        {/* Check-in button */}
                        {b.status !== 'cancelled' && (
                          <div className="flex-shrink-0">
                            {st === 'checked-in' ? (
                              <button
                                onClick={() => handleCheckIn(b.id, true)}
                                disabled={isLoading}
                                className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                              >
                                {isLoading ? '…' : 'Undo'}
                              </button>
                            ) : st === 'upcoming' ? (
                              <button
                                onClick={() => handleCheckIn(b.id)}
                                disabled={isLoading}
                                className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {isLoading ? '…' : 'Check In'}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
