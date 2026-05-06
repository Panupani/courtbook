'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { ShuttlecockIcon, Menu, X, ChevronDown, BookOpen, Settings, LogOut } from '@/components/icons'

export default function Navbar() {
  const [user, setUser]         = useState<User | null>(null)
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'venue_admin'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => setProfile(data))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setProfile(null)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${
      scrolled
        ? 'bg-white/90 backdrop-blur-md border-b border-zinc-200/80 shadow-sm'
        : 'bg-white border-b border-zinc-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between" style={{ height: '60px' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white group-hover:bg-green-700 transition-colors shadow-sm">
              <ShuttlecockIcon className="w-4 h-4" />
            </div>
            <span className="font-bold text-[17px] tracking-tight text-zinc-900">
              Badm<span className="text-green-600">into</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/venues" current={pathname}>Venues</NavLink>
            {user && <NavLink href="/dashboard" current={pathname}>My Bookings</NavLink>}
            {user && <NavLink href="/farm" current={pathname}>🍄 Farm</NavLink>}
            {isAdmin && <NavLink href="/admin" current={pathname}>Admin</NavLink>}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-all text-sm font-medium text-zinc-700"
                >
                  <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <span className="hidden sm:block max-w-[120px] truncate">{profile?.full_name ?? user.email}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200 py-1.5 z-50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-zinc-100">
                        <p className="text-xs font-semibold text-zinc-900 truncate">{profile?.full_name ?? 'My Account'}</p>
                        <p className="text-xs text-zinc-400 truncate mt-0.5">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <DropItem href="/dashboard" icon={<BookOpen className="w-3.5 h-3.5" />} onClick={() => setOpen(false)}>My Bookings</DropItem>
                        {isAdmin && <DropItem href="/admin" icon={<Settings className="w-3.5 h-3.5" />} onClick={() => setOpen(false)}>Admin Panel</DropItem>}
                      </div>
                      <div className="border-t border-zinc-100 py-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-sm font-medium text-zinc-600 hover:text-zinc-900 px-3 py-1.5 transition-colors">
                  Log in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
              </>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 transition-colors ml-1"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-zinc-100 bg-white px-4 pb-4 pt-2 space-y-1">
          <MobileLink href="/venues" onClick={() => setOpen(false)}>Venues</MobileLink>
          {user && <MobileLink href="/dashboard" onClick={() => setOpen(false)}>My Bookings</MobileLink>}
          {user && <MobileLink href="/farm" onClick={() => setOpen(false)}>🍄 Farm Manager</MobileLink>}
          {isAdmin && <MobileLink href="/admin" onClick={() => setOpen(false)}>Admin Panel</MobileLink>}
          {!user && (
            <div className="pt-3 flex gap-2 border-t border-zinc-100 mt-2">
              <Link href="/login" onClick={() => setOpen(false)} className="flex-1 btn btn-ghost btn-md text-center">Log in</Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="flex-1 btn btn-primary btn-md text-center">Sign up</Link>
            </div>
          )}
          {user && (
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1 border-t border-zinc-100 pt-3 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          )}
        </div>
      )}
    </header>
  )
}

function NavLink({ href, current, children }: { href: string; current: string; children: React.ReactNode }) {
  const active = current === href || current.startsWith(href + '/')
  return (
    <Link href={href} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-green-50 text-green-700' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
    }`}>
      {children}
    </Link>
  )
}

function DropItem({ href, icon, onClick, children }: { href: string; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
      <span className="text-zinc-400">{icon}</span>
      {children}
    </Link>
  )
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="block px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors">
      {children}
    </Link>
  )
}
