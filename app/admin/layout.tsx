export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminContext } from '@/lib/admin'
import { createClient } from '@/lib/supabase/server'
import {
  LayoutDashboard, Building2, Grid3X3, CalendarDays,
  UserCheck, BookOpen, CreditCard, TrendingUp, Users,
  ChevronLeft, type LucideIcon,
} from '@/components/icons'

type NavLink = { href: string; label: string; Icon: LucideIcon; badge?: number }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const supabase = await createClient()
  const { count: pendingCount } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('payment_method', 'promptpay')
    .eq('payment_status', 'pending')
    .in('court_id',
      ctx.isSysAdmin
        ? (await supabase.from('courts').select('id').then(r => (r.data ?? []).map((c: { id: string }) => c.id)))
        : (await supabase.from('courts').select('id').in('venue_id', ctx.venueIds.length > 0 ? ctx.venueIds : ['00000000-0000-0000-0000-000000000000']).then(r => (r.data ?? []).map((c: { id: string }) => c.id)))
    )

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
      {/* Sidebar */}
      <aside className="bg-zinc-950 text-zinc-400 flex-shrink-0 hidden md:flex flex-col" style={{ width: '220px' }}>
        {/* Role badge */}
        <div className="px-5 py-5 border-b border-zinc-800/60">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Admin Panel</p>
          <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${
            ctx.isSysAdmin
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
              : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${ctx.isSysAdmin ? 'bg-purple-400' : 'bg-blue-400'}`} />
            {ctx.isSysAdmin ? 'System Admin' : 'Venue Admin'}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navLinks.map(({ href, label, Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all"
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                  {badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        {/* Back to site */}
        <div className="px-3 py-4 border-t border-zinc-800/60">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to site
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex z-40 px-1 py-1">
        {navLinks.slice(0, 5).map(({ href, label, Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center py-2 text-zinc-500 hover:text-white text-[10px] gap-1 relative transition-colors"
          >
            <Icon className="w-5 h-5" />
            <span className="truncate w-full text-center leading-none">{label}</span>
            {badge ? (
              <span className="absolute top-1 right-1 bg-amber-400 text-amber-950 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 bg-zinc-50 overflow-auto min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-10">
          {children}
        </div>
      </div>
    </div>
  )
}
