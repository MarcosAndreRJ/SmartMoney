-- ############################################################
-- SMARTMONEY - CREDIT CARD TRANSACTIONS MIGRATION
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. Criar tabela exclusiva para lancamentos de cartao de credito
CREATE TABLE IF NOT EXISTS public.credit_card_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    card_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMPTZ DEFAULT now(),
    category TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- 3. Politicas de seguranca
DROP POLICY IF EXISTS "Users can manage their own credit card transactions" ON public.credit_card_transactions;

CREATE POLICY "Users can manage their own credit card transactions"
ON public.credit_card_transactions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Indices
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_user_id ON public.credit_card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_card_id ON public.credit_card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_date ON public.credit_card_transactions(date DESC);

-- ############################################################
-- OBS:
-- Os gastos de cartao ficam nesta tabela.
-- O impacto no caixa geral ocorre apenas em transactions,
-- no momento de lancar/pagar a fatura.
-- ############################################################
