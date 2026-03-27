-- FIX: Shared Accounts Relationships and Permissions

-- 1. Ensure foreign key relationship exists for profiles join
-- First, make sure the user_id in account_access references public.profiles
ALTER TABLE public.account_access DROP CONSTRAINT IF EXISTS account_access_user_id_fkey;
ALTER TABLE public.account_access 
    ADD CONSTRAINT account_access_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 2. Fix Account Invitations RLS Policy (Avoid querying auth.users)
DROP POLICY IF EXISTS "Users can view invitations they sent or received" ON public.account_invitations;
CREATE POLICY "Users can view invitations they sent or received" 
    ON public.account_invitations FOR SELECT 
    TO authenticated
    USING (
        sender_id = auth.uid() 
        OR email = (auth.jwt()->>'email')
    );

-- 3. Adjust other invitations policies if needed
DROP POLICY IF EXISTS "Senders can cancel invitations" ON public.account_invitations;
CREATE POLICY "Senders can cancel invitations" 
    ON public.account_invitations FOR UPDATE 
    TO authenticated
    USING (sender_id = auth.uid())
    WITH CHECK (status = 'cancelled');

-- 4. Re-verify account_invitations insert policy
DROP POLICY IF EXISTS "Users can send invitations for accounts they own" ON public.account_invitations;
CREATE POLICY "Users can send invitations for accounts they own" 
    ON public.account_invitations FOR INSERT 
    TO authenticated
    WITH CHECK (public.is_account_owner(account_id));
