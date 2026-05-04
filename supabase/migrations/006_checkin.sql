-- Add check-in timestamp to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at timestamptz DEFAULT NULL;
