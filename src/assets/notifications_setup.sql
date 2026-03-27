-- ############################################################
-- SMARTMONEY - NOTIFICATIONS SETUP
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- 1. Criação da Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('success', 'alert', 'info')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    bg_color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (Somente o dono pode ver e atualizar suas notificações)
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
    ON public.notifications FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
    ON public.notifications FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. Índices para performance (buscas frequentes por usuário e data, e notificações não lidas)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE is_read = false;

-- 5. Função Utilitária para Criar Notificações (Pode ser chamada por Triggers no futuro)
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_description TEXT,
    p_icon TEXT,
    p_color TEXT,
    p_bg_color TEXT
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, type, title, description, icon, color, bg_color)
    VALUES (p_user_id, p_type, p_title, p_description, p_icon, p_color, p_bg_color)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
