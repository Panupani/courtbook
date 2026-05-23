'use client'

import { useEffect, useRef } from 'react'
import type { Venue, Zone } from '@/lib/types'

// Leaflet is browser-only — imported dynamically inside useEffect
// so this component is safe with Next.js SSR when loaded via dynamic().

interface Props {
  venues: (Venue & { zone?: Zone })[]
  activeZoneId?: string
}

const BANGKOK: [number, number] = [13.7563, 100.5018]

export default function VenueMap({ venues, activeZoneId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<any>(null)
  const markersRef   = useRef<any[]>([])

  // venues with coordinates
  const pinnable = venues.filter(v => v.lat != null && v.lng != null)

  useEffect(() => {
    if (!containerRef.current) return

    // Dynamic import — Leaflet must not run on the server
    import('leaflet').then(L => {
      // Avoid re-init on HMR
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      // Leaflet default icon fix for webpack
      ;(L.Icon.Default as any).mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Custom green marker
      const greenIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:32px;height:40px;
          background:#16a34a;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,.35);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:14px;line-height:1;">🏸</span>
        </div>`,
        iconSize:   [32, 40],
        iconAnchor: [16, 40],
        popupAnchor:[0, -42],
      })

      const map = L.map(containerRef.current!, { zoomControl: true, scrollWheelZoom: false })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      markersRef.current = []
      const bounds: [number, number][] = []

      for (const v of pinnable) {
        const pos: [number, number] = [v.lat as number, v.lng as number]
        bounds.push(pos)

        const marker = L.marker(pos, { icon: greenIcon })
          .bindPopup(`
            <div style="min-width:160px;font-family:sans-serif;">
              <p style="font-weight:700;font-size:14px;margin:0 0 4px;">${v.name}</p>
              ${v.zone ? `<p style="font-size:11px;color:#16a34a;margin:0 0 3px;">📍 ${v.zone.name}</p>` : ''}
              <p style="font-size:11px;color:#6b7280;margin:0 0 8px;">${v.address}</p>
              <a href="/venues/${v.id}"
                style="display:inline-block;background:#16a34a;color:#fff;padding:4px 12px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">
                View courts →
              </a>
            </div>
          `, { maxWidth: 220 })
          .addTo(map)

        markersRef.current.push(marker)
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
      } else {
        map.setView(BANGKOK, 11)
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  // Re-render map whenever the filtered venue list changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues.map(v => v.id).join(','), activeZoneId])

  if (pinnable.length === 0) {
    return (
      <div className="w-full h-56 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 mb-8">
        <span className="text-3xl mb-2">🗺️</span>
        <p className="text-sm">No venue coordinates yet</p>
        <p className="text-xs mt-1">Admins can add locations in Venues → Edit</p>
      </div>
    )
  }

  return (
    <div className="mb-8">
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div
        ref={containerRef}
        className="w-full h-72 sm:h-96 rounded-2xl overflow-hidden border border-gray-200 shadow-sm z-0"
        style={{ position: 'relative' }}
      />
      <p className="text-xs text-gray-400 mt-1.5 text-center">
        {pinnable.length} venue{pinnable.length !== 1 ? 's' : ''} on map · click a pin for details
      </p>
    </div>
  )
}
