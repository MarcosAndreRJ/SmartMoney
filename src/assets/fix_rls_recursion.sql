-- FIX: RLS Recursion and Shared Access

-- 1. Helper functions to break recursion (SECURITY DEFINER bypasses RLS in the subquery)
CREATE OR REPLACE FUNCTION public.is_account_owner(acc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.accounts
        WHERE id = acc_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.account_access
        WHERE account_id = acc_id AND user_id = auth.uid() AND role = 'Owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_account_member(acc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.accounts
        WHERE id = acc_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.account_access
        WHERE account_id = acc_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Accounts table to allow shared users to view
DROP POLICY IF EXISTS "Shared users can view accounts" ON public.accounts;
CREATE POLICY "Shared users can view accounts"
    ON public.accounts FOR SELECT
    TO authenticated
    USING (public.is_account_member(id));

-- 3. Update Account Access table with non-recursive policies
DROP POLICY IF EXISTS "Users can view access for shared accounts" ON public.account_access;
CREATE POLICY "Users can view access for shared accounts" 
    ON public.account_access FOR SELECT 
    USING (public.is_account_member(account_id));

DROP POLICY IF EXISTS "Owners can manage access" ON public.account_access;
CREATE POLICY "Owners can manage access" 
    ON public.account_access FOR ALL 
    USING (public.is_account_owner(account_id));

-- 4. Update Account Invitations
DROP POLICY IF EXISTS "Users can send invitations for accounts they own" ON public.account_invitations;
CREATE POLICY "Users can send invitations for accounts they own" 
    ON public.account_invitations FOR INSERT 
    WITH CHECK (public.is_account_owner(account_id));
