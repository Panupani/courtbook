import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import MonthSelector from '@/components/farm/MonthSelector'
import DeleteButton from '@/components/farm/DeleteButton'
import { formatTHB, formatDate, THAI_MONTHS, type FarmTransaction } from '@/lib/farm-types'

export const metadata = { title: 'ประวัติรายการ — ฟาร์มเห็ด' }

interface Props {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function HistoryPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const now    = new Date()
  const month  = parseInt(params.month ?? String(now.getMonth() + 1))
  const year   = parseInt(params.year  ?? String(now.getFullYear()))

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay   = new Date(year, month, 0).getDate()
  const endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: transactions = [] } = await supabase
    .from('farm_transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: false })
    .order('created_at',       { ascending: false })

  const list = (transactions ?? []) as FarmTransaction[]

  const totalIncome  = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netProfit    = totalIncome - totalExpense

  // Group by date
  const grouped = list.reduce<Record<string, FarmTransaction[]>>((acc, t) => {
    acc[t.transaction_date] = acc[t.transaction_date] ?? []
    acc[t.transaction_date].push(t)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <Suspense>
        <MonthSelector month={month} year={year} />
      </Suspense>

      {/* Month totals bar */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 mb-5 flex gap-3">
        <div className="flex-1 text-center">
          <p className="text-xs text-zinc-400 mb-0.5">รายรับ</p>
          <p className="text-base font-bold text-green-600">{formatTHB(totalIncome)}</p>
        </div>
        <div className="w-px bg-zinc-100" />
        <div className="flex-1 text-center">
          <p className="text-xs text-zinc-400 mb-0.5">รายจ่าย</p>
          <p className="text-base font-bold text-red-500">{formatTHB(totalExpense)}</p>
        </div>
        <div className="w-px bg-zinc-100" />
        <div className="flex-1 text-center">
          <p className="text-xs text-zinc-400 mb-0.5">กำไร</p>
          <p className={`text-base font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatTHB(netProfit)}
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-16 text-center">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-zinc-500 text-lg">ไม่มีรายการใน{THAI_MONTHS[month - 1]}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map(date => {
            const dayItems = grouped[date]
            const dayIncome  = dayItems.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
            const dayExpense = dayItems.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

            return (
              <div key={date} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                {/* Date header */}
                <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-b border-zinc-100">
                  <p className="font-semibold text-zinc-700">{formatDate(date)}</p>
                  <div className="flex gap-3 text-sm">
                    {dayIncome  > 0 && <span className="text-green-600 font-medium">+{formatTHB(dayIncome)}</span>}
                    {dayExpense > 0 && <span className="text-red-500 font-medium">-{formatTHB(dayExpense)}</span>}
                  </div>
                </div>

                <ul className="divide-y divide-zinc-50">
                  {dayItems.map(t => (
                    <li key={t.id} className="flex items-center gap-3 px-5 py-4">
                      <span className="text-2xl">{t.type === 'income' ? '💰' : '💸'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-800 truncate">{t.category}</p>
                        {t.description && (
                          <p className="text-sm text-zinc-400 truncate">{t.description}</p>
                        )}
                      </div>
                      <p className={`text-lg font-bold flex-shrink-0 ${
                        t.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatTHB(t.amount)}
                      </p>
                      <DeleteButton id={t.id} />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          <p className="text-center text-sm text-zinc-400 py-2">
            ทั้งหมด {list.length} รายการ
          </p>
        </div>
      )}
    </div>
  )
}
