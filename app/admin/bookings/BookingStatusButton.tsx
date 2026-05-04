'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function BookingStatusButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleCancel = async () => {
    if (!confirm('Cancel this booking?')) return
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
    router.refresh()
  }

  return (
    <button onClick={handleCancel} className="text-red-500 hover:underline text-xs font-medium">
      Cancel
    </button>
  )
}
