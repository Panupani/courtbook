export type UserRole = 'customer' | 'admin' | 'venue_admin'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  created_at: string
}

export interface Venue {
  id: string
  name: string
  address: string
  description: string | null
  image_url: string | null
  promptpay_id: string | null
  platform_fee_rate: number   // e.g. 0.05 = 5%
  is_active: boolean
  created_at: string
}

export interface Court {
  id: string
  venue_id: string
  name: string
  description: string | null
  image_url: string | null
  hourly_rate: number
  is_active: boolean
  created_at: string
  venue?: Venue
}

export interface OperatingHours {
  id: string
  court_id: string
  day_of_week: number          // 0=Sun … 6=Sat
  open_time: string            // HH:MM
  close_time: string           // HH:MM
  slot_duration_minutes: number
  peak_start_time: string | null  // HH:MM — null = no peak pricing
  peak_end_time: string | null    // HH:MM
  peak_hourly_rate: number | null // rate during peak; null = same as court rate
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'
export type PaymentMethod = 'card' | 'promptpay' | 'cash'
export type PaymentStatus = 'unpaid' | 'pending' | 'paid'

export interface Booking {
  id: string
  user_id: string
  court_id: string
  booking_date: string  // YYYY-MM-DD
  start_time: string    // HH:MM
  end_time: string      // HH:MM
  total_price: number
  status: BookingStatus
  notes: string | null
  group_id: string | null
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  payment_slip_url: string | null
  transaction_id: string | null
  platform_fee_amount: number
  checked_in_at: string | null
  created_at: string
  court?: Court
  profile?: Profile
}

export interface TimeSlot {
  start: string      // HH:MM
  end: string        // HH:MM
  label: string      // e.g. "08:00 – 09:00"
  available: boolean
  isPeak: boolean
  price: number      // pre-calculated price for this slot
}
