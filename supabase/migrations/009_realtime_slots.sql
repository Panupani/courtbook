-- ============================================================
-- 009: Real-time slot availability via postgres_changes
-- ============================================================
-- Slot availability (which courts/times are taken) is PUBLIC knowledge.
-- The sensitive PII (customer name, phone) lives in the profiles table,
-- not in bookings. Widening the SELECT policy lets Supabase Realtime
-- deliver booking INSERT/UPDATE events to any authenticated client so
-- VenueBookingGrid can react instantly without polling.

-- 1. Replace the "own rows only" SELECT policy with a policy that lets
--    any authenticated user read all booking rows.
DROP POLICY IF EXISTS "bookings: customer reads own" ON bookings;

CREATE POLICY "bookings: authenticated read all"
  ON bookings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 2. Add the bookings table to the Supabase Realtime publication so that
--    postgres_changes events are emitted for INSERT / UPDATE / DELETE.
--    (Safe to run multiple times — ALTER PUBLICATION ADD TABLE is idempotent
--    in the sense that it fails silently if the table is already a member.)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already added, ignore
END;
$$;
