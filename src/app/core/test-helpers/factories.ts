import { SupabaseAccount, SupabaseTransaction, SupabaseLoan } from '../services/supabase.service';

let accountCounter = 0;
let transactionCounter = 0;
let loanCounter = 0;

export function createAccount(overrides: Partial<SupabaseAccount> = {}): SupabaseAccount {
  const id = overrides.id ?? `account-${++accountCounter}`;
  return {
    id,
    user_id: 'test-user-1',
    institution_name: overrides.institution_name ?? `Conta ${accountCounter}`,
    account_type: overrides.account_type ?? 'checking',
    initial_balance: overrides.initial_balance ?? 1000,
    credit_limit: overrides.credit_limit,
    closing_date: overrides.closing_date,
    due_date: overrides.due_date,
    color: overrides.color ?? '#3B82F6',
    icon: overrides.icon ?? 'account_balance',
    is_main_account: overrides.is_main_account ?? false,
    created_at: overrides.created_at ?? new Date().toISOString(),
    ...overrides
  };
}

export function createTransaction(overrides: Partial<SupabaseTransaction> = {}): SupabaseTransaction {
  const id = overrides.id ?? `tx-${++transactionCounter}`;
  return {
    id,
    user_id: 'test-user-1',
    account_id: overrides.account_id ?? 'account-1',
    description: overrides.description ?? `Transação ${transactionCounter}`,
    amount: overrides.amount ?? 100,
    date: overrides.date ?? new Date().toISOString(),
    category: overrides.category ?? 'Alimentação',
    type: overrides.type ?? 'expense',
    status: overrides.status ?? 'confirmed',
    created_at: overrides.created_at ?? new Date().toISOString(),
    recurring_source_id: overrides.recurring_source_id,
    ...overrides
  };
}

export function createLoan(overrides: Partial<SupabaseLoan> = {}): SupabaseLoan {
  const id = overrides.id ?? `loan-${++loanCounter}`;
  return {
    id,
    user_id: 'test-user-1',
    creditor_name: overrides.creditor_name ?? `Credor ${loanCounter}`,
    type: overrides.type ?? 'fixed',
    initial_amount: overrides.initial_amount ?? 10000,
    current_balance: overrides.current_balance ?? 10000,
    monthly_rate: overrides.monthly_rate ?? 2,
    total_installments: overrides.total_installments ?? 12,
    paid_installments: overrides.paid_installments ?? 0,
    installment_amount: overrides.installment_amount,
    due_day: overrides.due_day ?? 10,
    start_date: overrides.start_date ?? new Date().toISOString(),
    status: overrides.status ?? 'active',
    total_paid: overrides.total_paid ?? 0,
    created_at: overrides.created_at ?? new Date().toISOString(),
    ...overrides
  };
}

export function resetCounters() {
  accountCounter = 0;
  transactionCounter = 0;
  loanCounter = 0;
}
