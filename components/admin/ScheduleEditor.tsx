'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES, formatPrice } from '@/lib/utils'
import type { Court, OperatingHours } from '@/lib/types'

interface DayRow {
  enabled: boolean
  open_time: string
  close_time: string
  slot_duration_minutes: number
  peak_enabled: boolean
  peak_start_time: string
  peak_end_time: string
  peak_hourly_rate: string
  existingId?: string
  error?: string
}

interface Props {
  court: Court
  hours: OperatingHours[]
}

// Supabase returns "HH:MM:SS" — trim to "HH:MM" for <input type="time">
function toTimeInput(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function defaultRow(hours: OperatingHours[], day: number): DayRow {
  const h = hours.find(h => h.day_of_week === day)
  if (h) {
    return {
      enabled: true,
      open_time: toTimeInput(h.open_time) || '08:00',
      close_time: toTimeInput(h.close_time) || '22:00',
      slot_duration_minutes: h.slot_duration_minutes,
      peak_enabled: Boolean(h.peak_start_time),
      peak_start_time: toTimeInput(h.peak_start_time) || '17:00',
      peak_end_time: toTimeInput(h.peak_end_time) || '21:00',
      peak_hourly_rate: h.peak_hourly_rate != null ? String(h.peak_hourly_rate) : '',
      existingId: h.id,
    }
  }
  return {
    enabled: false,
    open_time: '08:00',
    close_time: '22:00',
    slot_duration_minutes: 60,
    peak_enabled: false,
    peak_start_time: '17:00',
    peak_end_time: '21:00',
    peak_hourly_rate: '',
  }
}

function validateRow(row: DayRow): string | null {
  if (!row.enabled) return null
  if (row.open_time >= row.close_time) return 'Close time must be after open time.'
  if (row.peak_enabled) {
    if (!row.peak_start_time || !row.peak_end_time) return 'Set both peak start and end times.'
    if (row.peak_start_time >= row.peak_end_time) return 'Peak end must be after peak start.'
    if (!row.peak_hourly_rate || parseFloat(row.peak_hourly_rate) <= 0)
      return 'Enter a valid peak rate (> 0).'
    if (row.peak_start_time < row.open_time || row.peak_end_time > row.close_time)
      return 'Peak window must be within open/close hours.'
  }
  return null
}

export default function ScheduleEditor({ court, hours }: Props) {
  const supabase = createClient()
  const [rows, setRows] = useState<DayRow[]>(() =>
    Array.from({ length: 7 }, (_, i) => defaultRow(hours, i))
  )
  const [saving, setSaving] = useState(false)
  const [savedDays, setSavedDays] = useState<number[]>([])

  const update = (day: number, patch: Partial<DayRow>) => {
    setRows(prev => prev.map((r, i) => i === day ? { ...r, ...patch, error: undefined } : r))
  }

  const handleSave = async () => {
    // Validate all enabled rows first
    const validated = rows.map(row => ({ ...row, error: validateRow(row) ?? undefined }))
    setRows(validated)
    if (validated.some(r => r.error)) return

    setSaving(true)
    setSavedDays([])
    const newlySaved: number[] = []

    for (let day = 0; day < 7; day++) {
      const row = validated[day]

      if (row.enabled) {
        const payload = {
          court_id: court.id,
          day_of_week: day,
          open_time: row.open_time,
          close_time: row.close_time,
          slot_duration_minutes: row.slot_duration_minutes,
          peak_start_time: row.peak_enabled ? row.peak_start_time : null,
          peak_end_time: row.peak_enabled ? row.peak_end_time : null,
          peak_hourly_rate: row.peak_enabled ? parseFloat(row.peak_hourly_rate) : null,
        }

        if (row.existingId) {
          const { error } = await supabase
            .from('operating_hours')
            .update(payload)
            .eq('id', row.existingId)
          if (error) {
            setRows(prev => prev.map((r, i) => i === day ? { ...r, error: error.message } : r))
            continue
          }
        } else {
          const { data, error } = await supabase
            .from('operating_hours')
            .insert(payload)
            .select()
            .single()
          if (error) {
            setRows(prev => prev.map((r, i) => i === day ? { ...r, error: error.message } : r))
            continue
          }
          if (data) {
            setRows(prev => prev.map((r, i) => i === day ? { ...r, existingId: data.id } : r))
          }
        }
        newlySaved.push(day)

      } else if (row.existingId) {
        const { error } = await supabase
          .from('operating_hours')
          .delete()
          .eq('id', row.existingId)
        if (error) {
          setRows(prev => prev.map((r, i) => i === day ? { ...r, error: error.message } : r))
          continue
        }
        setRows(prev => prev.map((r, i) => i === day ? { ...r, existingId: undefined } : r))
        newlySaved.push(day)
      }
    }

    setSaving(false)
    setSavedDays(newlySaved)
    setTimeout(() => setSavedDays([]), 4000)
  }

  const hasErrors = rows.some(r => r.error)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Operating Hours — {court.name}</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure open/close times, slot duration, and optional peak pricing per day
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {DAY_NAMES.map((dayName, i) => {
          const row = rows[i]
          const justSaved = savedDays.includes(i)

          return (
            <div
              key={dayName}
              className={`px-6 py-4 space-y-3 transition-colors ${justSaved ? 'bg-green-50' : ''}`}
            >
              {/* Day toggle + base schedule */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 w-28 flex-shrink-0">
                  <input
                    type="checkbox"
                    id={`day-${court.id}-${i}`}
                    checked={row.enabled}
                    onChange={e => update(i, { enabled: e.target.checked })}
                    className="w-4 h-4 accent-green-600"
                  />
                  <label
                    htmlFor={`day-${court.id}-${i}`}
                    className="text-sm font-medium text-gray-700 select-none"
                  >
                    {dayName}
                  </label>
                  {justSaved && (
                    <span className="text-green-600 text-xs font-semibold">✓</span>
                  )}
                </div>

                {row.enabled ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-10">Open</label>
                      <input
                        type="time"
                        value={row.open_time}
                        onChange={e => update(i, { open_time: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-10">Close</label>
                      <input
                        type="time"
                        value={row.close_time}
                        onChange={e => update(i, { close_time: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-8">Slot</label>
                      <select
                        value={row.slot_duration_minutes}
                        onChange={e => update(i, { slot_duration_minutes: Number(e.target.value) })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value={30}>30 min</option>
                        <option value={60}>60 min</option>
                        <option value={90}>90 min</option>
                        <option value={120}>2 hrs</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Closed</span>
                )}
              </div>

              {/* Peak pricing */}
              {row.enabled && (
                <div className="ml-7 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`peak-${court.id}-${i}`}
                      checked={row.peak_enabled}
                      onChange={e => update(i, { peak_enabled: e.target.checked })}
                      className="w-3.5 h-3.5 accent-orange-500"
                    />
                    <label
                      htmlFor={`peak-${court.id}-${i}`}
                      className="text-xs font-semibold text-orange-600 select-none"
                    >
                      Peak hour pricing
                    </label>
                  </div>

                  {row.peak_enabled && (
                    <div className="flex flex-wrap items-center gap-3 pl-5 py-2 bg-orange-50 border border-orange-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-8">From</label>
                        <input
                          type="time"
                          value={row.peak_start_time}
                          onChange={e => update(i, { peak_start_time: e.target.value })}
                          className="border border-orange-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 w-8">To</label>
                        <input
                          type="time"
                          value={row.peak_end_time}
                          onChange={e => update(i, { peak_end_time: e.target.value })}
                          className="border border-orange-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 whitespace-nowrap">Peak rate (THB/hr)</label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={row.peak_hourly_rate}
                          onChange={e => update(i, { peak_hourly_rate: e.target.value })}
                          placeholder={`e.g. ${Math.round(court.hourly_rate * 1.5)}`}
                          className="border border-orange-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        />
                      </div>
                      {/* Live preview */}
                      {row.peak_hourly_rate && parseFloat(row.peak_hourly_rate) > 0 && (
                        <div className="text-xs text-orange-700 bg-orange-100 px-3 py-1 rounded-lg">
                          Off-peak {formatPrice(court.hourly_rate)}/hr
                          {' → '}
                          Peak {formatPrice(parseFloat(row.peak_hourly_rate))}/hr
                          {' ('}
                          +{Math.round((parseFloat(row.peak_hourly_rate) / court.hourly_rate - 1) * 100)}%
                          {')'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Row-level error */}
              {row.error && (
                <div className="ml-7 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {row.error}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 text-sm"
        >
          {saving ? 'Saving…' : 'Save Schedule'}
        </button>
        {savedDays.length > 0 && !hasErrors && (
          <span className="text-green-600 text-sm font-medium">
            ✓ Saved {savedDays.length} day{savedDays.length > 1 ? 's' : ''}
          </span>
        )}
        {hasErrors && (
          <span className="text-red-600 text-sm">Fix errors above before saving.</span>
        )}
      </div>
    </div>
  )
}
