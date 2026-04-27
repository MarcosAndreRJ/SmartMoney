-- Optimization for Forecast Engine and Data Integrity
-- 2026-04-23

-- 1. Index for deduplication of recurring transactions in Forecast Engine
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_source_id ON public.transactions(recurring_source_id);

-- 2. Index for filtering card transactions in Forecast Engine
CREATE INDEX IF NOT EXISTS idx_card_transactions_user_date ON public.credit_card_transactions(user_id, date);

-- 3. Index for loan tracking
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);

-- 4. Ensure RLS for new indexes if needed (indexes don't need RLS, but standard columns do)
-- No changes needed to RLS for these.

-- 5. Performance for Dashboard/Forecast
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_status ON public.transactions(user_id, date, status);
