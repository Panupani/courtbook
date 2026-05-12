-- Migration 008: add transaction_id to bookings
-- Stores the bank-generated reference number extracted from PromptPay slips.
-- The unique partial index prevents the same slip being used for two bookings.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS transaction_id TEXT NULL;

-- Unique only when a value is present (NULL rows are never considered duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS unique_transaction_id
  ON bookings (transaction_id)
  WHERE transaction_id IS NOT NULL;
