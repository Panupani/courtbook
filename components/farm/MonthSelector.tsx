'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { THAI_MONTHS } from '@/lib/farm-types'

interface Props {
  month: number
  year: number
}

export default function MonthSelector({ month, year }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(newMonth: number, newYear: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', String(newMonth))
    params.set('year', String(newYear))
    router.push(`?${params.toString()}`)
  }

  function prev() {
    if (month === 1) navigate(12, year - 1)
    else navigate(month - 1, year)
  }

  function next() {
    const now = new Date()
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return
    if (month === 12) navigate(1, year + 1)
    else navigate(month + 1, year)
  }

  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-xl px-4 py-3 mb-5">
      <button
        onClick={prev}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-600 text-xl transition-colors"
        aria-label="เดือนก่อน"
      >
        ‹
      </button>

      <div className="text-center">
        <p className="text-lg font-bold text-zinc-900">{THAI_MONTHS[month - 1]}</p>
        <p className="text-sm text-zinc-400">{year + 543}</p>
      </div>

      <button
        onClick={next}
        disabled={isCurrentMonth}
        className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl transition-colors ${
          isCurrentMonth
            ? 'text-zinc-300 cursor-not-allowed'
            : 'hover:bg-zinc-100 text-zinc-600'
        }`}
        aria-label="เดือนถัดไป"
      >
        ›
      </button>
    </div>
  )
}
