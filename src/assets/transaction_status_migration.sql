-- ############################################################
-- SMARTMONEY - TRANSACTION STATUS MIGRATION
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. Adicionar coluna de status na tabela transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_status_check CHECK (status IN ('confirmed', 'pending', 'cancelled'));

-- 2. Atualizar transações existentes para 'confirmed' (caso já não estejam)
UPDATE public.transactions SET status = 'confirmed' WHERE status IS NULL;

-- 3. Adicionar índice para busca por status
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- ############################################################
-- INSTRUÇÕES:
-- O scheduler passará a gerar transações com status 'pending'.
-- O usuário poderá confirmar o pagamento alterando o status para 'confirmed'.
-- ############################################################
