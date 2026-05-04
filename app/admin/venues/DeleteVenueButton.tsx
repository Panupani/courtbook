'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteVenueButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Delete this venue? This will also delete its courts and bookings.')) return
    await supabase.from('venues').delete().eq('id', id)
    router.refresh()
  }

  return (
    <button onClick={handleDelete} className="text-red-500 hover:underline text-xs font-medium">
      Delete
    </button>
  )
}
