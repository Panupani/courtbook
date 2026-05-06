-- ── Migration 007: Prevent duplicate bookings at the database level ──────────
--
-- A partial unique index on (court_id, booking_date, start_time) where the
-- booking is NOT cancelled ensures that two concurrent INSERTs for the same
-- slot will race at the DB and exactly one will succeed — the other receives
-- a unique-violation error (23505) that the API converts to a 409 response.
--
-- "Partial" means cancelled bookings are excluded, so a cancelled slot can
-- be rebooked later without touching the index.

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_slot
  ON bookings (court_id, booking_date, start_time)
  WHERE status <> 'cancelled';
