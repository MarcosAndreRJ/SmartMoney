-- ============================================================
-- SMARTMONEY - GET ALL USERS FUNCTION
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Função RPC para buscar todos os usuários do auth.users
-- Esta função permite listar usuários via API sem acesso direto ao auth.users

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    role TEXT,
    full_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        au.email::TEXT,
        au.created_at,
        COALESCE(
            au.raw_user_meta_data->>'role',
            au.raw_app_meta_data->>'role',
            'user'
        )::TEXT as role,
        COALESCE(
            au.raw_user_meta_data->>'full_name',
            ''
        )::TEXT as full_name,
        COALESCE(
            au.raw_user_meta_data->>'avatar_url',
            ''
        )::TEXT as avatar_url
    FROM auth.users au
    ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Testar a função:
SELECT * FROM get_all_users();
