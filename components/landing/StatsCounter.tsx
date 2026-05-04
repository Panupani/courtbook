'use client'

import { useEffect, useRef, useState } from 'react'

interface Stat {
  value: number
  suffix: string
  label: string
  prefix?: string
}

function Counter({ value, suffix, prefix = '' }: { value: number; suffix: string; prefix?: string }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const duration = 1800
        const steps = 60
        const increment = value / steps
        let current = 0
        const timer = setInterval(() => {
          current += increment
          if (current >= value) { setDisplay(value); clearInterval(timer) }
          else setDisplay(Math.floor(current))
        }, duration / steps)
        observer.unobserve(el)
      }
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  )
}

export default function StatsCounter({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800/60 rounded-2xl overflow-hidden border border-zinc-800">
      {stats.map((s, i) => (
        <div key={i} className="bg-zinc-900/80 px-8 py-7 text-center">
          <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            <Counter value={s.value} suffix={s.suffix} prefix={s.prefix} />
          </p>
          <p className="text-xs text-zinc-500 mt-1.5 font-medium uppercase tracking-widest">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
