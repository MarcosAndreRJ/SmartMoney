-- ============================================================
-- SMARTMONEY - MIGRACAO DE PLANOS (RECURSOS E RESTRICOES)
-- Execute este script no SQL Editor do Supabase
-- Idempotente: pode ser executado mais de uma vez sem erro
-- ============================================================

BEGIN;

-- 1) Nova estrutura para planos
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS restrictions JSONB DEFAULT '{"max_accounts": null, "max_cards": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '{
    "account_transfers": false,
    "goals": false,
    "loans": false,
    "investments": false,
    "whatsapp_entries": false,
    "shared_accounts": false
  }'::jsonb;

-- 2) Slug validado por tipo de plano
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'plans_slug_check'
  ) THEN
    ALTER TABLE public.plans
      ADD CONSTRAINT plans_slug_check CHECK (slug IN ('basic', 'pro', 'family'));
  END IF;
END $$;

-- 3) Backfill de slug com base no nome atual
UPDATE public.plans
SET slug = CASE
  WHEN lower(name) LIKE '%family%' OR lower(name) LIKE '%famil%' THEN 'family'
  WHEN lower(name) LIKE '%pro%' THEN 'pro'
  WHEN lower(name) LIKE '%gratuito%' OR lower(name) LIKE '%free%' OR lower(name) LIKE '%basic%' THEN 'basic'
  ELSE 'basic'
END
WHERE slug IS NULL;

-- 4) Limpar duplicatas de slug (mantem o registro com maior price ou mais recente)
DELETE FROM public.plans a
USING public.plans b
WHERE a.id < b.id
  AND a.slug = b.slug;

-- 5) Criar constraint unica no slug (nao pode ser parcial, necessario para ON CONFLICT)
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_slug_unique;
ALTER TABLE public.plans ADD CONSTRAINT plans_slug_unique UNIQUE (slug);

-- 6) Backfill de restrictions
UPDATE public.plans
SET restrictions = CASE slug
  WHEN 'basic' THEN '{"max_accounts": 2, "max_cards": 1}'::jsonb
  WHEN 'pro'   THEN '{"max_accounts": null, "max_cards": null}'::jsonb
  WHEN 'family' THEN '{"max_accounts": null, "max_cards": null}'::jsonb
  ELSE restrictions
END
WHERE restrictions IS NULL
   OR restrictions = '{}'::jsonb;

-- 7) Backfill de resources
UPDATE public.plans
SET resources = CASE slug
  WHEN 'basic' THEN '{
    "account_transfers": true,
    "goals": false,
    "loans": false,
    "investments": false,
    "whatsapp_entries": false,
    "shared_accounts": false
  }'::jsonb
  WHEN 'pro' THEN '{
    "account_transfers": false,
    "goals": true,
    "loans": true,
    "investments": true,
    "whatsapp_entries": true,
    "shared_accounts": false
  }'::jsonb
  WHEN 'family' THEN '{
    "account_transfers": false,
    "goals": true,
    "loans": true,
    "investments": true,
    "whatsapp_entries": true,
    "shared_accounts": true
  }'::jsonb
  ELSE resources
END
WHERE resources IS NULL
   OR resources = '{}'::jsonb;

-- 8) Atualizar colunas legadas para compatibilidade
UPDATE public.plans
SET limits = jsonb_build_object(
  'accounts', (restrictions->>'max_accounts')::int,
  'cards',    (restrictions->>'max_cards')::int
)
WHERE limits IS NULL
   OR limits = '{}'::jsonb;



-- 9) Upsert dos planos padrao (um por slug)
ALTER TABLE public.plans ADD CONSTRAINT plans_slug_unique UNIQUE (slug);

INSERT INTO public.plans (slug, name, description, price, restrictions, resources, features, is_active)
VALUES
(
  'basic',
  'Basic',
  'Plano inicial com recursos essenciais',
  0,
  '{"max_accounts": 2, "max_cards": 1}'::jsonb,
  '{"account_transfers": true, "goals": false, "loans": false, "investments": false, "whatsapp_entries": false, "shared_accounts": false}'::jsonb,
  '["2 contas", "1 cartao", "Transferencias entre contas"]'::jsonb,
  true
),
(
  'pro',
  'Pro',
  'Plano completo para uso individual',
  29.90,
  '{"max_accounts": null, "max_cards": null}'::jsonb,
  '{"account_transfers": false, "goals": true, "loans": true, "investments": true, "whatsapp_entries": true, "shared_accounts": false}'::jsonb,
  '["Contas ilimitadas", "Cartoes ilimitados", "Cadastro de metas", "Controle de emprestimos", "Controle de investimentos", "Lancamentos por WhatsApp"]'::jsonb,
  true
),
(
  'family',
  'Family',
  'Plano completo para familias com uso compartilhado',
  49.90,
  '{"max_accounts": null, "max_cards": null}'::jsonb,
  '{"account_transfers": false, "goals": true, "loans": true, "investments": true, "whatsapp_entries": true, "shared_accounts": true}'::jsonb,
  '["Contas ilimitadas", "Cartoes ilimitados", "Cadastro de metas", "Controle de emprestimos", "Controle de investimentos", "Contas compartilhadas", "Lancamentos por WhatsApp"]'::jsonb,
  true
)
ON CONFLICT (slug)
DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  price        = EXCLUDED.price,
  restrictions = EXCLUDED.restrictions,
  resources    = EXCLUDED.resources,
  features     = EXCLUDED.features,
  is_active    = EXCLUDED.is_active;

COMMIT;
