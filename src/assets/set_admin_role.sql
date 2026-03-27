-- ============================================================
-- SMARTMONEY - ADMIN ROLE SETUP (Opção B)
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- INSTRUÇÕES PARA DEFINIR ADMIN
-- ============================================================

-- Para definir um usuário como admin, execute:

-- 1. Primeiro, encontre o usuário pelo email:
SELECT id, email, raw_user_meta_data, raw_app_meta_data
FROM auth.users 
WHERE email = 'seu-email@exemplo.com';

-- 2. Atualize o user_metadata para incluir role: 'admin':
-- O Supabase armazena em raw_user_meta_data como JSON
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    '{"role": "admin"}'::jsonb,
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    '{"role": "admin"}'::jsonb
WHERE email = 'seu-email@exemplo.com';

-- 3. Verificar se funcionou:
SELECT id, email, 
       raw_user_meta_data->>'role' as role,
       raw_app_meta_data->>'role' as app_role
FROM auth.users 
WHERE email = 'seu-email@exemplo.com';

-- ============================================================
-- EXEMPLO: Tornar o usuário marcos@xqx.com.br como admin
-- ============================================================
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    '{"role": "admin"}'::jsonb,
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    '{"role": "admin"}'::jsonb
WHERE email = 'marcos@xqx.com.br';

-- ============================================================
-- VERIFICAR TODOS OS ADMINS
-- ============================================================
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'admin'
   OR raw_app_meta_data->>'role' = 'admin';
