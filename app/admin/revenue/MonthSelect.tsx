'use client'

import { useRouter } from 'next/navigation'

interface Props {
  months: { value: string; label: string }[]
  current: string
}

export default function MonthSelect({ months, current }: Props) {
  const router = useRouter()
  return (
    <select
      value={current}
      onChange={e => router.push(`/admin/revenue?month=${e.target.value}`)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
    >
      {months.map(m => (
        <option key={m.value} value={m.value}>{m.label}</option>
      ))}
    </select>
  )
}
