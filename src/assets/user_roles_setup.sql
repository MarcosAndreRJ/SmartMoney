-- ############################################################
-- SMARTMONEY - USER ROLES SETUP
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. Adicionar coluna de perfil/role na tabela de profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Adicionar role também ao campo de metadados da conta recorrente
ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- ############################################################
-- SCRIPT: Criar usuário padrão admin marcos@xqx.com.br
-- INSTRUÇÕES: Execute no SQL Editor > separado do script de update
-- ATENÇÃO: Este script usa a função auth.create_user que requer
-- permissão de service_role. Execute com cautela.
-- ############################################################

-- Criar usuário via função administrative (requer service role)
-- Se preferir, crie via Dashboard > Authentication > Users
/* 
SELECT auth.create_user(
  '{"email": "marcos@xqx.com.br", "password": "123456", "email_confirm": true}'
);
*/

-- Após criar o usuário, marque-o como admin:
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'marcos@xqx.com.br';
