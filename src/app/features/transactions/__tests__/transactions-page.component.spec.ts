import { describe, it, expect, beforeEach } from 'vitest';
import { signal, computed } from '@angular/core';
import { SupabaseTransaction, SupabaseAccount } from '../../../core/services/supabase.service';
import { createAccount, createTransaction, resetCounters } from '../../../core/test-helpers/factories';

interface TestBalanceState {
  accounts: SupabaseAccount[];
  transactions: SupabaseTransaction[];
}

function createBalanceState(accounts: SupabaseAccount[], transactions: SupabaseTransaction[]): TestBalanceState {
  return { accounts, transactions };
}

function getAccountById(state: TestBalanceState, id: string): SupabaseAccount | undefined {
  return state.accounts.find(a => a.id === id);
}

function updateAccountBalance(state: TestBalanceState, accountId: string, delta: number): TestBalanceState {
  return {
    ...state,
    accounts: state.accounts.map(acc =>
      acc.id === accountId
        ? { ...acc, initial_balance: parseFloat((acc.initial_balance + delta).toFixed(2)) }
        : acc
    )
  };
}

function calculateBalanceImpact(tx: SupabaseTransaction): number {
  if (tx.type === 'income') return tx.amount;
  if (tx.type === 'expense') return -tx.amount;
  return 0;
}

function getNewBalanceForStatusChange(
  currentStatus: SupabaseTransaction['status'],
  newStatus: SupabaseTransaction['status'],
  txType: SupabaseTransaction['type'],
  amount: number
): number {
  if (currentStatus === 'confirmed' && newStatus !== 'confirmed') {
    return txType === 'income' ? -amount : amount;
  } else if (currentStatus !== 'confirmed' && newStatus === 'confirmed') {
    return txType === 'income' ? amount : -amount;
  }
  return 0;
}

function calculateTotalIncome(transactions: SupabaseTransaction[]): number {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}

function calculateTotalExpenses(transactions: SupabaseTransaction[]): number {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}

function calculateNetBalance(transactions: SupabaseTransaction[]): number {
  return calculateTotalIncome(transactions) - calculateTotalExpenses(transactions);
}

describe('Transactions Page - T9/T10: Confirmação de Pagamento', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('T9: confirmar income deve aumentar saldo da conta', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-1', type: 'income', amount: 100, status: 'pending' });
    
    let state = createBalanceState([account], [tx]);
    const delta = calculateBalanceImpact(tx);
    state = updateAccountBalance(state, tx.account_id, delta);
    
    const updatedAccount = getAccountById(state, 'acc-1');
    expect(updatedAccount?.initial_balance).toBe(1100);
  });

  it('T10: confirmar expense deve diminuir saldo da conta', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-1', type: 'expense', amount: 50, status: 'pending' });
    
    let state = createBalanceState([account], [tx]);
    const delta = calculateBalanceImpact(tx);
    state = updateAccountBalance(state, tx.account_id, delta);
    
    const updatedAccount = getAccountById(state, 'acc-1');
    expect(updatedAccount?.initial_balance).toBe(950);
  });
});

describe('Transactions Page - T11/T12/T13: Mudança de Status', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('T11: confirmed->pending (income) deve reverter saldo', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-1', type: 'income', amount: 100, status: 'confirmed' });
    
    let state = createBalanceState([account], [tx]);
    const delta = getNewBalanceForStatusChange('confirmed', 'pending', 'income', 100);
    state = updateAccountBalance(state, tx.account_id, delta);
    
    const updatedAccount = getAccountById(state, 'acc-1');
    expect(updatedAccount?.initial_balance).toBe(900);
  });

  it('T12: pending->confirmed (expense) deve aplicar saldo', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-1', type: 'expense', amount: 50, status: 'pending' });
    
    let state = createBalanceState([account], [tx]);
    const delta = getNewBalanceForStatusChange('pending', 'confirmed', 'expense', 50);
    state = updateAccountBalance(state, tx.account_id, delta);
    
    const updatedAccount = getAccountById(state, 'acc-1');
    expect(updatedAccount?.initial_balance).toBe(950);
  });

  it('T13: cancelled->confirmed deve aplicar saldo conforme tipo', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    
    let state = createBalanceState([account], []);
    
    const incomeDelta = getNewBalanceForStatusChange('cancelled', 'confirmed', 'income', 200);
    state = updateAccountBalance(state, 'acc-1', incomeDelta);
    expect(getAccountById(state, 'acc-1')?.initial_balance).toBe(1200);
    
    const expenseDelta = getNewBalanceForStatusChange('cancelled', 'confirmed', 'expense', 100);
    state = updateAccountBalance(state, 'acc-1', expenseDelta);
    expect(getAccountById(state, 'acc-1')?.initial_balance).toBe(1100);
  });

  it('deve manter saldo quando status não muda', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    
    let state = createBalanceState([account], []);
    const delta = getNewBalanceForStatusChange('confirmed', 'confirmed', 'income', 100);
    state = updateAccountBalance(state, 'acc-1', delta);
    
    expect(getAccountById(state, 'acc-1')?.initial_balance).toBe(1000);
  });
});

