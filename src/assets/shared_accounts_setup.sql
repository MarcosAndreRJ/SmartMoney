-- Shared Accounts and Invitations Setup

-- Table for shared access to accounts
CREATE TABLE IF NOT EXISTS public.account_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('Owner', 'Editor', 'Viewer')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(account_id, user_id)
);

-- Table for invitations
CREATE TABLE IF NOT EXISTS public.account_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('Editor', 'Viewer')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for account_access
-- Users can see who has access to accounts they also have access to
CREATE POLICY "Users can view access for shared accounts" 
    ON public.account_access FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.account_access aa 
            WHERE aa.account_id = account_access.account_id 
            AND aa.user_id = auth.uid()
        )
    );

-- Only Owners can manage access
CREATE POLICY "Owners can manage access" 
    ON public.account_access FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.account_access aa 
            WHERE aa.account_id = account_access.account_id 
            AND aa.user_id = auth.uid() 
            AND aa.role = 'Owner'
        )
    );

-- Policies for account_invitations
CREATE POLICY "Users can view invitations they sent or received" 
    ON public.account_invitations FOR SELECT 
    USING (sender_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can send invitations for accounts they own" 
    ON public.account_invitations FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.account_access aa 
            WHERE aa.account_id = account_invitations.account_id 
            AND aa.user_id = auth.uid() 
            AND aa.role = 'Owner'
        )
    );

CREATE POLICY "Senders can cancel invitations" 
    ON public.account_invitations FOR UPDATE 
    USING (sender_id = auth.uid())
    WITH CHECK (status = 'cancelled');
