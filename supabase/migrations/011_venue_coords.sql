-- 011: Add lat/lng coordinates to venues for map display
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS lat numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS lng numeric(10, 7) NULL;
