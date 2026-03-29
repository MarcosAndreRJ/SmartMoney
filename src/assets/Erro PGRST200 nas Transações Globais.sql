BEGIN;

-- 0. Garantir que todos os usuários do auth.users existam na tabela public.profiles
INSERT INTO public.profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 1. Transações para Profiles
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS fk_transactions_profile;

ALTER TABLE public.transactions
  ADD CONSTRAINT fk_transactions_profile
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 2. Assinaturas para Profiles (Para não dar erro na tela de Assinaturas do Admin)
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS fk_subscriptions_profile;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT fk_subscriptions_profile
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 3. Contas para Profiles (Para segurança futura caso precise do nome do user nas contas)
ALTER TABLE public.accounts
  DROP CONSTRAINT IF EXISTS fk_accounts_profile;

ALTER TABLE public.accounts
  ADD CONSTRAINT fk_accounts_profile
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Atualizar o cache do esquema do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
