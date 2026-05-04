-- Extend role enum to include venue_admin
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'admin', 'venue_admin'));

-- Venue admin → venue assignments (one admin can manage multiple venues)
CREATE TABLE IF NOT EXISTS venue_admin_assignments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id   uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, venue_id)
);

ALTER TABLE venue_admin_assignments ENABLE ROW LEVEL SECURITY;

-- Only system admins can manage assignments
CREATE POLICY "system admins manage venue assignments"
  ON venue_admin_assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Venue admins can read their own assignments
CREATE POLICY "venue admins read own assignments"
  ON venue_admin_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());
