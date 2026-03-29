-- ############################################################
-- SMARTKONTA - FIX PLANS SCHEMA & RLS (V3)
-- Execute este script no SQL Editor do Supabase
-- ############################################################

BEGIN;

-- 1. ADICIONAR COLUNAS FALTANTES (CASO NÃO EXISTAM)
-- Isso garante que o sistema consiga salvar os novos campos de restrições e recursos.

ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS restrictions JSONB 
DEFAULT '{"max_accounts": null, "max_cards": null}';

ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS resources JSONB 
DEFAULT '{
  "account_transfers": true, 
  "goals": true, 
  "loans": true, 
  "investments": true, 
  "whatsapp_entries": true, 
  "shared_accounts": true
}';

-- 2. CORRIGIR POLÍTICAS DE RLS (SEGURANÇA)
-- Garante que admins autenticados tenham permissão total de alteração.

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;

CREATE POLICY "Admins can manage plans" ON public.plans
    FOR ALL TO authenticated
    USING (
        ((auth.jwt() -> 'raw_user_meta_data'::text) ->> 'role'::text) = 'admin'::text OR
        ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
    )
    WITH CHECK (
        ((auth.jwt() -> 'raw_user_meta_data'::text) ->> 'role'::text) = 'admin'::text OR
        ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text
    );

-- 3. AJUSTES DE DADOS EXPERIMENTAIS
-- Garante que o slug não seja nulo para casos de busca.
UPDATE public.plans SET slug = lower(name) WHERE slug IS NULL;

-- 4. RECARREGAR CONFIGURAÇÕES DA API
NOTIFY pgrst, 'reload schema';

COMMIT;
