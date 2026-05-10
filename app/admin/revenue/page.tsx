export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import MonthSelect from './MonthSelect'

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const ctx = await getAdminContext()
  if (!ctx || !ctx.isSysAdmin) redirect('/admin')

  const { month: qMonth } = await searchParams
  const now = new Date()
  const month = qMonth ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, mon] = month.split('-').map(Number)
  const fromDate = `${month}-01`
  const toDate = new Date(year, mon, 0).toISOString().split('T')[0] // last day of month

  const supabase = await createClient()

  // All bookings in range (confirmed, not cancelled)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('total_price, platform_fee_amount, court:courts(venue_id, venue:venues(id, name, platform_fee_rate))')
    .gte('booking_date', fromDate)
    .lte('booking_date', toDate)
    .eq('status', 'confirmed')

  // Aggregate by venue
  const venueMap = new Map<string, {
    name: string
    feeRate: number
    gross: number
    fee: number
    count: number
  }>()

  for (const b of (bookings ?? []) as any[]) {
    const venue = b.court?.venue
    if (!venue) continue
    const existing = venueMap.get(venue.id) ?? {
      name: venue.name,
      feeRate: venue.platform_fee_rate ?? 0.05,
      gross: 0, fee: 0, count: 0,
    }
    existing.gross += b.total_price ?? 0
    existing.fee   += b.platform_fee_amount ?? 0
    existing.count += 1
    venueMap.set(venue.id, existing)
  }

  const rows = Array.from(venueMap.values()).sort((a, b) => b.gross - a.gross)
  const totalGross = rows.reduce((s, r) => s + r.gross, 0)
  const totalFee   = rows.reduce((s, r) => s + r.fee, 0)
  const totalNet   = totalGross - totalFee

  // Build month options (last 12 months)
  const months: { value: string; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push({
      value: val,
      label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform fee earnings across all venues</p>
        </div>
        <MonthSelect months={months} current={month} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Gross Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(totalGross)}</p>
          <p className="text-xs text-gray-400 mt-1">All venues combined</p>
        </div>
        <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5">
          <p className="text-xs text-purple-600 mb-1">Platform Fees Earned</p>
          <p className="text-2xl font-bold text-purple-700">{formatPrice(totalFee)}</p>
          <p className="text-xs text-purple-400 mt-1">Your 10% commission</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Net to Venues</p>
          <p className="text-2xl font-bold text-gray-900">{formatPrice(totalNet)}</p>
          <p className="text-xs text-gray-400 mt-1">After platform fee deduction</p>
        </div>
      </div>

      {/* Per-venue breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Breakdown by Venue</h2>
        </div>

        {rows.length === 0 ? (
          <p className="p-10 text-center text-gray-400">No confirmed bookings this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Venue</th>
                <th className="px-5 py-3 text-right">Bookings</th>
                <th className="px-5 py-3 text-right">Gross Revenue</th>
                <th className="px-5 py-3 text-right">Fee Rate</th>
                <th className="px-5 py-3 text-right">Platform Fee</th>
                <th className="px-5 py-3 text-right">Net to Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">🏢 {r.name}</td>
                  <td className="px-5 py-4 text-right text-gray-500">{r.count}</td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-900">{formatPrice(r.gross)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                      {Math.round(r.feeRate * 100)}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-purple-700">{formatPrice(r.fee)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-green-700">{formatPrice(r.gross - r.fee)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-5 py-3 font-bold text-gray-900">Total</td>
                <td className="px-5 py-3 text-right font-bold text-gray-900">
                  {rows.reduce((s, r) => s + r.count, 0)}
                </td>
                <td className="px-5 py-3 text-right font-bold text-gray-900">{formatPrice(totalGross)}</td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-right font-bold text-purple-700">{formatPrice(totalFee)}</td>
                <td className="px-5 py-3 text-right font-bold text-green-700">{formatPrice(totalNet)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
