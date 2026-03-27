-- ############################################################
-- SMARTMONEY - GOALS SETUP
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. TABELA DE METAS
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    deadline DATE NOT NULL,
    frequency TEXT DEFAULT 'mensal',
    icon TEXT DEFAULT 'flag',
    color TEXT DEFAULT '#10B981',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Users can manage their own goals" 
ON public.goals FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 2. TABELA DE APORTES (CONTRIBUIÇÕES PARA METAS)
CREATE TABLE IF NOT EXISTS public.goal_contributions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    category TEXT,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Users can manage their own goal contributions" 
ON public.goal_contributions FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON public.goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON public.goal_contributions(goal_id);

-- 4. TRIGGER PARA UPDATED_AT EM GOALS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
