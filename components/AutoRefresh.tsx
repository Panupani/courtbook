'use client'

// Drop this anywhere inside a server-rendered page to keep it fresh.
// • Subscribes to the 'slot-updates' Supabase broadcast channel —
//   fires router.refresh() the instant any booking status changes.
// • Also polls every `intervalMs` (default 30 s) as a silent fallback.
// • Shows a small pulsing "Live" indicator that lights up on each refresh.

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  /** Polling fallback interval in ms. Default: 30 000 */
  intervalMs?: number
}

export default function AutoRefresh({ intervalMs = 30_000 }: Props) {
  const router  = useRouter()
  const [pulse, setPulse] = useState(false)

  const refresh = useCallback(() => {
    router.refresh()
    setPulse(true)
    setTimeout(() => setPulse(false), 1200)
  }, [router])

  useEffect(() => {
    // ── Realtime broadcast subscription ─────────────────────────────────
    const supabase = createClient()
    const channel = supabase
      .channel('slot-updates')          // must match the topic broadcasts are sent to
      .on('broadcast', { event: 'slot-changed' }, refresh)
      .subscribe()

    // ── Polling fallback ─────────────────────────────────────────────────
    const timer = setInterval(refresh, intervalMs)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(timer)
    }
  }, [refresh, intervalMs])

  return (
    <span
      title="Live data — updates automatically"
      className="inline-flex items-center gap-1 text-xs text-gray-400 select-none"
    >
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block transition-colors duration-300 ${
          pulse ? 'bg-green-500' : 'bg-gray-300'
        }`}
      />
      Live
    </span>
  )
}
