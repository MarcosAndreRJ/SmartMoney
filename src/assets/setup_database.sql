-- ############################################################
-- SMARTMONEY - DATABASE SETUP
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE CONTAS (ACCOUNTS)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    institution_name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment')),
    initial_balance NUMERIC DEFAULT 0,
    credit_limit NUMERIC DEFAULT 0,
    closing_date SMALLINT CHECK (closing_date BETWEEN 1 AND 31),
    due_date SMALLINT CHECK (due_date BETWEEN 1 AND 31),
    color TEXT DEFAULT '#0F172A',
    icon TEXT DEFAULT 'account_balance',
    is_main_account BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Contas)
CREATE POLICY "Users can manage their own accounts" 
ON public.accounts FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 3. TABELA DE TRANSAÇÕES (TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date TIMESTAMPTZ DEFAULT now(),
    category TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Transações)
CREATE POLICY "Users can manage their own transactions" 
ON public.transactions FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
