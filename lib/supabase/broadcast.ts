// Server-side helper: broadcast a slot-status change to all subscribed clients
// via Supabase Realtime HTTP broadcast endpoint (no WebSocket required from server).

export interface SlotUpdate {
  courtId: string
  bookingDate: string  // YYYY-MM-DD
  startTime: string    // HH:MM
  status: string       // pending | confirmed | cancelled
}

/**
 * Fire-and-forget: send slot updates to the "slot-updates" broadcast channel.
 * Failures are logged but never thrown — the polling fallback keeps clients consistent.
 */
export async function broadcastSlotUpdates(updates: SlotUpdate[]): Promise<void> {
  if (!updates.length) return

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return

  try {
    const endpoint = `${supabaseUrl}/realtime/v1/api/broadcast`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        messages: updates.map(u => ({
          topic:   'realtime:slot-updates',
          event:   'slot-changed',
          payload: u,
          private: false,
        })),
      }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn(`[broadcast] HTTP ${res.status}:`, text.slice(0, 200))
    }
  } catch (e: any) {
    console.warn('[broadcast] slot update failed (non-critical):', e?.message ?? e)
  }
}
