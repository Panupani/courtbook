-- Farm income/expense tracking
CREATE TABLE farm_transactions (
  id               UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT           NOT NULL CHECK (type IN ('income', 'expense')),
  category         TEXT           NOT NULL,
  amount           DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  description      TEXT,
  transaction_date DATE           NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE farm_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farm_own_select" ON farm_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "farm_own_insert" ON farm_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "farm_own_update" ON farm_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "farm_own_delete" ON farm_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX farm_transactions_user_date ON farm_transactions (user_id, transaction_date DESC);
