export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Venue } from '@/lib/types'
import {
  Search, CalendarCheck, CheckCircle2,
  QrCode, Zap, Building2, Sparkles,
  MapPin, ArrowRight, Star, ShieldCheck, Clock,
} from '@/components/icons'
import Reveal from '@/components/landing/Reveal'
import StatsCounter from '@/components/landing/StatsCounter'
import CourtGraphic from '@/components/landing/CourtGraphic'

const STATS = [
  { value: 100, suffix: '%', label: 'Online booking' },
  { value: 24,  suffix: '/7', label: 'Available' },
  { value: 60,  suffix: 's', label: 'To confirm', prefix: '<' },
  { value: 4.9, suffix: '★', label: 'Avg rating' },
]

const FEATURES = [
  {
    Icon: QrCode,
    title: 'PromptPay QR',
    desc: 'Scan, pay, done. Customers pay via PromptPay QR — no cash handling needed at the venue.',
    size: 'large',
    color: 'from-blue-500/10 to-blue-600/5',
    iconColor: 'bg-blue-500/15 text-blue-400',
  },
  {
    Icon: Sparkles,
    title: 'AI Slip Verification',
    desc: 'Gemini AI validates payment slips in seconds — zero manual review delay.',
    size: 'small',
    color: 'from-purple-500/10 to-purple-600/5',
    iconColor: 'bg-purple-500/15 text-purple-400',
  },
  {
    Icon: Zap,
    title: 'Real-time Slots',
    desc: 'Live availability — no double bookings, ever.',
    size: 'small',
    color: 'from-amber-500/10 to-amber-600/5',
    iconColor: 'bg-amber-500/15 text-amber-400',
  },
  {
    Icon: ShieldCheck,
    title: 'Role-based Admin',
    desc: 'System admins and venue admins each see only what they need.',
    size: 'small',
    color: 'from-green-500/10 to-green-600/5',
    iconColor: 'bg-green-500/15 text-green-400',
  },
  {
    Icon: Building2,
    title: 'Multi-venue',
    desc: 'Manage unlimited venues and courts from one dashboard.',
    size: 'small',
    color: 'from-rose-500/10 to-rose-600/5',
    iconColor: 'bg-rose-500/15 text-rose-400',
  },
]

