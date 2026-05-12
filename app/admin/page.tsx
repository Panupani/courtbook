export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import { formatPrice } from '@/lib/utils'
import AutoRefresh from '@/components/AutoRefresh'

export default async function AdminDashboard() {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // For venue admin, get their court IDs first
  let courtIds: string[] | null = null
  if (!ctx.isSysAdmin) {
    const { data } = await supabase
      .from('courts')
      .select('id')
      .in('venue_id', ctx.venueIds)
    courtIds = (data ?? []).map((c: { id: string }) => c.id)
  }

  function scopeBookings(q: any) {
    return courtIds ? q.in('court_id', courtIds) : q
  }

  const [venuesRes, courtsRes, totalRes, todayRes, revenueRes] = await Promise.all([
    ctx.isSysAdmin
      ? supabase.from('venues').select('id', { count: 'exact', head: true })
      : supabase.from('venues').select('id', { count: 'exact', head: true }).in('id', ctx.venueIds),
    ctx.isSysAdmin
      ? supabase.from('courts').select('id', { count: 'exact', head: true })
      : supabase.from('courts').select('id', { count: 'exact', head: true }).in('venue_id', ctx.venueIds),
    scopeBookings(supabase.from('bookings').select('id', { count: 'exact', head: true }).neq('status', 'cancelled')),
    scopeBookings(supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('booking_date', today).neq('status', 'cancelled')),
    scopeBookings(supabase.from('bookings').select('total_price, platform_fee_amount').eq('status', 'confirmed')),
  ])

  const totalRevenue  = (revenueRes.data ?? []).reduce((s: number, b: any) => s + (b.total_price ?? 0), 0)
  const totalFee      = (revenueRes.data ?? []).reduce((s: number, b: any) => s + (b.platform_fee_amount ?? 0), 0)
  const netRevenue    = totalRevenue - totalFee

  const { data: recentBookings } = await scopeBookings(
    supabase
      .from('bookings')
      .select('*, court:courts(name, venue:venues(name))')
      .order('created_at', { ascending: false })
      .limit(5)
  )

  const statCards = [
    ...(ctx.isSysAdmin ? [{ label: 'Total Venues', value: venuesRes.count ?? 0, icon: '🏢', href: '/admin/venues' }] : []),
    { label: ctx.isSysAdmin ? 'Total Courts' : 'Your Courts', value: courtsRes.count ?? 0, icon: '🏸', href: '/admin/courts' },
    { label: "Today's Bookings", value: todayRes.count ?? 0, icon: '📅', href: '/admin/bookings' },
    { label: 'Total Bookings', value: totalRes.count ?? 0, icon: '📋', href: '/admin/bookings' },
    // System admin sees platform fee earned; venue admin sees net revenue
    ...(ctx.isSysAdmin
      ? [
          { label: 'Gross Revenue', value: formatPrice(totalRevenue), icon: '💵', href: '/admin/revenue' },
          { label: 'Platform Fees', value: formatPrice(totalFee), icon: '💰', href: '/admin/revenue' },
        ]
      : [
          { label: 'Gross Revenue', value: formatPrice(totalRevenue), icon: '💵', href: '/admin/bookings' },
          { label: 'Net Revenue', value: formatPrice(netRevenue), icon: '💰', href: '/admin/bookings' },
        ]
    ),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <AutoRefresh intervalMs={20_000} />
      </div>
      {!ctx.isSysAdmin && (
        <p className="text-sm text-gray-500 mb-6">Showing data for your assigned venue{ctx.venueIds.length > 1 ? 's' : ''} only.</p>
      )}
      {ctx.isSysAdmin && <div className="mb-8" />}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        {statCards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-sm hover:border-green-200 transition-all"
          >
            <div className="text-2xl mb-2">{card.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Recent Bookings</h2>
          <Link href="/admin/bookings" className="text-sm text-green-600 hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-gray-100">
          {!recentBookings || recentBookings.length === 0 ? (
            <p className="p-6 text-gray-400 text-sm">No bookings yet.</p>
          ) : recentBookings.map((b: any) => (
            <div key={b.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{b.court?.name} · {b.court?.venue?.name}</p>
                <p className="text-xs text-gray-500">{b.booking_date} · {b.start_time} – {b.end_time}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">{formatPrice(b.total_price)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                  ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : ''}
                  ${b.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${b.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}`}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