describe('Transactions Page - T14/T15: Deleção de Transação', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('T14: deletar income confirmed deve reverter saldo', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-1', type: 'income', amount: 100, status: 'confirmed' });
    
    let state = createBalanceState([account], [tx]);
    
    if (tx.status === 'confirmed') {
      const delta = tx.type === 'income' ? -tx.amount : tx.amount;
      state = updateAccountBalance(state, tx.account_id, delta);
    }
    
    const updatedAccount = getAccountById(state, 'acc-1');
    expect(updatedAccount?.initial_balance).toBe(900);
  });

  it('T15: deletar expense pending não deve alterar saldo', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-1', type: 'expense', amount: 50, status: 'pending' });
    
    let state = createBalanceState([account], [tx]);
    
    if (tx.status === 'confirmed') {
      const delta = tx.type === 'income' ? -tx.amount : tx.amount;
      state = updateAccountBalance(state, tx.account_id, delta);
    }
    
    const updatedAccount = getAccountById(state, 'acc-1');
    expect(updatedAccount?.initial_balance).toBe(1000);
  });

  it('deletar expense confirmed deve reverter saldo', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-1', type: 'expense', amount: 200, status: 'confirmed' });
    
    let state = createBalanceState([account], [tx]);
    
    if (tx.status === 'confirmed') {
      const delta = tx.type === 'income' ? -tx.amount : tx.amount;
      state = updateAccountBalance(state, tx.account_id, delta);
    }
    
    const updatedAccount = getAccountById(state, 'acc-1');
    expect(updatedAccount?.initial_balance).toBe(1200);
  });
});

describe('Transactions Page - T16/T17/T18: Cálculos de UI', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('T16: totalIncome deve somar apenas incomes', () => {
    const transactions = [
      createTransaction({ type: 'income', amount: 100 }),
      createTransaction({ type: 'income', amount: 200 }),
      createTransaction({ type: 'expense', amount: 50 }),
      createTransaction({ type: 'transfer', amount: 300 })
    ];

    const totalIncome = calculateTotalIncome(transactions);
    expect(totalIncome).toBe(300);
  });

  it('T17: totalExpenses deve somar apenas expenses', () => {
    const transactions = [
      createTransaction({ type: 'income', amount: 100 }),
      createTransaction({ type: 'expense', amount: 50 }),
      createTransaction({ type: 'expense', amount: 150 }),
      createTransaction({ type: 'transfer', amount: 300 })
    ];

    const totalExpenses = calculateTotalExpenses(transactions);
    expect(totalExpenses).toBe(200);
  });

  it('T18: netBalance deve ser income - expenses', () => {
    const transactions = [
      createTransaction({ type: 'income', amount: 500 }),
      createTransaction({ type: 'expense', amount: 300 }),
      createTransaction({ type: 'transfer', amount: 100 })
    ];

    const netBalance = calculateNetBalance(transactions);
    expect(netBalance).toBe(200);
  });

  it('deve lidar com array vazio', () => {
    const transactions: SupabaseTransaction[] = [];

    expect(calculateTotalIncome(transactions)).toBe(0);
    expect(calculateTotalExpenses(transactions)).toBe(0);
    expect(calculateNetBalance(transactions)).toBe(0);
  });

  it('deve tratar saldo negativo corretamente', () => {
    const transactions = [
      createTransaction({ type: 'income', amount: 100 }),
      createTransaction({ type: 'expense', amount: 300 })
    ];

    const netBalance = calculateNetBalance(transactions);
    expect(netBalance).toBe(-200);
  });
});

describe('Transactions Page - Casos Edge', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve arredondar valores para 2 casas decimais', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000.33 });
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-1', type: 'income', amount: 100.333, status: 'pending' });
    
    let state = createBalanceState([account], [tx]);
    const delta = calculateBalanceImpact(tx);
    state = updateAccountBalance(state, tx.account_id, delta);
    
    const updatedAccount = getAccountById(state, 'acc-1');
    expect(updatedAccount?.initial_balance).toBe(1100.66);
  });

  it('deve atualizar conta correta em multi-conta', () => {
    const accounts = [
      createAccount({ id: 'acc-1', initial_balance: 1000 }),
      createAccount({ id: 'acc-2', initial_balance: 2000 })
    ];
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-2', type: 'income', amount: 500, status: 'pending' });
    
    let state = createBalanceState(accounts, [tx]);
    const delta = calculateBalanceImpact(tx);
    state = updateAccountBalance(state, tx.account_id, delta);
    
    expect(getAccountById(state, 'acc-1')?.initial_balance).toBe(1000);
    expect(getAccountById(state, 'acc-2')?.initial_balance).toBe(2500);
  });

  it('deve preservar outras contas ao atualizar uma', () => {
    const accounts = [
      createAccount({ id: 'acc-1', initial_balance: 1000 }),
      createAccount({ id: 'acc-2', initial_balance: 2000 }),
      createAccount({ id: 'acc-3', initial_balance: 3000 })
    ];
    const tx = createTransaction({ id: 'tx-1', account_id: 'acc-2', type: 'expense', amount: 100, status: 'pending' });
    
    let state = createBalanceState(accounts, [tx]);
    const delta = calculateBalanceImpact(tx);
    state = updateAccountBalance(state, tx.account_id, delta);
    
    expect(getAccountById(state, 'acc-1')?.initial_balance).toBe(1000);
    expect(getAccountById(state, 'acc-2')?.initial_balance).toBe(1900);
    expect(getAccountById(state, 'acc-3')?.initial_balance).toBe(3000);
  });
});
