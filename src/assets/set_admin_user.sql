-- ############################################################
-- SMARTMONEY - ATUALIZAR USUÁRIO EXISTENTE COMO ADMIN
-- Execute no SQL Editor do Supabase
-- ############################################################

-- Atualizar usuário existente marcos@xqx.com.br como admin
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'marcos@xqx.com.br';

-- Confirmação
SELECT id, email, full_name, role, created_at
FROM public.profiles 
WHERE email = 'marcos@xqx.com.br';
