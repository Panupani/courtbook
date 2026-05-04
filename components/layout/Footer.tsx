import Link from 'next/link'
import { ShuttlecockIcon } from '@/components/icons'

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
                <ShuttlecockIcon className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Court<span className="text-green-500">Book</span>
              </span>
            </div>
            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
              Book badminton courts online. Real-time availability, instant confirmation.
            </p>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Link href="/venues"    className="hover:text-white transition-colors">Venues</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">My Bookings</Link>
            <Link href="/login"     className="hover:text-white transition-colors">Login</Link>
            <Link href="/signup"    className="hover:text-white transition-colors">Sign Up</Link>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <p>© {new Date().getFullYear()} CourtBook. All rights reserved.</p>
          <p>Built for players, by players</p>
        </div>
      </div>
    </footer>
  )
}
