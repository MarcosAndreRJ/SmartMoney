-- ############################################################
-- SMARTMONEY - RECURRING TRANSACTIONS SETUP
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. TABELA DE TRANSAÇÕES RECORRENTES
CREATE TABLE IF NOT EXISTS public.recurring_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('Mensal', 'Semanal', 'Anual', 'Diário')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    early_alert_days INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('fixed', 'installment')),
    installments_total INTEGER, -- NULL para fixo
    installments_paid INTEGER DEFAULT 0,
    icon TEXT DEFAULT 'payments',
    color TEXT DEFAULT '#0F172A',
    bg_color TEXT DEFAULT '#F8FAFC',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. HABILITAR RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE SEGURANÇA
CREATE POLICY "Users can manage their own recurring transactions" 
ON public.recurring_transactions FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_recurring_user_id ON public.recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_is_active ON public.recurring_transactions(is_active);

-- 5. TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_recurring_transactions_updated_at
    BEFORE UPDATE ON public.recurring_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
