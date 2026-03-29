-- ############################################################
-- SMARTKONTA - SEED MASTER & ULTRA PLANS (V1)
-- Execute este script no SQL Editor do Supabase
-- ############################################################

BEGIN;

-- 1. Remover restrição antiga que limitava os slugs
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_slug_check;

-- 2. Adicionar nova restrição (opcional, mas recomendado)
ALTER TABLE public.plans ADD CONSTRAINT plans_slug_check 
CHECK (slug IN ('basic', 'pro', 'master', 'ultra', 'family'));

-- 3. Garante que a coluna slug seja única para podermos fazer UPSERT
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_slug_key' OR conname = 'plans_slug_unique') THEN
        ALTER TABLE public.plans ADD CONSTRAINT plans_slug_unique UNIQUE (slug);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Limpeza opcional de nomes duplicados antes do UPSERT
-- (Opcional, se houver planos com o mesmo slug mas IDs diferentes)

-- 3. UPSERT dos Planos (Sincronizado com AdminPlansComponent)
INSERT INTO public.plans (slug, name, description, price, is_active, restrictions, resources, features)
VALUES 
('basic', 'Basic', 'Plano inicial com recursos essenciais', 9.90, true, 
  '{"max_accounts": 2, "max_cards": 1}', 
  '{"account_transfers": false, "goals": false, "loans": false, "investments": false, "whatsapp_entries": false, "shared_accounts": false}',
  '["2 contas", "1 cartao"]'),

('pro', 'Pro', 'Plano completo para uso individual', 29.90, true, 
  '{"max_accounts": 5, "max_cards": 3}', 
  '{"account_transfers": true, "goals": false, "loans": false, "investments": false, "whatsapp_entries": false, "shared_accounts": false}',
  '["5 contas", "3 cartoes", "Transferencias entre contas"]'),

('master', 'Master', 'Plano com recursos master', 49.90, true, 
  '{"max_accounts": null, "max_cards": null}', 
  '{"account_transfers": true, "goals": true, "loans": true, "investments": true, "whatsapp_entries": true, "shared_accounts": false}',
  '["Contas ilimitadas", "Cartoes ilimitados", "Transferencias entre contas", "Metas", "Investimentos", "WhatsApp"]'),

('ultra', 'Ultra', 'Plano ultra para uso individual', 79.90, true, 
  '{"max_accounts": null, "max_cards": null}', 
  '{"account_transfers": true, "goals": true, "loans": true, "investments": true, "whatsapp_entries": true, "shared_accounts": false}',
  '["Contas ilimitadas", "Cartoes ilimitados", "Tudo do Master", "Suporte prioritário"]'),

('family', 'Family', 'Plano completo para familias com uso compartilhado', 99.90, true, 
  '{"max_accounts": null, "max_cards": null}', 
  '{"account_transfers": true, "goals": true, "loans": true, "investments": true, "whatsapp_entries": true, "shared_accounts": true}',
  '["Contas ilimitadas", "Cartoes ilimitados", "Contas compartilhadas", "Tudo do Ultra"]')

ON CONFLICT (slug) 
DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  restrictions = EXCLUDED.restrictions,
  resources = EXCLUDED.resources,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- 4. Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

COMMIT;
