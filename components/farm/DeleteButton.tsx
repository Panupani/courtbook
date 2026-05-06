'use client'

import { useTransition } from 'react'
import { deleteTransaction } from '@/app/farm/actions'

export default function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('ลบรายการนี้?')) return
    startTransition(() => deleteTransaction(id))
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="p-2 text-zinc-300 hover:text-red-500 transition-colors disabled:opacity-40"
      aria-label="ลบ"
    >
      {pending ? '…' : '🗑'}
    </button>
  )
}
