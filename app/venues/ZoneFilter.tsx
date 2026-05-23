'use client'

import { useRouter } from 'next/navigation'
import type { Zone } from '@/lib/types'

interface Props {
  zones: Zone[]
  activeZoneId?: string
}

export default function ZoneFilter({ zones, activeZoneId }: Props) {
  const router = useRouter()

  const select = (zoneId: string | null) => {
    router.push(zoneId ? `/venues?zone=${zoneId}` : '/venues')
  }

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
