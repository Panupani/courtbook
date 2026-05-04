'use client'

import { useRouter } from 'next/navigation'

export default function DeleteCourtButton({ id }: { id: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Delete this court?')) return
    const res = await fetch('/api/admin/courts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      alert(error ?? 'Failed to delete court')
      return
    }
    router.refresh()
  }

  return (
    <button onClick={handleDelete} className="text-red-500 hover:underline text-xs font-medium">
      Delete
    </button>
  )
}
