import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { OperatingHours, TimeSlot } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minsToTime(mins: number): string {
  return `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`
}

/**
 * Returns true if the slot's start time falls inside the peak window.
 * A slot starting exactly at peak_end is NOT peak.
 */
export function isSlotPeak(slotStart: string, hours: OperatingHours): boolean {
  if (!hours.peak_start_time || !hours.peak_end_time) return false
  const s = timeToMins(slotStart)
  const ps = timeToMins(hours.peak_start_time)
  const pe = timeToMins(hours.peak_end_time)
  return s >= ps && s < pe
}

/**
 * Calculate price for a slot, splitting minutes that overlap the peak window.
 * Uses the court's base hourly_rate for off-peak and peak_hourly_rate for peak.
 */
export function calcSlotPrice(
  startTime: string,
  endTime: string,
  baseRate: number,
  hours: OperatingHours
): number {
  if (!hours.peak_start_time || !hours.peak_end_time || !hours.peak_hourly_rate) {
    return calcPrice(startTime, endTime, baseRate)
  }

  const start = timeToMins(startTime)
  const end = timeToMins(endTime)
  const ps = timeToMins(hours.peak_start_time)
  const pe = timeToMins(hours.peak_end_time)

  // Overlap with peak window
  const peakStart = Math.max(start, ps)
  const peakEnd = Math.min(end, pe)
  const peakMins = Math.max(0, peakEnd - peakStart)
  const offPeakMins = (end - start) - peakMins

  const total =
    (offPeakMins / 60) * baseRate +
    (peakMins / 60) * hours.peak_hourly_rate

  return Math.round(total * 100) / 100
}

export function generateSlots(hours: OperatingHours, baseRate: number): TimeSlot[] {
  const slots: TimeSlot[] = []
  const openMins = timeToMins(hours.open_time)
  const closeMins = timeToMins(hours.close_time)
  const dur = hours.slot_duration_minutes

  for (let m = openMins; m + dur <= closeMins; m += dur) {
    const start = minsToTime(m)
    const end = minsToTime(m + dur)
    const peak = isSlotPeak(start, hours)
    slots.push({
      start,
      end,
      label: `${start} – ${end}`,
      available: true,  // caller overlays bookings
      isPeak: peak,
      price: calcSlotPrice(start, end, baseRate, hours),
    })
  }
  return slots
}

export function calcPrice(startTime: string, endTime: string, hourlyRate: number): number {
  const durationHours = (timeToMins(endTime) - timeToMins(startTime)) / 60
  return Math.round(durationHours * hourlyRate * 100) / 100
}

export function formatPrice(amount: number | null | undefined, currency = 'THB'): string {
  const n = (amount == null || isNaN(amount as number)) ? 0 : amount
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency }).format(n)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr + 'T00:00:00')
  if (isNaN(date.getTime())) return dateStr  // fallback: show raw string rather than "Invalid Date"
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ── PromptPay QR payload (EMVCo format) ──────────────────────────────
function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function tlv(tag: string, value: string) {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`
}

/**
 * Generate a PromptPay QR payload string.
 * @param target Phone number (e.g. "0812345678") or 13-digit national ID.
 * @param amount Amount in THB.
 */
export function promptPayPayload(target: string, amount: number): string {
  const digits = target.replace(/\D/g, '')
  
  // Tag 29 Sub-tags:
  // 00: AID (A000000677010111)
  // 01: Mobile (0066...)
  // 02: National ID (13 digits)
  
  let merchantInfo = tlv('00', 'A000000677010111')
  if (digits.length === 13 && (digits.startsWith('1') || digits.startsWith('2') || digits.startsWith('3') || digits.startsWith('4') || digits.startsWith('5') || digits.startsWith('6') || digits.startsWith('7') || digits.startsWith('8'))) {
    // National ID
    merchantInfo += tlv('02', digits)
  } else {
    // Mobile
    const mobile = '0066' + digits.replace(/^0/, '').replace(/^66/, '')
    merchantInfo += tlv('01', mobile.padStart(13, '0'))
  }

  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('29', merchantInfo) +
    tlv('53', '764') +
    tlv('54', amount.toFixed(2)) +
    tlv('58', 'TH') +
    '6304'
    
  return body + crc16(body)
}
