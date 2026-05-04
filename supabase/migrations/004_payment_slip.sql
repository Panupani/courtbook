-- Store uploaded payment slip URL for audit trail
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_slip_url text;
