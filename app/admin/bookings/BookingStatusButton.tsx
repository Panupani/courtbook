'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  id: string
  courtId: string
  bookingDate: string
  startTime: string  // HH:MM
}

export default function BookingStatusButton({ id, courtId, bookingDate, startTime }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const handleCancel = async () => {
    if (!confirm('Cancel this booking?')) return
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (error) { alert('Failed to cancel: ' + error.message); return }

    // Broadcast cancellation so slot grids update in real time
    fetch('/api/realtime/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courtId, bookingDate, startTime, status: 'cancelled' }),
    }).catch(() => {})

    router.refresh()
  }

  return (
    <button onClick={handleCancel} className="text-red-500 hover:underline text-xs font-medium">
      Cancel
    </button>
  )
}
