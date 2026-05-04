export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/utils'
import type { Booking } from '@/lib/types'

type BookingWithRelations = Booking & { court: any }

interface BookingGroup {
  key: string           // group_id or booking id
  groupId: string | null
  bookings: BookingWithRelations[]
  totalPrice: number
}

function groupBookings(bookings: BookingWithRelations[]): BookingGroup[] {
  const map = new Map<string, BookingWithRelations[]>()
  for (const b of bookings) {
    const key = b.group_id ?? b.id
    map.set(key, [...(map.get(key) ?? []), b])
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    groupId: items[0].group_id,
    bookings: items,
    totalPrice: items.reduce((s, b) => s + b.total_price, 0),
  }))
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
}

function GroupRow({ group }: { group: BookingGroup }) {
  const first = group.bookings[0]
  const isMulti = group.bookings.length > 1
  const courts = [...new Set(group.bookings.map(b => b.court?.name).filter(Boolean))]
  const href = group.groupId
    ? `/bookings/group/${group.groupId}`
    : `/bookings/${first.id}`

  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-green-200 transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏸</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {courts.length > 1 ? courts.join(' + ') : courts[0] ?? 'Court'}
            </p>
            {isMulti && (
              <span className="flex-shrink-0 text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {group.bookings.length} slots
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{first.court?.venue?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(first.booking_date)}
            {isMulti
              ? ` · ${first.start_time.slice(0, 5)} – ${group.bookings.at(-1)!.end_time.slice(0, 5)}`
              : ` · ${first.start_time.slice(0, 5)} – ${first.end_time.slice(0, 5)}`}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[first.status]}`}>
          {first.status}
        </span>
        <span className="text-sm font-bold text-gray-700">{formatPrice(group.totalPrice)}</span>
      </div>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const today = new Date().toISOString().split('T')[0]

  const [upcomingRes, pastRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, court:courts(*, venue:venues(*))')
      .eq('user_id', user.id)
      .gte('booking_date', today)
      .neq('status', 'cancelled')
      .order('booking_date')
      .order('start_time'),
    supabase
      .from('bookings')
      .select('*, court:courts(*, venue:venues(*))')
      .eq('user_id', user.id)
      .lt('booking_date', today)
      .order('booking_date', { ascending: false })
      .order('start_time')
      .limit(20),
  ])

  const upcomingGroups = groupBookings((upcomingRes.data ?? []) as BookingWithRelations[])
  const pastGroups = groupBookings((pastRes.data ?? []) as BookingWithRelations[])

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="mt-1 text-gray-500">Welcome back, {profile?.full_name ?? user.email}</p>
      </div>

      {/* Upcoming */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming</h2>
        {upcomingGroups.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <span className="text-4xl block mb-3">🏸</span>
            <p className="text-gray-500">No upcoming bookings.</p>
            <Link href="/venues" className="mt-4 inline-block bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700">
              Book a Court
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingGroups.map(g => <GroupRow key={g.key} group={g} />)}
          </div>
        )}
      </section>

      {/* Past */}
      {pastGroups.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Past Bookings</h2>
          <div className="space-y-3 opacity-80">
            {pastGroups.map(g => <GroupRow key={g.key} group={g} />)}
          </div>
        </section>
      )}
    </div>
  )
}
