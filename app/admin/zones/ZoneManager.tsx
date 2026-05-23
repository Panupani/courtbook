'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ZoneRow {
  id: string
  name: string
  created_at: string
  venueCount: number
}

export default function ZoneManager({ zones: initial }: { zones: ZoneRow[] }) {
  const router = useRouter()
  const supabase = createClient()

  const [zones, setZones]       = useState<ZoneRow[]>(initial)
  const [newName, setNewName]   = useState('')
  const [editId, setEditId]     = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function addZone() {
    const name = newName.trim()
    if (!name) return
    setSaving(true); setError('')
    const { data, error: err } = await supabase
      .from('zones').insert({ name }).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    setZones(prev => [...prev, { ...data, venueCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
    setNewName('')
    setSaving(false)
    router.refresh()
  }

  async function saveEdit(id: string) {
    const name = editName.trim()
    if (!name) return
    setSaving(true); setError('')
    const { error: err } = await supabase.from('zones').update({ name }).eq('id', id)
    if (err) { setError(err.message); setSaving(false); return }
    setZones(prev => prev.map(z => z.id === id ? { ...z, name } : z).sort((a, b) => a.name.localeCompare(b.name)))
    setEditId(null)
    setSaving(false)
    router.refresh()
  }

  async function deleteZone(id: string, venueCount: number) {
    if (venueCount > 0) {
      setError(`Cannot delete — ${venueCount} venue${venueCount > 1 ? 's' : ''} still assigned to this zone.`)
      return
    }
    if (!confirm('Delete this zone?')) return
    setSaving(true)
    await supabase.from('zones').delete().eq('id', id)
    setZones(prev => prev.filter(z => z.id !== id))
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Add new zone */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Add Zone</h2>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addZone()}
            placeholder="e.g. Sukhumvit, Lat Phrao, Chiang Mai…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={addZone}
            disabled={saving || !newName.trim()}
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Zone list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {zones.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No zones yet. Add one above.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {zones.map(z => (
              <li key={z.id} className="flex items-center gap-3 px-5 py-3">
                {editId === z.id ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(z.id); if (e.key === 'Escape') setEditId(null) }}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button onClick={() => saveEdit(z.id)} disabled={saving} className="text-xs font-semibold text-green-600 hover:underline">Save</button>
                    <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-gray-900">📍 {z.name}</span>
                    <span className="text-xs text-gray-400 mr-2">
                      {z.venueCount} venue{z.venueCount !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => { setEditId(z.id); setEditName(z.name); setError('') }}
                      className="text-xs text-blue-600 hover:underline"
                    >Edit</button>
                    <button
                      onClick={() => deleteZone(z.id, z.venueCount)}
                      className="text-xs text-red-500 hover:underline"
                    >Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
