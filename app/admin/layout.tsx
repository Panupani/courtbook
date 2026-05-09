export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, Building2, Grid3X3, CalendarDays,
  UserCheck, BookOpen, CreditCard, TrendingUp, Users,
  type LucideIcon,
} from '@/components/icons'
import SidebarNav from '@/components/admin/SidebarNav'

type NavLink = { href: string; label: string; Icon: LucideIcon; badge?: number }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const supabase = await createClient()

  // Fetch pending payments count scoped to admin role
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

  const sysAdminLinks: NavLink[] = [
    { href: '/admin',          label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/admin/venues',   label: 'Venues',    Icon: Building2 },
    { href: '/admin/courts',   label: 'Courts',    Icon: Grid3X3 },
    { href: '/admin/schedule', label: 'Schedule',  Icon: CalendarDays },
    { href: '/admin/checkin',  label: 'Check-in',  Icon: UserCheck },
    { href: '/admin/bookings', label: 'Bookings',  Icon: BookOpen },
    { href: '/admin/payments', label: 'Payments',  Icon: CreditCard, badge: pendingCount ?? 0 },
    { href: '/admin/revenue',  label: 'Revenue',   Icon: TrendingUp },
    { href: '/admin/staff',    label: 'Staff',     Icon: Users },
  ]

  const venueAdminLinks: NavLink[] = [
    { href: '/admin',          label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/admin/courts',   label: 'Courts',    Icon: Grid3X3 },
    { href: '/admin/schedule', label: 'Schedule',  Icon: CalendarDays },
    { href: '/admin/checkin',  label: 'Check-in',  Icon: UserCheck },
    { href: '/admin/bookings', label: 'Bookings',  Icon: BookOpen },
    { href: '/admin/payments', label: 'Payments',  Icon: CreditCard, badge: pendingCount ?? 0 },
  ]

  const navLinks = ctx.isSysAdmin ? sysAdminLinks : venueAdminLinks

  return (
    <div className="flex min-h-[calc(100vh-60px)]">
      <SidebarNav navLinks={navLinks} isSysAdmin={ctx.isSysAdmin} />

      {/* Content — add bottom padding on mobile so bottom nav doesn't cover content */}
      <div className="flex-1 bg-zinc-50 overflow-auto min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-10">
          {children}
        </div>
      </div>
    </div>
  )
}
