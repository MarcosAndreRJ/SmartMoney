-- Loans Feature Setup
-- Run this in Supabase SQL Editor

-- =============================================
-- TABLE: loans
-- =============================================
CREATE TABLE IF NOT EXISTS loans (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor_name       TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('fixed', 'interest')),
  initial_amount      NUMERIC(12,2) NOT NULL,
  current_balance     NUMERIC(12,2) NOT NULL,
  monthly_rate        NUMERIC(6,4),          -- for interest type only (e.g., 3.50 = 3.5%)
  total_installments  INTEGER,               -- for fixed type only
  paid_installments   INTEGER DEFAULT 0,
  installment_amount  NUMERIC(12,2),         -- for fixed type (initial_amount / total_installments)
  due_day             INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  start_date          DATE NOT NULL,
  status              TEXT DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue')),
  total_paid          NUMERIC(12,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLE: loan_payments
-- =============================================
CREATE TABLE IF NOT EXISTS loan_payments (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id             UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id          UUID REFERENCES accounts(id) ON DELETE SET NULL,
  payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_paid         NUMERIC(12,2) NOT NULL,
  interest_portion    NUMERIC(12,2) DEFAULT 0,
  principal_portion   NUMERIC(12,2) DEFAULT 0,
  installment_number  INTEGER,               -- for fixed type
  balance_before      NUMERIC(12,2),
  balance_after       NUMERIC(12,2),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS: loans
-- =============================================
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own loans" ON loans;
CREATE POLICY "Users select own loans"
  ON loans FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own loans" ON loans;
CREATE POLICY "Users insert own loans"
  ON loans FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own loans" ON loans;
CREATE POLICY "Users update own loans"
  ON loans FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own loans" ON loans;
CREATE POLICY "Users delete own loans"
  ON loans FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- RLS: loan_payments
-- =============================================
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own loan_payments" ON loan_payments;
CREATE POLICY "Users select own loan_payments"
  ON loan_payments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own loan_payments" ON loan_payments;
CREATE POLICY "Users insert own loan_payments"
  ON loan_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own loan_payments" ON loan_payments;
CREATE POLICY "Users delete own loan_payments"
  ON loan_payments FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_user ON loan_payments(user_id);
