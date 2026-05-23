'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

const SLIDES = [
  {
    num: '01',
    route: '/venues',
    label: 'Customer',
    title: 'Find a Court',
    subtitle: 'Browse Venues & Zone Filter',
    desc: 'Discover badminton courts near you with zone-based filtering and an interactive OpenStreetMap. Filter by area, see all venues on the map, and pick the one closest to you.',
    color: 'from-green-500/20 to-emerald-600/10',
    accent: '#4ade80',
    accentBg: 'rgba(74,222,128,0.12)',
    tags: ['📍 Zone Filter', '🗺️ Interactive Map', '🏟️ Venue Cards', '⚡ Live Availability'],
    visual: (
      <div className="flex flex-col gap-2 w-full">
        {/* Zone pills */}
        <div className="flex gap-1.5 flex-wrap">
          {['🌏 All Areas','Sukhumvit','Lat Phrao','On Nut'].map((z,i)=>(
            <span key={z} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              i===0 ? 'bg-green-500 text-white border-green-500' : 'bg-white/5 text-white/60 border-white/10'
            }`}>{z}</span>
          ))}
        </div>
        {/* Map mock */}
        <div className="h-20 rounded-xl bg-gradient-to-br from-green-950 to-slate-900 border border-green-500/20 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:'linear-gradient(rgba(74,222,128,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,.5) 1px,transparent 1px)',backgroundSize:'20px 20px'}}/>
          {[{t:'25%',l:'30%',d:'.1s'},{t:'50%',l:'55%',d:'.3s'},{t:'65%',l:'40%',d:'.5s'}].map((p,i)=>(
            <span key={i} className="absolute text-lg animate-bounce" style={{top:p.t,left:p.l,animationDelay:p.d,filter:'drop-shadow(0 2px 6px rgba(74,222,128,.6))'}}>📍</span>
          ))}
        </div>
        {/* Venue cards */}
        <div className="grid grid-cols-3 gap-1.5">
          {[['🏸','Pro Court','Sukhumvit'],['🏟️','Sports Hub','Lat Phrao'],['🎯','CN Court','Chiang Mai']].map(([icon,name,zone])=>(
            <div key={name} className="bg-white/5 rounded-lg border border-white/10 p-2">
              <div className="text-lg mb-1">{icon}</div>
              <div className="text-[10px] font-semibold text-white leading-tight">{name}</div>
              <div className="text-[9px] text-green-400">{zone}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: '02',
    route: '/venues/[id]/book',
    label: 'Customer',
    title: 'Book a Court',
    subtitle: 'Slot Selection & Hold Timer',
    desc: 'Pick your date from the calendar, then select one or multiple consecutive time slots. Your slots are held for 10 minutes while you complete payment — no one else can take them.',
    color: 'from-blue-500/20 to-cyan-600/10',
    accent: '#60a5fa',
    accentBg: 'rgba(96,165,250,0.12)',
    tags: ['📅 Date Picker', '🕐 Slot Grid', '⏱️ 10-min Hold', '🔒 No Double Booking'],
    visual: (
      <div className="flex flex-col gap-2 w-full">
        <div className="grid grid-cols-4 gap-1.5">
          {[
            {t:'08:00',s:'avail'},{t:'09:00',s:'booked'},{t:'10:00',s:'sel'},{t:'11:00',s:'sel'},
            {t:'13:00',s:'avail'},{t:'14:00',s:'hold'},{t:'15:00',s:'avail'},{t:'16:00',s:'booked'},
          ].map(({t,s})=>(
            <div key={t} className={`py-1.5 rounded-lg text-center text-[10px] font-semibold border ${
              s==='sel'   ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/30' :
              s==='avail' ? 'bg-white/5 border-white/15 text-white/70' :
              s==='booked'? 'bg-red-500/10 border-red-500/20 text-red-400' :
                            'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>{t}</div>
          ))}
        </div>
        <div className="flex gap-2 items-center bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-amber-400 text-sm flex-shrink-0"
            style={{background:'conic-gradient(#f59e0b 75%, rgba(255,255,255,.05) 0)'}}>9:3</div>
          <div>
            <div className="text-[11px] font-semibold text-amber-300">Slots reserved for 10 minutes</div>
            <div className="text-[10px] text-white/40">Court A · 10:00–12:00 · ฿500</div>
          </div>
        </div>
        <div className="flex gap-2 text-[9px]">
          {[['bg-blue-500','Selected'],['bg-red-500/40','Booked'],['bg-amber-500/40','On Hold'],['bg-white/10','Available']].map(([bg,l])=>(
            <span key={l} className="flex items-center gap-1 text-white/50"><span className={`w-2 h-2 rounded-sm ${bg}`}/>{l}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: '03',
    route: '/api/bookings/run-verify',
    label: 'Payment',
    title: 'AI Payment Verification',
    subtitle: 'PromptPay Slip + Gemini AI',
    desc: 'Customers upload a photo of their PromptPay slip. Google Gemini AI reads the amount, timestamp, and reference number — then confirms or rejects automatically. Duplicate slips are blocked.',
    color: 'from-purple-500/20 to-violet-600/10',
    accent: '#c084fc',
    accentBg: 'rgba(192,132,252,0.12)',
    tags: ['📱 Slip Upload', '🤖 Gemini AI', '🔖 Ref Extraction', '🛡️ Duplicate Block'],
    visual: (
      <div className="flex gap-3 w-full">
        <div className="bg-white rounded-xl p-3 flex-shrink-0 w-28 flex flex-col gap-1.5 shadow-lg">
          <div className="text-[11px] font-black text-blue-600 text-center">PromptPay</div>
          <div className="border-t border-gray-100"/>
          <div className="flex justify-between text-[8px]"><span className="text-gray-400">To</span><span className="font-semibold text-gray-700">CourtBook</span></div>
          <div className="text-center text-sm font-black text-green-600">฿500.00</div>
          <div className="flex justify-between text-[8px]"><span className="text-gray-400">Date</span><span className="font-medium text-gray-700">23/05/26</span></div>
          <div className="text-[7px] text-center text-gray-400 font-mono">Ref: 2605231432XY</div>
        </div>
        <div className="flex-1 flex flex-col gap-2 justify-center">
          <div className="flex items-center gap-1.5 bg-purple-500/15 border border-purple-500/25 rounded-lg px-2.5 py-1.5">
            <span className="text-sm">🤖</span>
            <span className="text-[10px] font-semibold text-purple-300">Gemini analyzing…</span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse ml-auto"/>
          </div>
          {[['💰','Amount: ฿500','text-green-400'],['🔖','Ref: 2605231432XY','text-blue-400'],['⏰','Timestamp OK','text-amber-400']].map(([icon,text,color])=>(
            <div key={text} className={`flex items-center gap-2 text-[10px] font-medium ${color}`}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 rounded-lg px-2.5 py-1.5 mt-1">
            <span className="text-sm">✅</span>
            <span className="text-[10px] font-bold text-green-400">Booking Confirmed</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '04',
    route: '/dashboard',
    label: 'Customer',
    title: 'My Bookings',
    subtitle: 'Dashboard & Booking History',
    desc: 'Customers see all upcoming and past bookings in one place. Each booking shows the QR code for check-in, booking status, court details, and payment confirmation.',
    color: 'from-teal-500/20 to-cyan-600/10',
    accent: '#2dd4bf',
    accentBg: 'rgba(45,212,191,0.12)',
    tags: ['📋 Upcoming Bookings', '🔖 QR Code Check-in', '📜 Booking History', '👥 Group Bookings'],
    visual: (
      <div className="flex flex-col gap-2 w-full">
        {[
          {court:'Court A · Pro Badminton',date:'Today 10:00–12:00',status:'confirmed',price:'฿500'},
          {court:'Court B · Sports Hub',date:'Sat 14:00–15:00',status:'pending',price:'฿250'},
          {court:'Court C · CN Court',date:'Sun 09:00–10:00',status:'confirmed',price:'฿300'},
        ].map(({court,date,status,price})=>(
          <div key={court} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center text-base flex-shrink-0">🏸</div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-white truncate">{court}</div>
              <div className="text-[10px] text-white/40">{date}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${status==='confirmed'?'bg-green-500/20 text-green-400':'bg-amber-500/15 text-amber-400'}`}>{status}</span>
              <span className="text-[10px] text-white/50">{price}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '05',
    route: '/admin',
    label: 'Admin',
    title: 'Admin Dashboard',
    subtitle: 'Full Venue Management Hub',
    desc: 'Venue admins get a complete control center — live booking counts, revenue tracking, pending payment queue, court utilization stats, and quick access to every management module.',
    color: 'from-orange-500/20 to-red-600/10',
    accent: '#fb923c',
    accentBg: 'rgba(251,146,60,0.12)',
    tags: ['📊 Live Stats', '💳 Payment Queue', '🏟️ Venue & Court CRUD', '👥 Staff Management'],
    visual: (
      <div className="flex flex-col gap-2 w-full">
        <div className="grid grid-cols-4 gap-1.5">
          {[['42','Today\'s Bookings','text-green-400'],['฿18.5k','Revenue','text-blue-400'],['7','Pending Pay','text-amber-400'],['94%','Utilization','text-purple-400']].map(([v,l,c])=>(
            <div key={l} className="bg-white/5 rounded-lg border border-white/10 p-2 text-center">
              <div className={`text-sm font-black ${c}`}>{v}</div>
              <div className="text-[8px] text-white/40 leading-tight mt-0.5">{l}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-white/10 text-[10px] font-semibold text-white/60 flex justify-between">
            <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1.5"/>Live Bookings</span>
            <span className="text-white/30">Auto-refreshing</span>
          </div>
          {[['Somchai W.','Court A · 10:00','confirmed'],['Apinya T.','Court B · 14:00','pending'],['Nattapon K.','Court C · 16:00','confirmed']].map(([name,slot,st])=>(
            <div key={name} className="flex items-center gap-2 px-3 py-1.5 text-[10px] border-b border-white/5 last:border-0">
              <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs">👤</span>
              <span className="flex-1 font-medium text-white/80">{name}</span>
              <span className="text-white/40">{slot}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${st==='confirmed'?'bg-green-500/20 text-green-400':'bg-amber-500/15 text-amber-400'}`}>{st}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    num: '06',
    route: '/admin/bookings/walkin',
    label: 'Admin',
    title: 'Walk-in Booking',
    subtitle: 'Counter Booking for Staff',
    desc: 'Staff can create same-day bookings directly at the counter — select a court, pick available slots from a real-time grid, set payment method, and confirm instantly without customer login.',
    color: 'from-rose-500/20 to-pink-600/10',
    accent: '#fb7185',
    accentBg: 'rgba(251,113,133,0.12)',
    tags: ['🚶 Walk-in Form', '⚡ Real-time Grid', '💵 Cash / QR Pay', '🖨️ Instant Receipt'],
    visual: (
      <div className="flex flex-col gap-2 w-full">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex-1 bg-white/5 rounded-lg border border-white/10 p-2">
              <div className="text-[9px] text-white/40 mb-1">Court</div>
              <div className="text-[11px] font-semibold text-white">Court A — ฿250/hr</div>
            </div>
            <div className="flex-1 bg-white/5 rounded-lg border border-white/10 p-2">
              <div className="text-[9px] text-white/40 mb-1">Date</div>
              <div className="text-[11px] font-semibold text-white">Today</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {['10:00','11:00','12:00','13:00'].map((t,i)=>(
              <div key={t} className={`py-1 rounded text-center text-[9px] font-bold border ${
                i===1?'bg-rose-500 border-rose-500 text-white':i===2?'bg-rose-500 border-rose-500 text-white':'bg-white/5 border-white/10 text-white/60'
              }`}>{t}</div>
            ))}
          </div>
          <div className="flex gap-2">
            {['💵 Cash','📱 QR'].map(m=>(
              <button key={m} className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border border-white/10 text-white/60 bg-white/5">{m}</button>
            ))}
          </div>
          <button className="w-full py-2 rounded-lg bg-rose-500 text-white text-[11px] font-bold">✓ Confirm Walk-in — ฿500</button>
        </div>
      </div>
    ),
  },
  {
    num: '07',
    route: '/admin/checkin',
    label: 'Admin',
    title: 'QR Check-in',
    subtitle: 'Staff Check-in Board',
    desc: 'Staff scan the customer\'s booking QR code at the entrance to mark them as checked in. The board shows all today\'s confirmed bookings with check-in status in real time.',
    color: 'from-sky-500/20 to-blue-600/10',
    accent: '#38bdf8',
    accentBg: 'rgba(56,189,248,0.12)',
    tags: ['📷 QR Scanner', '📋 Today\'s Board', '✅ Check-in Status', '⚡ Real-time Updates'],
    visual: (
      <div className="flex flex-col gap-2 w-full">
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-sky-500/10 border-b border-white/10 text-[10px] font-bold text-sky-300 flex items-center gap-2">
            <span className="text-base">📋</span> Today's Check-in Board
            <span className="ml-auto text-[9px] bg-sky-500/20 px-2 py-0.5 rounded-full">5 confirmed</span>
          </div>
          {[
            {name:'Somchai W.',court:'Court A · 10:00',checked:true},
            {name:'Apinya T.',court:'Court B · 11:00',checked:true},
            {name:'Nattapon K.',court:'Court C · 13:00',checked:false},
            {name:'Wan P.',court:'Court A · 14:00',checked:false},
          ].map(({name,court,checked})=>(
            <div key={name} className="flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0 text-[10px]">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${checked?'bg-sky-500/30 text-sky-300':'bg-white/10 text-white/30'}`}>{checked?'✓':'–'}</span>
              <span className={`flex-1 font-medium ${checked?'text-white/80':'text-white/50'}`}>{name}</span>
              <span className="text-white/30">{court}</span>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${checked?'bg-sky-500/20 text-sky-400':'bg-white/5 text-white/30'}`}>{checked?'In':'–'}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
          <span className="text-base">📷</span>
          <span className="text-[10px] font-semibold text-sky-300">Scan QR to check in instantly</span>
        </div>
      </div>
    ),
  },
  {
    num: '08',
    route: '/admin/revenue',
    label: 'Admin',
    title: 'Revenue Analytics',
    subtitle: 'Earnings & Platform Fee Tracking',
    desc: 'Track daily, weekly, and monthly revenue across all courts and venues. See platform fee breakdowns, top-performing courts, and export reports for accounting.',
    color: 'from-yellow-500/20 to-amber-600/10',
    accent: '#fbbf24',
    accentBg: 'rgba(251,191,36,0.12)',
    tags: ['📈 Revenue Charts', '💰 Platform Fees', '🏆 Top Courts', '📊 Export Reports'],
    visual: (
      <div className="flex flex-col gap-2 w-full">
        <div className="grid grid-cols-3 gap-1.5">
          {[['฿124,500','This Month','text-amber-400'],['฿18,500','Today','text-green-400'],['฿1,240','Platform Fee','text-purple-400']].map(([v,l,c])=>(
            <div key={l} className="bg-white/5 rounded-xl border border-white/10 p-2.5 text-center">
              <div className={`text-sm font-black ${c}`}>{v}</div>
              <div className="text-[9px] text-white/40 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
        {/* Bar chart mock */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="text-[10px] text-white/40 mb-2">Daily Revenue — This Week</div>
          <div className="flex items-end gap-1.5 h-14">
            {[40,65,55,80,70,90,75].map((h,i)=>(
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t" style={{height:`${h}%`,background:i===5?'#fbbf24':'rgba(251,191,36,0.25)'}}/>
                <span className="text-[7px] text-white/30">{'MTWTFSS'[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex justify-between items-center">
          <span className="text-[10px] text-white/60">Top court: Court A</span>
          <span className="text-[11px] font-bold text-amber-400">฿42,000/mo</span>
        </div>
      </div>
    ),
  },
]

export default function FeaturePresentation() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const go = useCallback((idx: number) => {
    setCurrent(((idx % SLIDES.length) + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused])

  const slide = SLIDES[current]

  return (
    <section className="section-sm bg-zinc-950 overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 opacity-[.025]"
        style={{backgroundImage:'radial-gradient(circle,rgba(255,255,255,.8) 1px,transparent 1px)',backgroundSize:'28px 28px'}} />
      <div className="absolute inset-0 pointer-events-none"
        style={{background:`radial-gradient(ellipse 60% 50% at 70% 50%, ${slide.accentBg}, transparent)`}}
        key={current} />

      <div className="container relative">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold text-green-500 uppercase tracking-[.2em] mb-2">Platform Features</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Everything CourtBook can do
          </h2>
          <p className="mt-3 text-zinc-500 text-base">8 core functions — built for players and venue owners.</p>
        </div>

        {/* Main card */}
        <div
          className="relative rounded-3xl border overflow-hidden"
          style={{borderColor:`${slide.accent}25`,background:'rgba(15,23,42,0.8)'}}
          onMouseEnter={()=>setPaused(true)}
          onMouseLeave={()=>setPaused(false)}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl" style={{background:`linear-gradient(90deg,transparent,${slide.accent},transparent)`}}/>

          <div className="grid md:grid-cols-2 gap-0">
            {/* Left: info */}
            <div className="p-8 md:p-10 flex flex-col gap-6 border-b md:border-b-0 md:border-r border-white/[.07]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black px-2.5 py-1 rounded-full border"
                  style={{color:slide.accent,borderColor:`${slide.accent}40`,background:`${slide.accentBg}`}}>
                  {slide.num}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/[.06] text-zinc-400 border border-white/10">
                  {slide.label}
                </span>
                <code className="text-[11px] text-zinc-500 font-mono hidden sm:block">{slide.route}</code>
              </div>

              <div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  {slide.title}
                </h3>
                <p className="mt-1 text-sm font-semibold" style={{color:slide.accent}}>{slide.subtitle}</p>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed">{slide.desc}</p>

              <div className="flex flex-wrap gap-2">
                {slide.tags.map(tag => (
                  <span key={tag} className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/10 text-zinc-300 bg-white/[.04]">
                    {tag}
                  </span>
                ))}
              </div>

              <Link
                href={slide.route.startsWith('/admin') ? '/admin' : slide.route.includes('[') ? '/venues' : slide.route}
                className="inline-flex items-center gap-2 text-sm font-semibold transition-colors group w-fit"
                style={{color:slide.accent}}
              >
                Open this page
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                </svg>
              </Link>
            </div>

            {/* Right: visual */}
            <div className="p-8 md:p-10 flex items-center justify-center">
              <div className="w-full max-w-[320px]">
                {slide.visual}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {/* Slide dots */}
          <div className="flex gap-2 flex-wrap">
            {SLIDES.map((s, i) => (
              <button
                key={i}
                onClick={() => { go(i); setPaused(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border"
                style={i === current ? {
                  background: slide.accentBg,
                  borderColor: `${slide.accent}50`,
                  color: slide.accent,
                } : {
                  background: 'transparent',
                  borderColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => { go(current - 1); setPaused(true) }}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all text-sm">
              ←
            </button>
            <button onClick={() => { go(current + 1); setPaused(true) }}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all text-sm">
              →
            </button>
          </div>
        </div>

        {/* Auto-play progress bar */}
        {!paused && (
          <div className="mt-3 h-0.5 bg-white/[.05] rounded-full overflow-hidden">
            <div
              key={current}
              className="h-full rounded-full"
              style={{
                background: slide.accent,
                animation: 'progress-fill 5s linear forwards',
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes progress-fill { from { width: 0% } to { width: 100% } }
      `}</style>
    </section>
  )
}
