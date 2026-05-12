'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import type { Court, OperatingHours, Booking, TimeSlot, Venue } from '@/lib/types'
import { generateSlots, formatPrice, formatDate, promptPayPayload } from '@/lib/utils'

type Step = 'select' | 'checkout'

interface CartItem {
  courtId: string
  courtName: string
  slot: TimeSlot
}

// Minimal shape returned by the /api/bookings/slots endpoint
interface SlotBooking {
  court_id: string
  booking_date: string
  start_time: string
  status: string
}

type SlotMeta = TimeSlot & { isPendingPayment: boolean }

interface Props {
  venue: Venue
  courts: Court[]
  hoursByCourt: Record<string, OperatingHours[]>
  bookingsByCourt: Record<string, Booking[]>
  userId: string | null
  existingGroupId?: string
}

function getNextDays(n: number): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date().toISOString().split('T')[0]
  return {
    day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date: d.getDate().toString(),
    isToday: dateStr === today,
  }
}

export default function VenueBookingGrid({
  venue,
  courts,
  hoursByCourt,
  bookingsByCourt,
  userId,
  existingGroupId,
}: Props) {
  const router = useRouter()
  const days = useMemo(() => getNextDays(14), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live bookings — initialised from SSR prop, refreshed every 15 s
  const courtIds = useMemo(() => courts.map(c => c.id), [courts])
  const [liveBookings, setLiveBookings] = useState<Record<string, SlotBooking[]>>(() => {
    const m: Record<string, SlotBooking[]> = {}
    for (const c of courts) {
      m[c.id] = (bookingsByCourt[c.id] ?? []).map(b => ({
        court_id: b.court_id,
        booking_date: b.booking_date,
        start_time: b.start_time,
        status: b.status,
      }))
    }
    return m
  })
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Poll slot availability every 15 seconds
  useEffect(() => {
    if (courtIds.length === 0) return

    const fetchSlots = async () => {
      setIsRefreshing(true)
      try {
        const res = await fetch(`/api/bookings/slots?courtIds=${courtIds.join(',')}`)
        if (!res.ok) return
        const { bookings: fresh } = await res.json() as { bookings: SlotBooking[] }
        const byCourtId: Record<string, SlotBooking[]> = {}
        for (const c of courts) {
          byCourtId[c.id] = fresh.filter(b => b.court_id === c.id)
        }
        setLiveBookings(byCourtId)
        setLastRefreshed(new Date())
      } catch {
        // silently ignore — stale data is fine
      } finally {
        setIsRefreshing(false)
      }
    }

    const id = setInterval(fetchSlots, 15_000)
    return () => clearInterval(id)
  }, [courtIds, courts])

  // Slot selection
  const [selectedDate, setSelectedDate] = useState(days[0])
  const [cart, setCart] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')

  // Checkout / payment
  const [step, setStep] = useState<Step>('select')
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // 5-minute countdown timer (starts when entering checkout)
  const TIMER_SECONDS = 5 * 60
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (step !== 'checkout') {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimeLeft(TIMER_SECONDS)
      return
    }
    setTimeLeft(TIMER_SECONDS)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step])

  const timerMins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const timerSecs = String(timeLeft % 60).padStart(2, '0')
  const timerExpired = timeLeft === 0
  const timerUrgent  = timeLeft <= 60   // last 60 s → red
  const timerWarning = timeLeft <= 120  // last 2 min → amber

  // After booking creation: poll Gemini verification
  const [pendingIds, setPendingIds]       = useState<string[] | null>(null)
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null)
  const [verifyStatus, setVerifyStatus]   = useState<string>('')
  const [pollCount, setPollCount]         = useState(0)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start / stop polling when pendingIds changes
  useEffect(() => {
    if (!pendingIds || pendingIds.length === 0 || !slipPreview) return

    let attempts = 0
    const MAX_ATTEMPTS = 10

    const poll = async () => {
      attempts++
      setVerifyStatus(`Verifying payment… (${attempts}/${MAX_ATTEMPTS})`)
      try {
        const res = await fetch('/api/bookings/run-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: pendingIds, slipImage: slipPreview, expectedAmount: cartTotal }),
        })
        const data = await res.json()

        if (data.confirmed) {
          clearInterval(pollIntervalRef.current!)
          // Navigate to confirmation
          if (pendingIds.length === 1 && !existingGroupId) {
            router.push(`/bookings/${pendingIds[0]}`)
          } else {
            router.push(`/bookings/group/${pendingGroupId}`)
          }
          return
        }

        if (!data.retry) {
          // AI definitively rejected — stop polling, show error
          clearInterval(pollIntervalRef.current!)
          setVerifying(false)
          setPendingIds(null)
          setVerifyError(`Slip not accepted: ${data.reason}. Please check the amount or upload a clearer image.`)
          return
        }

        // data.retry = true → transient failure, keep polling
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollIntervalRef.current!)
          // Give up — booking stays pending, admin will review manually
          if (pendingIds.length === 1 && !existingGroupId) {
            router.push(`/bookings/${pendingIds[0]}`)
          } else {
            router.push(`/bookings/group/${pendingGroupId}`)
          }
        }
      } catch {
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollIntervalRef.current!)
          if (pendingIds.length === 1 && !existingGroupId) {
            router.push(`/bookings/${pendingIds[0]}`)
          } else {
            router.push(`/bookings/group/${pendingGroupId}`)
          }
        }
      }
      setPollCount(c => c + 1)
    }

    // First attempt immediately, then every 4 seconds
    poll()
    pollIntervalRef.current = setInterval(poll, 4000)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingIds])

  const promptPayId = venue.promptpay_id || (process.env.NEXT_PUBLIC_PROMPTPAY_ID ?? '')
  const promptPayName = venue.name || 'VENUE'

  const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()

  const slotsByCourt = useMemo(() => {
    const result: Record<string, SlotMeta[]> = {}
    for (const court of courts) {
      const hours = hoursByCourt[court.id] ?? []
      const dayHours = hours.find(h => h.day_of_week === dayOfWeek)
      if (!dayHours) { result[court.id] = []; continue }
      const slots = generateSlots(dayHours, court.hourly_rate)
      const existing = liveBookings[court.id] ?? []
      result[court.id] = slots.map(slot => {
        const blocker = existing.find(
          b => b.booking_date === selectedDate &&
               b.start_time.slice(0, 5) === slot.start &&
               b.status !== 'cancelled'
        )
        return {
          ...slot,
          available: !blocker,
          isPendingPayment: !!blocker && blocker.status === 'pending',
        }
      })
    }
    return result
  }, [courts, hoursByCourt, liveBookings, selectedDate, dayOfWeek])

  const toggleSlot = useCallback((court: Court, slot: TimeSlot) => {
    if (!slot.available) return
    setCart(prev => {
      const exists = prev.find(i => i.courtId === court.id && i.slot.start === slot.start)
      if (exists) return prev.filter(i => !(i.courtId === court.id && i.slot.start === slot.start))
      return [...prev, { courtId: court.id, courtName: court.name, slot }]
    })
  }, [])

  const isInCart = (courtId: string, slot: TimeSlot) =>
    cart.some(i => i.courtId === courtId && i.slot.start === slot.start)

  const cartTotal = cart.reduce((s, i) => s + i.slot.price, 0)

  const qrPayload = useMemo(() => {
    if (!promptPayId || cartTotal <= 0) return null
    return promptPayPayload(promptPayId, cartTotal)
  }, [promptPayId, cartTotal])

  const cartByCourt = useMemo(() => {
    const map = new Map<string, CartItem[]>()
    for (const item of cart) {
      const arr = map.get(item.courtId) ?? []
      arr.push(item)
      map.set(item.courtId, arr)
    }
    for (const [, items] of map) items.sort((a, b) => a.slot.start.localeCompare(b.slot.start))
    return map
  }, [cart])

  function proceedToCheckout() {
    if (!userId) { router.push('/login'); return }
    if (cart.length === 0) return
    setVerifyError(null)
    setSlipFile(null)
    setSlipPreview(null)
    setStep('checkout')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSlipFile(file)
    setVerifyError(null)
    const reader = new FileReader()
    reader.onload = ev => setSlipPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleVerify() {
    if (!slipPreview) { setVerifyError('Please upload your payment slip first'); return }
    setVerifying(true)
    setVerifyError(null)
    setVerifyStatus(timerExpired ? 'Submitting for manual review…' : 'Saving booking…')

    try {
      const groupId = existingGroupId ?? crypto.randomUUID()
      const rows = cart.map(item => ({
        user_id: userId,
        court_id: item.courtId,
        booking_date: selectedDate,
        start_time: item.slot.start,
        end_time: item.slot.end,
        total_price: item.slot.price,
        status: 'pending',
        notes: notes || null,
        group_id: groupId,
      }))

      const res = await fetch('/api/bookings/verify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookings: rows, slipImage: slipPreview, expectedAmount: cartTotal }),
      })

      const data = await res.json()

      if (!res.ok) {
        setVerifyError(data.error ?? 'Booking failed. Please try again.')
        setVerifying(false)
        return
      }

      // Refresh slots immediately so the just-created pending booking is visible to others
      try {
        const slotsRes = await fetch(`/api/bookings/slots?courtIds=${courtIds.join(',')}`)
        if (slotsRes.ok) {
          const { bookings: fresh } = await slotsRes.json() as { bookings: SlotBooking[] }
          const byCourtId: Record<string, SlotBooking[]> = {}
          for (const c of courts) {
            byCourtId[c.id] = fresh.filter(b => b.court_id === c.id)
          }
          setLiveBookings(byCourtId)
        }
      } catch { /* best-effort */ }

      // Always go through Gemini verification regardless of timer state
      setPendingGroupId(groupId)
      setPendingIds(data.ids)
      setVerifyStatus('Verifying payment…')
    } catch {
      setVerifyError('Network error. Please try again.')
      setVerifying(false)
    }
  }

  // ── CHECKOUT STEP ────────────────────────────────────────────────────
  if (step === 'checkout') {
    const qrPayload = promptPayId ? promptPayPayload(promptPayId, cartTotal) : null

    return (
      <div className="max-w-md mx-auto pb-16">
        <button
          onClick={() => { setStep('select'); setVerifyError(null) }}
          className="mb-6 text-sm text-gray-500 hover:text-green-600 flex items-center gap-1"
        >
          ← Edit slots
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payment</h1>

          {/* ── Countdown timer ── */}
          {timerExpired ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-2 rounded-xl">
              <span className="text-base">⏱</span>
              <span>Slot hold ended</span>
            </div>
          ) : (
            <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
              timerUrgent
                ? 'bg-red-50 border-red-200 text-red-700'
                : timerWarning
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <span className={`text-base ${timerUrgent ? 'animate-pulse' : ''}`}>⏱</span>
              <span className="font-mono text-base">{timerMins}:{timerSecs}</span>
            </div>
          )}
        </div>

        {/* Expired notice — slot still held, just remind them to upload */}
        {timerExpired && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <p className="text-amber-800 font-semibold text-sm">⏱ Slot hold expired</p>
            <p className="text-amber-700 text-xs mt-1">
              Your slot reservation has ended. Upload your payment slip now — it will still be verified automatically.
            </p>
          </div>
        )}

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-gray-200 mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900">Order Summary</p>
            <p className="text-xs text-gray-400 mt-0.5">{venue.name} · {formatDate(selectedDate)}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {Array.from(cartByCourt.entries()).map(([courtId, items]) => (
              <div key={courtId} className="px-5 py-3">
                <p className="text-sm font-semibold text-gray-800 mb-1.5">{items[0].courtName}</p>
                {items.map(item => (
                  <div key={item.slot.start} className="flex justify-between text-sm text-gray-600 py-0.5">
                    <span className="flex items-center gap-1.5">
                      {item.slot.isPeak && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1 rounded">PEAK</span>
                      )}
                      {item.slot.start} – {item.slot.end}
                    </span>
                    <span className="font-medium">{formatPrice(item.slot.price)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-green-50 flex justify-between font-bold">
            <span className="text-gray-700">Total Due</span>
            <span className="text-green-700 text-xl">{formatPrice(cartTotal)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. need extra shuttlecocks"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* PromptPay QR */}
        <div className="bg-white rounded-2xl border border-gray-200 mb-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-lg">📱</span>
            <p className="font-semibold text-gray-900">Pay via PromptPay</p>
          </div>
          <div className="p-6 flex flex-col items-center">
            {qrPayload ? (
              <>
                <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-sm mb-4">
                  <QRCodeSVG
                    value={qrPayload}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-sm font-semibold text-gray-800">{promptPayName}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ID: {promptPayId.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}
                </p>
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-500">PromptPay ID not configured.</p>
                <p className="text-xs text-gray-400 mt-1">Set <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_PROMPTPAY_ID</code> in .env.local</p>
              </div>
            )}
            <div className="mt-4 w-full bg-green-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-500">Transfer exactly</p>
              <p className="text-2xl font-bold text-green-700">{formatPrice(cartTotal)}</p>
            </div>
          </div>
          <div className="px-5 pb-5 space-y-2 text-xs text-gray-500">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-green-600 font-bold">1.</span>
              <span>Open any banking app and scan the QR code above.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-green-600 font-bold">2.</span>
              <span>Transfer exactly <strong>{formatPrice(cartTotal)}</strong>.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-green-600 font-bold">3.</span>
              <span>Take a screenshot of the transfer slip and upload it below.</span>
            </div>
          </div>
        </div>

        {/* Slip upload */}
        <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-semibold text-gray-900">Upload Payment Slip</p>
            <p className="text-xs text-gray-400 mt-0.5">Upload the transfer receipt from your banking app</p>
          </div>
          <div className="p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {slipPreview ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={slipPreview} alt="Payment slip" className="w-full max-h-72 object-contain bg-gray-50" />
                  <button
                    onClick={() => { setSlipFile(null); setSlipPreview(null); setVerifyError(null) }}
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-600 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow"
                  >
                    ✕
                  </button>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-sm text-gray-500 hover:text-green-600 underline"
                >
                  Change slip
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-green-400 rounded-xl py-10 flex flex-col items-center gap-2 transition-colors text-gray-400 hover:text-green-600"
              >
                <span className="text-3xl">📎</span>
                <span className="text-sm font-medium">Tap to upload slip</span>
                <span className="text-xs">JPG, PNG or WebP</span>
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {verifyError && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{verifyError}</span>
          </div>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={verifying || !slipPreview}
          className="w-full font-bold py-4 rounded-2xl transition-colors disabled:opacity-50 text-base flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          {verifying ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {verifyStatus || 'Verifying slip…'}
            </>
          ) : (
            '✓ Verify & Confirm Booking'
          )}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">
          Your slip is verified using AI. Booking is confirmed instantly on success.
        </p>
      </div>
    )
  }

  // ── SLOT SELECTION STEP ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Select a date and tap slots to add to your booking</p>
      </div>

      {/* Date strip */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {days.map(d => {
          const { day, date, isToday } = shortDate(d)
          const active = d === selectedDate
          return (
            <button
              key={d}
              onClick={() => { setSelectedDate(d); setCart([]) }}
              className={`flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                active
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${active ? 'text-green-200' : 'text-gray-400'}`}>
                {isToday ? 'Today' : day}
              </span>
              <span className="text-lg font-bold leading-none mt-0.5">{date}</span>
            </button>
          )
        })}
      </div>

      {/* Court slot grids */}
      <div className="space-y-4 mb-36">
        {courts.map(court => {
          const slots = slotsByCourt[court.id] ?? []
          const hasPeak = slots.some(s => s.isPeak)
          const selectedCount = cart.filter(i => i.courtId === court.id).length
          return (
            <div key={court.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{court.name}</span>
                  <span className="text-xs text-gray-400">{formatPrice(court.hourly_rate)}/hr</span>
                  {hasPeak && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 font-semibold px-1.5 py-0.5 rounded-full">
                      peak pricing
                    </span>
                  )}
                </div>
                {selectedCount > 0 && (
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    {selectedCount} selected
                  </span>
                )}
              </div>

              {slots.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">Closed on this day</p>
              ) : (
                <div className="flex flex-wrap gap-2 px-4 py-4">
                  {slots.map(slot => {
                    const inCart = isInCart(court.id, slot)
                    const unavailable = !slot.available
                    const isPendingSlot = unavailable && slot.isPendingPayment
                    return (
                      <button
                        key={slot.start}
                        disabled={unavailable}
                        onClick={() => toggleSlot(court, slot)}
                        title={isPendingSlot ? 'Payment in progress — slot reserved' : undefined}
                        className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                          unavailable
                            ? isPendingSlot
                              ? 'bg-amber-50 text-amber-400 border-amber-200 cursor-not-allowed'
                              : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                            : inCart
                            ? slot.isPeak
                              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                              : 'bg-green-600 text-white border-green-600 shadow-sm'
                            : slot.isPeak
                            ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:bg-green-50'
                        }`}
                      >
                        <span>{slot.start}</span>
                        <span className={`text-[10px] mt-0.5 ${
                          inCart ? 'text-white/80'
                            : isPendingSlot ? 'text-amber-400'
                            : slot.isPeak ? 'text-orange-500'
                            : 'text-gray-400'
                        }`}>
                          {isPendingSlot ? '⏳' : formatPrice(slot.price)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        {cart.length > 0 ? (
          <div className="bg-white border-t border-gray-200 shadow-2xl px-4 pt-3 pb-6 max-w-7xl mx-auto w-full">
            <div className="mb-3 max-h-28 overflow-y-auto space-y-1">
              {Array.from(cartByCourt.entries()).map(([courtId, items]) => (
                <div key={courtId} className="flex items-start gap-2 text-sm">
                  <span className="font-semibold text-gray-700 w-24 flex-shrink-0 truncate">{items[0].courtName}</span>
                  <div className="flex flex-wrap gap-1 flex-1">
                    {items.map(item => (
                      <span
                        key={item.slot.start}
                        onClick={() => toggleSlot(courts.find(c => c.id === courtId)!, item.slot)}
                        className={`cursor-pointer inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.slot.isPeak ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {item.slot.start}–{item.slot.end}
                        <span className="text-[10px] opacity-60">✕</span>
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {formatPrice(items.reduce((s, i) => s + i.slot.price, 0))}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-400">{cart.length} slot{cart.length > 1 ? 's' : ''} · {formatDate(selectedDate)}</p>
                <p className="text-xl font-bold text-gray-900">{formatPrice(cartTotal)}</p>
              </div>
              <button
                onClick={proceedToCheckout}
                className="flex-shrink-0 bg-green-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-700 transition-colors"
              >
                Proceed to Payment →
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between gap-4 text-xs text-gray-400 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block"/>Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block"/>Peak</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block"/>Pending payment</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-100 inline-block"/>Booked</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-600 inline-block"/>Selected</span>
            </div>
            <div className={`flex items-center gap-1.5 flex-shrink-0 transition-colors ${isRefreshing ? 'text-green-500' : 'text-gray-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'} inline-block`} />
              <span>Live</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
