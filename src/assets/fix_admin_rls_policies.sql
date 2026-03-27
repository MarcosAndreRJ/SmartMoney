-- ============================================================
-- SMARTMONEY - FIX RLS POLICIES FOR PLANS & USERS
-- Execute este script no SQL Editor do Supabase
-- Corrige: sintaxe de extração do JWT
-- Adiciona: Politicas para usuarios normais acessarem plans e subscriptions
-- ============================================================

BEGIN;

-- ============================================================
-- PLANS - Politica para usuarios normais verem planos ativos
-- ============================================================
DROP POLICY IF EXISTS "Any authenticated can view plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;

CREATE POLICY "Any authenticated can view plans" ON public.plans
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Politica de admin (corrigida a sintaxe do JWT)
CREATE POLICY "Admins can manage plans" ON public.plans
    FOR ALL TO authenticated
    USING (
        COALESCE(
            (auth.jwt() ->> 'raw_user_meta_data')::jsonb ->> 'role',
            (auth.jwt() ->> 'raw_app_meta_data')::jsonb ->> 'role'
        ) = 'admin'
    );

-- ============================================================
-- SUBSCRIPTIONS - Politica para usuarios verem propria assinatura
-- ============================================================
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Inserir assinatura (usuario cria propria)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'subscriptions' AND policyname = 'Users can insert own subscription'
    ) THEN
        CREATE POLICY "Users can insert own subscription" ON public.subscriptions
            FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- Atualizar propria assinatura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'subscriptions' AND policyname = 'Users can update own subscription'
    ) THEN
        CREATE POLICY "Users can update own subscription" ON public.subscriptions
            FOR UPDATE TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
    END IF;
END $$;

-- ============================================================
-- SUBSCRIPTIONS - Politica admin
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
    FOR ALL TO authenticated
    USING (
        COALESCE(
            (auth.jwt() ->> 'raw_user_meta_data')::jsonb ->> 'role',
            (auth.jwt() ->> 'raw_app_meta_data')::jsonb ->> 'role'
        ) = 'admin'
    );

-- ============================================================
-- SYSTEM_NOTIFICATIONS - Politica admin
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.system_notifications;

CREATE POLICY "Admins can manage notifications" ON public.system_notifications
    FOR ALL TO authenticated
    USING (
        COALESCE(
            (auth.jwt() ->> 'raw_user_meta_data')::jsonb ->> 'role',
            (auth.jwt() ->> 'raw_app_meta_data')::jsonb ->> 'role'
        ) = 'admin'
    );

-- ============================================================
-- TRANSACTIONS - Adicionar politica admin se ainda nao existir
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'transactions' AND policyname = 'Admins can view all transactions'
    ) THEN
        CREATE POLICY "Admins can view all transactions" ON public.transactions
            FOR SELECT TO authenticated
            USING (
                COALESCE(
                    (auth.jwt() ->> 'raw_user_meta_data')::jsonb ->> 'role',
                    (auth.jwt() ->> 'raw_app_meta_data')::jsonb ->> 'role'
                ) = 'admin'
            );
    END IF;
END $$;

-- ============================================================
-- ACCOUNTS - Adicionar politica admin se ainda nao existir
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'accounts' AND policyname = 'Admins can view all accounts'
    ) THEN
        CREATE POLICY "Admins can view all accounts" ON public.accounts
            FOR SELECT TO authenticated
            USING (
                COALESCE(
                    (auth.jwt() ->> 'raw_user_meta_data')::jsonb ->> 'role',
                    (auth.jwt() ->> 'raw_app_meta_data')::jsonb ->> 'role'
                ) = 'admin'
            );
    END IF;
END $$;

COMMIT;