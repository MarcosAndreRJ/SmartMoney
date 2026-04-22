-- src/assets/sql/20260423_add_loan_adjustment_tracking.sql

-- Adiciona colunas para rastreabilidade de ajustes em pagamentos de empréstimos
ALTER TABLE loan_payments 
ADD COLUMN IF NOT EXISTS adjustment_type TEXT CHECK (adjustment_type IN ('redistribute', 'next', 'last', 'none')) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS adjustment_value NUMERIC(12,2) DEFAULT 0;

-- Adiciona comentário para documentação
COMMENT ON COLUMN loan_payments.adjustment_type IS 'Tipo de ajuste feito no cronograma devido a pagamento divergente';
COMMENT ON COLUMN loan_payments.adjustment_value IS 'Valor da diferença tratada no ajuste';