const TESTIMONIALS = [
  { name: 'Krit S.',    role: 'Venue Owner',    text: 'Bookings doubled after switching to Badminto. The walk-in feature saves us 30 min a day.' },
  { name: 'Nong P.',   role: 'Regular Player',  text: 'Super easy to use. I book my court in under a minute every week.' },
  { name: 'Aom T.',    role: 'Club Manager',    text: 'The AI payment verification is a game changer. No more checking slips manually.' },
  { name: 'James L.',  role: 'Sports Complex',  text: 'Revenue tracking and the platform fee system are exactly what we needed.' },
  { name: 'Fern W.',   role: 'Venue Admin',     text: 'The check-in board makes managing walk-ins so smooth during peak hours.' },
  { name: 'Tan K.',    role: 'Regular Player',  text: 'Finally a booking system that actually works on mobile. Love it.' },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data: venues } = await supabase
    .from('venues').select('*').eq('is_active', true).limit(3)

  // JSX requires dot-notation or a local variable — extract bracket-accessed icon
  const HeroFeatureIcon = FEATURES[0].Icon

  return (
    <div className="overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center bg-zinc-950 text-white overflow-hidden">

        {/* Animated background blobs */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="anim-glow absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-green-600 rounded-full blur-[140px] opacity-[.14]" />
          <div className="anim-glow delay-300 absolute bottom-[0%] right-[10%] w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[120px] opacity-[.09]" />
          <div className="anim-glow delay-600 absolute top-[40%] left-[-5%] w-[300px] h-[300px] bg-teal-600 rounded-full blur-[100px] opacity-[.07]" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[.035]"
          style={{backgroundImage:'linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)',backgroundSize:'52px 52px'}} />

        {/* Floating court graphic — decorative, hidden from assistive tech */}
        <div aria-hidden="true" className="absolute right-[-2%] md:right-[4%] top-1/2 -translate-y-1/2 anim-float-slow pointer-events-none select-none">
          <CourtGraphic className="w-[260px] md:w-[340px] opacity-70" />
        </div>

        {/* Rotating ring decoration */}
        <div aria-hidden="true" className="absolute right-[8%] md:right-[14%] top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="anim-spin-slow w-[420px] h-[420px] md:w-[560px] md:h-[560px] rounded-full border border-green-500/10" />
        </div>
        <div aria-hidden="true" className="absolute right-[12%] md:right-[18%] top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="anim-spin-slow delay-300 w-[280px] h-[280px] md:w-[380px] md:h-[380px] rounded-full border border-green-500/[.07]" style={{animationDirection:'reverse'}} />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28">
          <div className="max-w-[620px]">

            {/* Live badge */}
            <div className="anim-fade-in-down inline-flex items-center gap-2 bg-white/[.07] backdrop-blur-sm border border-white/[.12] text-white/80 text-xs font-semibold px-4 py-2 rounded-full mb-8 tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
              </span>
              Live availability · Book in seconds
            </div>

            {/* Headline */}
            <h1 className="anim-fade-in-up delay-150 text-5xl md:text-[68px] font-extrabold tracking-tight leading-[1.05]">
              The Smarter Way<br />to Book
              <span className="block mt-1 text-shimmer">Badminton Courts</span>
            </h1>

            <p className="anim-fade-in-up delay-300 mt-6 text-lg text-zinc-400 leading-relaxed max-w-[480px]">
              Browse venues, pick your slot, pay via PromptPay — all confirmed
              instantly with zero phone calls.
            </p>

            <div className="anim-fade-in-up delay-400 mt-10 flex flex-wrap gap-3">
              <Link href="/venues" className="btn btn-primary btn-lg group gap-2">
                Browse Venues
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[14px] border border-zinc-700 text-zinc-300 font-semibold text-sm hover:border-zinc-500 hover:text-white hover:bg-white/[.05] transition-all">
                Create free account
              </Link>
            </div>

            {/* Trust row */}
            <div className="anim-fade-in delay-600 mt-12 flex flex-wrap items-center gap-5 text-xs text-zinc-500">
              {['No credit card required', 'Instant confirmation', 'Free to use'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent pointer-events-none" />
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="bg-zinc-950 pb-20 px-4">
        <div className="container">
          <Reveal>
            <StatsCounter stats={STATS} />
          </Reveal>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="section bg-white relative overflow-hidden">
        {/* Decorative blob */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-50 rounded-full blur-[100px] opacity-60 pointer-events-none" />

        <div className="container relative">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-xs font-bold text-green-600 uppercase tracking-[.2em] mb-3">Simple process</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight">
                Book in three steps
              </h2>
              <p className="mt-4 text-zinc-500 text-lg max-w-lg mx-auto">
                No phone calls, no waiting. From browsing to confirmed in under a minute.
              </p>
            </div>
          </Reveal>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+32px)] right-[calc(16.66%+32px)] h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" />

            {[
              { num: '01', Icon: Search,        title: 'Find a Venue',   desc: 'Browse courts near you with live availability shown upfront. Filter by location, time, or price.' },
              { num: '02', Icon: CalendarCheck,  title: 'Pick Your Slot', desc: 'Select your date and time from the interactive grid. Peak hours are clearly marked.' },
              { num: '03', Icon: CheckCircle2,   title: 'Pay & Play',     desc: 'Scan the PromptPay QR, upload your slip, and our AI confirms it instantly.' },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 150}>
                <div className="relative group bg-white border border-zinc-200 rounded-2xl p-8 hover:border-green-200 hover:shadow-xl transition-all duration-300">
                  {/* Step number watermark */}
                  <span className="absolute top-6 right-6 text-[52px] font-black text-zinc-100 group-hover:text-green-50 transition-colors select-none leading-none">
                    {step.num}
                  </span>
                  {/* Icon */}
                  <div className="w-12 h-12 bg-green-50 border border-green-100 rounded-xl flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-100 transition-colors">
                    <step.Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">{step.title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features bento grid ───────────────────────────────────────── */}
      <section className="section bg-zinc-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[.03]"
          style={{backgroundImage:'radial-gradient(circle, rgba(255,255,255,.8) 1px, transparent 1px)',backgroundSize:'32px 32px'}} />

        <div className="container relative">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-xs font-bold text-green-500 uppercase tracking-[.2em] mb-3">Everything you need</p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Built for venues.<br />Loved by players.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Large feature */}
            <Reveal className="md:col-span-2 md:row-span-2" delay={0}>
              <div className={`h-full min-h-[280px] grad-border bg-gradient-to-br ${FEATURES[0].color} p-8 rounded-2xl flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300 group`}>
                <div>
                  <div className={`w-12 h-12 ${FEATURES[0].iconColor} rounded-xl flex items-center justify-center mb-6`}>
                    <HeroFeatureIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{FEATURES[0].title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{FEATURES[0].desc}</p>
                </div>
                {/* QR preview graphic */}
                <div className="mt-8 flex items-end gap-4">
                  <div className="w-20 h-20 bg-white/10 rounded-xl border border-white/10 grid grid-cols-3 gap-1 p-2">
                    {Array.from({length:9}).map((_,i) => (
                      <div key={i} className={`rounded-sm ${[0,2,6,8].includes(i)?'bg-white/70':i===4?'bg-white/40':'bg-white/20'}`} />
                    ))}
                  </div>
                  <div className="text-xs text-zinc-500">
                    <p className="text-white font-semibold">PromptPay QR</p>
                    <p>Auto-generated per booking</p>
                    <p className="mt-1">AI-verified in &lt;5s</p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Small features */}
            {FEATURES.slice(1).map((f, i) => (
              <Reveal key={f.title} delay={(i + 1) * 100}>
                <div className={`grad-border bg-gradient-to-br ${f.color} p-6 rounded-2xl hover:scale-[1.02] transition-transform duration-300`}>
                  <div className={`w-10 h-10 ${f.iconColor} rounded-lg flex items-center justify-center mb-4`}>
                    <f.Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{f.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Venues ───────────────────────────────────────────── */}
      {venues && venues.length > 0 && (
        <section className="section bg-zinc-50">
          <div className="container">
            <Reveal>
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-xs font-bold text-green-600 uppercase tracking-[.2em] mb-2">Featured</p>
                  <h2 className="text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight">
                    Popular Venues
                  </h2>
                </div>
                <Link href="/venues" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors group">
                  View all
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(venues as Venue[]).map((venue, i) => (
                <Reveal key={venue.id} delay={i * 120}>
                  <Link href={`/venues/${venue.id}`}
                    className="group bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:border-green-200 hover:shadow-2xl transition-all duration-300 flex flex-col">
                    <div className="h-52 overflow-hidden relative">
                      {venue.image_url
                        ? <img src={venue.image_url} alt={venue.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        : (
                          <div className="w-full h-full bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 flex items-center justify-center relative">
                            <CourtGraphic className="w-28 opacity-40" />
                          </div>
                        )
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className="badge badge-green text-[10px]">Available now</span>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-zinc-900 text-base group-hover:text-green-600 transition-colors leading-snug">
                        {venue.name}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        {venue.address}
                      </p>
                      {venue.description && (
                        <p className="text-sm text-zinc-500 mt-2 line-clamp-2 flex-1">{venue.description}</p>
                      )}
                      <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-end">
                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                          Book now <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>

            <div className="sm:hidden mt-6 text-center">
              <Link href="/venues" className="btn btn-outline btn-md">View all venues</Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials marquee ──────────────────────────────────────── */}
      <section className="section-sm bg-white overflow-hidden">
        <div className="container mb-10">
          <Reveal>
            <div className="text-center">
              <p className="text-xs font-bold text-green-600 uppercase tracking-[.2em] mb-2">Testimonials</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight">
                Loved by venues & players
              </h2>
            </div>
          </Reveal>
        </div>

        {/* Scrolling marquee */}
        <div className="relative flex gap-5 overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <div className="anim-marquee flex gap-5 flex-nowrap">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div key={i} className="flex-shrink-0 w-72 bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
                <div className="flex items-center gap-0.5 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
                  <p className="text-xs text-zinc-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why choose us strip ───────────────────────────────────────── */}
      <section className="section-sm bg-zinc-50 border-y border-zinc-200">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { Icon: Clock,      title: 'Book in 60 seconds',   desc: 'The fastest court booking experience in Thailand.' },
              { Icon: ShieldCheck, title: 'Secure & Verified',   desc: 'AI-powered payment verification on every transaction.' },
              { Icon: Zap,        title: 'Always Up to Date',    desc: 'Real-time slot availability, zero double bookings.' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                    <item.Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-zinc-900">{item.title}</h3>
                  <p className="text-sm text-zinc-500">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="section bg-zinc-950 relative overflow-hidden">
        {/* Animated glow */}
        <div className="anim-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-600 rounded-full blur-[130px] opacity-[.12] pointer-events-none" />
        <div className="absolute inset-0 opacity-[.025]"
          style={{backgroundImage:'linear-gradient(rgba(255,255,255,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.8) 1px,transparent 1px)',backgroundSize:'40px 40px'}} />

        <div className="relative container-sm text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              Get started today — it&apos;s free
            </div>

            <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Ready to play?
            </h2>
            <p className="mt-5 text-zinc-400 text-xl">
              Join hundreds of players already booking courts online.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="btn btn-primary btn-lg px-10 group gap-2">
                Create free account
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/venues"
                className="inline-flex items-center justify-center px-8 py-3 rounded-[14px] border border-zinc-700 text-zinc-300 font-semibold hover:border-zinc-500 hover:text-white hover:bg-white/[.05] transition-all text-sm">
                Browse venues first
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
