-- ############################################################
-- SMARTMONEY - RLS POLICIES FOR IMPORT
-- Execute este script no SQL Editor do Supabase
-- ############################################################

-- Verificar policies existentes em transactions
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'transactions';

-- Verificar policies existentes em credit_card_transactions
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'credit_card_transactions';

-- Criar policy de INSERT para transactions (se não existir)
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Criar policy de INSERT para credit_card_transactions (se não existir)
DROP POLICY IF EXISTS "Users can insert own credit card transactions" ON credit_card_transactions;
CREATE POLICY "Users can insert own credit card transactions"
  ON credit_card_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ############################################################
-- OBS:
-- Estas policies garantem que usuários possam inserir
-- transações via importação.
-- ############################################################