-- src/assets/sql/20260423_loan_cascade_and_metadata.sql

-- Garante que a tabela loan_payments também tenha exclusão em cascata
-- Primeiro, precisamos identificar o nome da constraint se ela já existir, ou apenas recriá-la
DO $$ 
BEGIN
    -- Se existir uma constraint de foreign key para loan_id em loan_payments, removemos para recriar com CASCADE
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'loan_payments' AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Nota: Em um ambiente real saberíamos o nome, aqui assumimos o padrão ou tentamos dropar e recriar
        ALTER TABLE loan_payments DROP CONSTRAINT IF EXISTS loan_payments_loan_id_fkey;
    END IF;
END $$;

-- Recria a FK com ON DELETE CASCADE
ALTER TABLE loan_payments 
ADD CONSTRAINT loan_payments_loan_id_fkey 
FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE;

-- Reforço para a tabela transactions (garantindo que o script anterior foi aplicado corretamente)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'transactions' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'transactions_loan_id_fkey'
    ) THEN
        ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_loan_id_fkey;
    END IF;
END $$;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_loan_id_fkey 
FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE;

-- Comentários para auditoria
COMMENT ON CONSTRAINT loan_payments_loan_id_fkey ON loan_payments IS 'Garante consistência: ao excluir empréstimo, remove histórico de pagamentos';
COMMENT ON CONSTRAINT transactions_loan_id_fkey ON transactions IS 'Garante consistência: ao excluir empréstimo, remove lançamentos financeiros vinculados';
