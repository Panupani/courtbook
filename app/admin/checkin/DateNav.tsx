'use client'

import { useRouter } from 'next/navigation'

export default function DateNav({ date }: { date: string }) {
  const router = useRouter()
  return (
    <input
      type="date"
      value={date}
      onChange={e => router.push(`/admin/checkin?date=${e.target.value}`)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
    />
  )
}
