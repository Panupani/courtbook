'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from '@/components/icons'
import { ChevronLeft, MoreHorizontal } from '@/components/icons'
import { useState } from 'react'

export type NavLink = { href: string; label: string; Icon: LucideIcon; badge?: number }

interface Props {
  navLinks: NavLink[]
  isSysAdmin: boolean
}

export default function SidebarNav({ navLinks, isSysAdmin }: Props) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  const mobileVisible = navLinks.slice(0, 4)
  const mobileMore    = navLinks.slice(4)

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="bg-zinc-950 text-zinc-400 flex-shrink-0 hidden md:flex flex-col w-[220px]">
        {/* Role badge */}
        <div className="px-5 py-5 border-b border-zinc-800/60">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Admin Panel</p>
          <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${
            isSysAdmin
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
              : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSysAdmin ? 'bg-purple-400' : 'bg-blue-400'}`} />
            {isSysAdmin ? 'System Admin' : 'Venue Admin'}
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navLinks.map(({ href, label, Icon, badge }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {badge ? (
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                    {badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Back to site */}
        <div className="px-3 py-4 border-t border-zinc-800/60">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Back to site
          </Link>
        </div>
      </aside>

      {/* ── Mobile bottom nav ───────────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex z-40 px-1 py-1">
        {mobileVisible.map(({ href, label, Icon, badge }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2 text-[10px] gap-1 relative transition-colors ${
                active ? 'text-white' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate w-full text-center leading-none">{label}</span>
              {badge ? (
                <span className="absolute top-1 right-1 bg-amber-400 text-amber-950 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {badge}
                </span>
              ) : null}
            </Link>
          )
        })}

        {/* "More" overflow button for extra nav items */}
        {mobileMore.length > 0 && (
          <div className="relative flex-1">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="w-full flex flex-col items-center py-2 text-[10px] gap-1 text-zinc-500 hover:text-white transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
              <span>More</span>
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div className="absolute bottom-full right-0 mb-1 bg-zinc-900 border border-zinc-700 rounded-xl py-1.5 min-w-[160px] z-50 shadow-xl">
                  {mobileMore.map(({ href, label, Icon, badge }) => {
                    const active = isActive(href)
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          active ? 'text-white bg-white/10' : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                        {badge ? (
                          <span className="ml-auto bg-amber-400 text-amber-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
