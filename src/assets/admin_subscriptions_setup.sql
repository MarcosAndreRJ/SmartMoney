-- ============================================================
-- SMARTMONEY - ADMIN SUBSCRIPTIONS SETUP
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela de Planos
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    features JSONB DEFAULT '[]',
    limits JSONB DEFAULT '{"transactions": 1000, "accounts": 10}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'trial' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    payment_gateway TEXT CHECK (payment_gateway IN ('pagarme', 'stripe', 'manual')),
    gateway_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Notificações de Sistema (Admin → Usuário)
CREATE TABLE IF NOT EXISTS public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'in_app' CHECK (type IN ('email', 'push', 'in_app')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar RLS em todas
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (usando raw_user_meta_data - Opção B)
-- Plans: Admins podem ver/editar
CREATE POLICY "Admins can manage plans" ON public.plans
    FOR ALL TO authenticated
    USING (
        (auth.jwt()->>'raw_user_meta_data'->>'role') = 'admin'
    );

-- Subscriptions: Admins veem todas, usuários só veem suas
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
    FOR ALL TO authenticated
    USING (
        (auth.jwt()->>'raw_user_meta_data'->>'role') = 'admin'
    );

-- System Notifications: Admins podem criar, usuários veem suas
CREATE POLICY "Users can view own notifications" ON public.system_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage notifications" ON public.system_notifications
    FOR ALL TO authenticated
    USING (
        (auth.jwt()->>'raw_user_meta_data'->>'role') = 'admin'
    );

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_system_notifications_user_id ON public.system_notifications(user_id);

-- 7. Função para buscar métricas (usada pelo AdminService)
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_users', (SELECT COUNT(*) FROM auth.users),
        'active_users', (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
        'new_users_today', (
            SELECT COUNT(*) FROM auth.users 
            WHERE created_at >= CURRENT_DATE
        ),
        'total_transactions', (SELECT COUNT(*) FROM public.transactions),
        'total_balance', (
            SELECT COALESCE(SUM(initial_balance), 0) FROM public.accounts
        ),
        'active_subscriptions', (
            SELECT COUNT(*) FROM public.subscriptions WHERE status = 'active'
        ),
        'revenue_month', (
            SELECT COALESCE(SUM(p.price), 0)
            FROM public.subscriptions s
            JOIN public.plans p ON s.plan_id = p.id
            WHERE s.status = 'active'
        ),
        'subscriptions_by_plan', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'plan', plan_name,
                'count', cnt
            )), '[]'::jsonb)
            FROM (
                SELECT p.name as plan_name, COUNT(s.id) as cnt
                FROM public.subscriptions s
                JOIN public.plans p ON s.plan_id = p.id
                WHERE s.status = 'active'
                GROUP BY p.name
            ) sub
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DADOS INICIAIS - Planos Padrão
-- ============================================================
INSERT INTO public.plans (name, description, price, features, limits) VALUES
('Gratuito', 'Plano básico para começar', 0, 
    '["1 conta bancária", "100 transações/mês", "Categorias básicas"]'::jsonb,
    '{"transactions": 100, "accounts": 1}'::jsonb
),
('Pro', 'Para usuários avançados', 29.90,
    '["Contas ilimitadas", "Transações ilimitadas", "Cartões de crédito", "Empréstimos", "Metas", "Transferências PIX"]'::jsonb,
    '{"transactions": 999999, "accounts": 999}'::jsonb
),
('Empresarial', 'Para pequenas empresas', 99.90,
    '["Tudo do Pro", "Contas compartilhadas", "Relatórios avançados", "API Access", "Suporte prioritário"]'::jsonb,
    '{"transactions": 999999, "accounts": 999}'::jsonb
) ON CONFLICT DO NOTHING;

-- ============================================================
-- INTEGRAÇÃO PAGAR.ME - PASSOS PARA CONFIGURAÇÃO
-- ============================================================
/*
PASSO 1: Obter credenciais Pagar.me
- Acesse https://dashboard.pagar.me
- Crie uma conta de teste (sandbox)
- Copie API Key e Encryption Key

PASSO 2: Configurar Webhooks no Pagar.me
- Acesse Settings > Webhooks
- Adicione endpoint: https://seu-projeto.supabase.co/functions/v1/pagarme-webhook
- Eventos: subscription_activated, subscription_cancelled, subscription_paid

PASSO 3: Criar Edge Function no Supabase
- Execute: supabase functions new pagarme-webhook
- Implemente verificação de assinatura do Pagar.me
- Atualize status da assinatura baseado nos eventos

PASSO 4: Variáveis de Ambiente
- Configure no Supabase Dashboard > Settings > Edge Functions:
  - PAGARME_API_KEY: sua_api_key
  - PAGARME_ENCRYPTION_KEY: sua_encryption_key
*/

-- ============================================================
-- INTEGRAÇÃO STRIPE - ALTERNATIVA
-- ============================================================
/*
PASSO 1: Obter credenciais Stripe
- Acesse https://dashboard.stripe.com
- Ative modo de teste primeiro
- Copie Secret Key e Webhook Secret

PASSO 2: Configurar Stripe CLI para testes
- Baixe Stripe CLI
- Execute: stripe listen --forward-to localhost:54321/rest/v1/rpc/stripe_webhook

PASSO 3: Criar Edge Function
- Execute: supabase functions new stripe-webhook
- Configure verificação de assinatura
- Atualize subscriptions baseado nos eventos
*/
