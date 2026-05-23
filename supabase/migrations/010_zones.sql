-- ============================================================
-- 010: Location zones
-- Admins define zones (e.g. "Sukhumvit", "Lat Phrao", "Chiang Mai").
-- Each venue belongs to one zone. Customers can filter venues by zone.
-- ============================================================

CREATE TABLE IF NOT EXISTS zones (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES zones(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'zones' AND policyname = 'zones: public read'
  ) THEN
    CREATE POLICY "zones: public read" ON zones FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'zones' AND policyname = 'zones: admin write'
  ) THEN
    CREATE POLICY "zones: admin write" ON zones FOR ALL
      USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;
