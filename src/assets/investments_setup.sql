-- ############################################################
-- SMARTMONEY - INVESTMENTS SETUP
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. Criação da Tabela de Investimentos (Ativos)
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL, -- Ex: "S&P 500 ETF (VOO)", "Tesouro Selic 2029"
    category TEXT NOT NULL CHECK (category IN ('AÇÕES', 'FIIS', 'CRIPTO', 'RENDA FIXA', 'OUTROS')),
    initial_amount NUMERIC DEFAULT 0,
    current_amount NUMERIC DEFAULT 0,
    expected_yield NUMERIC DEFAULT 0, -- Porcentagem, ex: 5.0
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criação da Tabela de Transações de Investimentos (Aportes/Retiradas/Rendimentos)
CREATE TABLE IF NOT EXISTS public.investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID REFERENCES public.investments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL, -- Conta de origem (opcional)
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'yield', 'adjustment')),
    amount NUMERIC NOT NULL,
    date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (Investimentos)
CREATE POLICY "Users can manage their own investments" 
    ON public.investments FOR ALL 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Políticas de Segurança (Transações de Investimento)
CREATE POLICY "Users can manage their own investment transactions" 
    ON public.investment_transactions FOR ALL 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_inv_id ON public.investment_transactions(investment_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_user_id ON public.investment_transactions(user_id);
