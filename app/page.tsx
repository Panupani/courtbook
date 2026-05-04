export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Venue } from '@/lib/types'
import { Search, CalendarCheck, CheckCircle2, QrCode, Zap, Building2, Sparkles, MapPin, ArrowRight } from '@/components/icons'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('venues')
    .select('*')
    .eq('is_active', true)
    .limit(3)

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize:'48px 48px'}} />
        {/* Green glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-600 opacity-[0.12] rounded-full blur-[120px]" />

        <div className="relative max-w-5xl mx-auto px-4 py-28 md:py-36 text-center">
          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Real-time availability
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none">
            Book a Badminton
            <span className="block mt-2 bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
              Court in Seconds
            </span>
          </h1>

          <p className="mt-7 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Browse venues, pick your slot, and confirm your booking instantly —
            no phone calls, no waiting.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/venues" className="btn btn-primary btn-lg text-base px-8">
              Browse Venues →
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-[14px] border border-white/20 text-white font-semibold text-base hover:bg-white/10 transition-all"
            >
              Sign up free
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-center">
            {[
              { num: '100%', label: 'Online booking' },
              { num: 'Real-time', label: 'Availability' },
              { num: 'Instant', label: 'Confirmation' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white">{s.num}</p>
                <p className="text-sm text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900">Three steps to your next game</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: '01', Icon: Search,       title: 'Find a Venue', desc: 'Browse venues and courts near you with live slot availability shown upfront.' },
              { num: '02', Icon: CalendarCheck, title: 'Pick Your Slot', desc: 'Select your preferred date and time from the live schedule grid.' },
              { num: '03', Icon: CheckCircle2, title: 'Confirm & Play', desc: 'Pay via PromptPay, get instant confirmation, and hit the court.' },
            ].map(item => (
              <div key={item.num} className="group relative bg-white border border-zinc-200 rounded-2xl p-7 hover:border-green-200 hover:shadow-lg transition-all duration-200">
                <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center text-green-600 mb-5">
                  <item.Icon className="w-5 h-5" />
                </div>
                <span className="absolute top-7 right-7 text-4xl font-black text-zinc-100 group-hover:text-green-50 transition-colors select-none">
                  {item.num}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{item.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Venues ───────────────────────────────────────── */}
      {venues && venues.length > 0 && (
        <section className="section bg-zinc-50">
          <div className="container">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-sm font-semibold text-green-600 uppercase tracking-widest mb-2">Featured</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900">Popular Venues</h2>
              </div>
              <Link href="/venues" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors">
                View all venues <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(venues as Venue[]).map(venue => (
                <Link
                  key={venue.id}
                  href={`/venues/${venue.id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:border-green-200 hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  {/* Image */}
                  <div className="h-48 overflow-hidden relative">
                    {venue.image_url
                      ? <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center">
                          <Building2 className="w-12 h-12 text-white/60" />
                        </div>
                      )
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </div>

                  {/* Body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-zinc-900 text-base group-hover:text-green-600 transition-colors leading-snug">
                      {venue.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {venue.address}
                    </p>
                    {venue.description && (
                      <p className="text-sm text-zinc-500 mt-2 line-clamp-2 leading-relaxed flex-1">{venue.description}</p>
                    )}
                    <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                      <span className="badge badge-green">Available now</span>
                      <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                        Book now <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="sm:hidden mt-6 text-center">
              <Link href="/venues" className="btn btn-outline btn-md">View all venues</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Feature highlights ────────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { Icon: QrCode,    title: 'PromptPay Payments',    desc: 'Pay instantly via QR code. Upload your slip and our AI validates it in seconds.',          color: 'bg-blue-50 text-blue-600' },
              { Icon: Zap,       title: 'Real-time Availability', desc: 'Always see up-to-date slot availability. No double bookings, ever.',                       color: 'bg-green-50 text-green-600' },
              { Icon: Building2, title: 'Multi-venue Support',    desc: 'One account to book across multiple venues. All your bookings in one place.',              color: 'bg-purple-50 text-purple-600' },
              { Icon: Sparkles,  title: 'AI Slip Verification',   desc: 'Gemini AI reviews your payment slip automatically — no manual approval delay.',            color: 'bg-orange-50 text-orange-600' },
            ].map(f => (
              <div key={f.title} className="flex gap-5 p-6 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50 transition-all">
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center flex-shrink-0`}>
                  <f.Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-base">{f.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────── */}
      <section className="section bg-zinc-950">
        <div className="container-sm text-center">
          <div className="inline-block bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-6">
            Get started today
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Ready to play?
          </h2>
          <p className="mt-4 text-zinc-400 text-lg">
            Create a free account and book your first court in minutes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup" className="btn btn-primary btn-lg px-10">
              Create free account
            </Link>
            <Link href="/venues" className="inline-flex items-center justify-center px-8 py-3 rounded-[14px] border border-zinc-700 text-zinc-300 font-semibold hover:border-zinc-500 hover:text-white transition-all text-sm">
              Browse venues first
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
