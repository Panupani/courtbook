'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/farm',         label: '📊 สรุป',       match: (p: string) => p === '/farm' },
  { href: '/farm/add',     label: '➕ บันทึก',     match: (p: string) => p === '/farm/add' },
  { href: '/farm/history', label: '📋 ประวัติ',    match: (p: string) => p.startsWith('/farm/history') },
]

export default function FarmNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map(tab => {
        const active = tab.match(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 text-center py-3 rounded-xl text-base font-semibold transition-all ${
              active
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-green-50 hover:border-green-200'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
