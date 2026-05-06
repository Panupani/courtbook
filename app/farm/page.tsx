import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import MonthSelector from '@/components/farm/MonthSelector'
import DeleteButton from '@/components/farm/DeleteButton'
import { formatTHB, formatDate, type FarmTransaction } from '@/lib/farm-types'

interface Props {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function FarmDashboard({ searchParams }: Props) {
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

  const recent = list.slice(0, 8)

  return (
    <div>
      <Suspense>
        <MonthSelector month={month} year={year} />
      </Suspense>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 mb-6">
        {/* Income */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 mb-1">💰 รายรับ</p>
          <p className="text-3xl font-bold text-green-600">{formatTHB(totalIncome)}</p>
        </div>

        {/* Expense */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm">
          <p className="text-sm font-medium text-zinc-500 mb-1">💸 รายจ่าย</p>
          <p className="text-3xl font-bold text-red-500">{formatTHB(totalExpense)}</p>
        </div>

        {/* Net */}
        <div className={`rounded-2xl p-5 border shadow-sm ${
          netProfit >= 0
            ? 'bg-green-600 border-green-600'
            : 'bg-red-500 border-red-500'
        }`}>
          <p className="text-sm font-medium text-white/80 mb-1">📈 กำไร / ขาดทุน</p>
          <p className="text-3xl font-bold text-white">{formatTHB(netProfit)}</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <p className="font-bold text-zinc-900">รายการล่าสุด</p>
          {list.length > 8 && (
            <Link href={`/farm/history?month=${month}&year=${year}`} className="text-sm text-green-600 font-medium">
              ดูทั้งหมด →
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-zinc-500">ยังไม่มีรายการในเดือนนี้</p>
            <Link href="/farm/add" className="mt-4 inline-block text-green-600 font-semibold text-sm">
              + บันทึกรายการแรก
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-50">
            {recent.map(t => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-4">
                <span className="text-2xl">{t.type === 'income' ? '💰' : '💸'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-800 truncate">{t.category}</p>
                  <p className="text-sm text-zinc-400">{formatDate(t.transaction_date)}{t.description ? ` · ${t.description}` : ''}</p>
                </div>
                <p className={`text-lg font-bold flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatTHB(t.amount)}
                </p>
                <DeleteButton id={t.id} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB — add */}
      <Link
        href="/farm/add"
        className="fixed bottom-6 right-6 w-16 h-16 bg-green-600 hover:bg-green-700 text-white rounded-full flex items-center justify-center text-3xl shadow-xl transition-colors"
        aria-label="บันทึกรายการ"
      >
        +
      </Link>
    </div>
  )
}
