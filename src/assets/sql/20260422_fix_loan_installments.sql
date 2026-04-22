-- src/assets/sql/20260422_fix_loan_installments.sql

-- 1. Adicionar account_id na tabela loans para definir a conta padrão dos lançamentos
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- 2. Adicionar loan_id na tabela transactions para vincular lançamentos ao contrato
-- O vínculo ON DELETE CASCADE garante que ao excluir um empréstimo, seus lançamentos pendentes também sumam.
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES loans(id) ON DELETE CASCADE;

-- 3. Adicionar installment_number para controle de parcelas
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS installment_number INTEGER;

-- 4. Criar índice para performance de buscas por empréstimo
CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(loan_id);

-- 5. Atualizar as políticas de RLS para garantir que as novas colunas respeitem as regras
-- Como transactions já tem filtro por user_id, as novas colunas são protegidas automaticamente
-- mas é boa prática garantir que as referências sejam válidas (Supabase já faz via FK).
