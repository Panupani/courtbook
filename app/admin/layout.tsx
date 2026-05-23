export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, Building2, Grid3X3, CalendarDays,
  UserCheck, BookOpen, CreditCard, TrendingUp, Users, MapPin,
} from '@/components/icons'
import SidebarNav, { type NavLink } from '@/components/admin/SidebarNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const supabase = await createClient()

  const courtIds = ctx.isSysAdmin
    ? (await supabase.from('courts').select('id').then(r => (r.data ?? []).map((c: { id: string }) => c.id)))
    : (await supabase.from('courts').select('id')
        .in('venue_id', ctx.venueIds.length > 0 ? ctx.venueIds : ['00000000-0000-0000-0000-000000000000'])
        .then(r => (r.data ?? []).map((c: { id: string }) => c.id)))

  const { count: pendingCount } = courtIds.length > 0
    ? await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('payment_method', 'promptpay')
        .eq('payment_status', 'pending')
        .in('court_id', courtIds)
    : { count: 0 }

  // Icons are rendered here (server side) as ReactNode so they can cross
  // the RSC boundary into the SidebarNav client component safely.
  const iconCls = 'w-4 h-4 flex-shrink-0'

  const sysAdminLinks: NavLink[] = [
    { href: '/admin',          label: 'Dashboard', icon: <LayoutDashboard className={iconCls} /> },
    { href: '/admin/venues',   label: 'Venues',    icon: <Building2       className={iconCls} /> },
    { href: '/admin/zones',    label: 'Zones',     icon: <MapPin          className={iconCls} /> },
    { href: '/admin/courts',   label: 'Courts',    icon: <Grid3X3         className={iconCls} /> },
    { href: '/admin/schedule', label: 'Schedule',  icon: <CalendarDays    className={iconCls} /> },
    { href: '/admin/checkin',  label: 'Check-in',  icon: <UserCheck       className={iconCls} /> },
    { href: '/admin/bookings', label: 'Bookings',  icon: <BookOpen        className={iconCls} /> },
    { href: '/admin/payments', label: 'Payments',  icon: <CreditCard      className={iconCls} />, badge: pendingCount ?? 0 },
    { href: '/admin/revenue',  label: 'Revenue',   icon: <TrendingUp      className={iconCls} /> },
    { href: '/admin/staff',    label: 'Staff',     icon: <Users           className={iconCls} /> },
  ]

  const venueAdminLinks: NavLink[] = [
    { href: '/admin',          label: 'Dashboard', icon: <LayoutDashboard className={iconCls} /> },
    { href: '/admin/courts',   label: 'Courts',    icon: <Grid3X3         className={iconCls} /> },
    { href: '/admin/schedule', label: 'Schedule',  icon: <CalendarDays    className={iconCls} /> },
    { href: '/admin/checkin',  label: 'Check-in',  icon: <UserCheck       className={iconCls} /> },
    { href: '/admin/bookings', label: 'Bookings',  icon: <BookOpen        className={iconCls} /> },
    { href: '/admin/payments', label: 'Payments',  icon: <CreditCard      className={iconCls} />, badge: pendingCount ?? 0 },
  ]

  const navLinks = ctx.isSysAdmin ? sysAdminLinks : venueAdminLinks

  return (
    <div className="flex min-h-[calc(100vh-60px)]">
      <SidebarNav navLinks={navLinks} isSysAdmin={ctx.isSysAdmin} />

      <div className="flex-1 bg-zinc-50 overflow-auto min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-10">
          {children}
        </div>
      </div>
    </div>
  )
}
