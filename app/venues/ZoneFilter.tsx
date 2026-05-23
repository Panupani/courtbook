'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Zone } from '@/lib/types'

interface Props {
  zones: Zone[]
  activeZoneId?: string
}

const PILL_THRESHOLD = 6   // ≤ this many zones → show pills; more → dropdown

export default function ZoneFilter({ zones, activeZoneId }: Props) {
  const router = useRouter()
  const activeZone = zones.find(z => z.id === activeZoneId)

  const select = (zoneId: string | null) => {
    router.push(zoneId ? `/venues?zone=${zoneId}` : '/venues')
  }

  // ── Pill layout (few zones) ─────────────────────────────────────────
  if (zones.length <= PILL_THRESHOLD) {
    return (
      <div className="flex flex-wrap gap-2 mb-7">
        <button
          onClick={() => select(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            !activeZoneId
              ? 'bg-green-600 text-white border-green-600 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'
          }`}
        >
          All Areas
        </button>
        {zones.map(zone => (
          <button
            key={zone.id}
            onClick={() => select(zone.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              activeZoneId === zone.id
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700'
            }`}
          >
            📍 {zone.name}
          </button>
        ))}
      </div>
    )
  }

  // ── Searchable dropdown (many zones) ───────────────────────────────
  return <ZoneDropdown zones={zones} activeZone={activeZone} onSelect={select} />
}

// ── Dropdown component ──────────────────────────────────────────────────
function ZoneDropdown({
  zones,
  activeZone,
  onSelect,
}: {
  zones: Zone[]
  activeZone: Zone | undefined
  onSelect: (id: string | null) => void
}) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const containerRef          = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? zones.filter(z => z.name.toLowerCase().includes(query.toLowerCase()))
    : zones

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const handleSelect = (id: string | null) => {
    onSelect(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative mb-7 inline-block">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all shadow-sm ${
          activeZone
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-white text-gray-700 border-gray-200 hover:border-green-400'
        }`}
      >
        <span>{activeZone ? `📍 ${activeZone.name}` : '🌏 All Areas'}</span>
        {/* Clear button if a zone is selected */}
        {activeZone ? (
          <span
            role="button"
            onClick={e => { e.stopPropagation(); handleSelect(null) }}
            className="ml-1 w-4 h-4 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center text-xs leading-none"
            title="Clear filter"
          >✕</span>
        ) : (
          <svg className="w-3.5 h-3.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        )}
      </button>

      {/* Zone count hint when none selected */}
      {!activeZone && (
        <span className="ml-2 text-xs text-gray-400">{zones.length} areas available</span>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search area…"
                className="flex-1 bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {/* All Areas option */}
            <li>
              <button
                onClick={() => handleSelect(null)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                  !activeZone ? 'text-green-700 font-semibold' : 'text-gray-700'
                }`}
              >
                <span className="w-4 text-center">🌏</span>
                <span className="flex-1 text-left">All Areas</span>
                {!activeZone && <span className="text-green-500 text-xs">✓</span>}
              </button>
            </li>

            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-gray-400">No areas match "{query}"</li>
            ) : (
              filtered.map(zone => (
                <li key={zone.id}>
                  <button
                    onClick={() => handleSelect(zone.id)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                      activeZone?.id === zone.id ? 'text-green-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <span className="w-4 text-center text-xs">📍</span>
                    <span className="flex-1 text-left">{zone.name}</span>
                    {activeZone?.id === zone.id && <span className="text-green-500 text-xs">✓</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
