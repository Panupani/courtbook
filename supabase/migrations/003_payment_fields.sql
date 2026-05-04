-- Add payment tracking columns to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method text
    CHECK (payment_method IN ('card', 'promptpay', 'cash')),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid'));
