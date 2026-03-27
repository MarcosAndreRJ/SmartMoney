-- ############################################################
-- SMARTMONEY - RECURRING SCHEDULER SETUP
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. Adicionar coluna de controle de geração à tabela recurring_transactions
ALTER TABLE public.recurring_transactions 
  ADD COLUMN IF NOT EXISTS last_generated_date DATE;

-- 2. Adicionar coluna de vínculo na tabela transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS recurring_source_id UUID REFERENCES public.recurring_transactions(id) ON DELETE SET NULL;

-- 3. Adicionar conta vinculada por transação recorrente
ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 4. Índice para busca por source_id
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_source ON public.transactions(recurring_source_id);

-- ############################################################
-- INSTRUÇÕES:
-- Após executar este script, o sistema Angular irá:
-- 1. Verificar recorrentes ativas ao abrir o app
-- 2. Calcular se uma nova entrada é devida baseado na frequência
-- 3. Criar entradas em 'transactions' automaticamente
-- 4. Atualizar last_generated_date após cada geração
-- ############################################################
