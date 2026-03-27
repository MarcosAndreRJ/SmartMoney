import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAccount, SupabaseTransaction, SupabaseLoan } from '../supabase.service';
import { createAccount, createTransaction, createLoan, resetCounters } from '../../test-helpers/factories';

interface DashboardSummary {
  stats: {
    totalBalance: number;
    monthlySpending: number;
    predictedBalance: number;
    totalLoans: number;
    balanceChange: number;
    spendingChange: number;
  };
  creditCards: Array<{
    id: string;
    name: string;
    lastDigits: string;
    currentBill: number;
    limit: number;
    available: number;
    color: string;
  }>;
  recurrence: { income: number; expenses: number };
  goals: Array<{ id: string; current_amount: number; progress: number }>;
  categorySpending: Array<{ name: string; amount: number }>;
  heritageEvolution: Array<{ month: string; value: number }>;
  recentTransactions: Array<{ id: string; categoryName: string }>;
}

function calculateDashboardSummary(
  accounts: SupabaseAccount[],
  transactions: SupabaseTransaction[],
  loans: SupabaseLoan[],
  goals: any[] = [],
  goalContributions: any[] = [],
  categories: any[] = [],
  recurringTransactions: any[] = []
): DashboardSummary {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const initialBalanceSum = accounts.reduce((sum, acc) => sum + Number(acc.initial_balance), 0);
  const totalIncome = transactions
    .filter(tx => tx.type === 'income' && tx.status === 'confirmed')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalExpense = transactions
    .filter(tx => tx.type === 'expense' && tx.status === 'confirmed')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  const totalBalance = initialBalanceSum + totalIncome - totalExpense;

  const monthlySpending = transactions
    .filter(tx => {
      const txDateStr = (tx.date || '').split('T')[0];
      const txDate = new Date(txDateStr + 'T12:00:00');
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return tx.type === 'expense' && 
             tx.status === 'confirmed' && 
             tx.category !== 'Transferência' &&
             txDate >= startOfMonth;
    })
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
  const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  
  const lastMonthSpending = transactions
    .filter(tx => {
      const txDateStr = (tx.date || '').split('T')[0];
      const txDate = new Date(txDateStr + 'T12:00:00');
      return tx.type === 'expense' && tx.status === 'confirmed' && txDate >= lastMonthFirst && txDate <= lastMonthLast;
    })
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  const thisMonthNet = transactions
    .filter(tx => {
      const txDateStr = (tx.date || '').split('T')[0];
      const txDate = new Date(txDateStr + 'T12:00:00');
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return tx.status === 'confirmed' && txDate >= startOfMonth;
    })
    .reduce((net, tx) => net + (tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount)), 0);
  
  const balanceAtStartOfMonth = totalBalance - thisMonthNet;
  const balanceChange = balanceAtStartOfMonth > 0 ? (thisMonthNet / balanceAtStartOfMonth) * 100 : 0;
  const spendingChange = lastMonthSpending > 0 ? ((monthlySpending / lastMonthSpending) - 1) * 100 : 0;

  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const pendingIncomeThisMonth = transactions
    .filter(tx => {
      const txDateStr = (tx.date || '').split('T')[0];
      const txDate = new Date(txDateStr + 'T12:00:00');
      return tx.type === 'income' && tx.status === 'pending' && txDate <= endOfThisMonth;
    })
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  const pendingExpenseThisMonth = transactions
    .filter(tx => {
      const txDateStr = (tx.date || '').split('T')[0];
      const txDate = new Date(txDateStr + 'T12:00:00');
      return tx.type === 'expense' && tx.status === 'pending' && txDate <= endOfThisMonth;
    })
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  const predictedBalance = totalBalance + pendingIncomeThisMonth - pendingExpenseThisMonth;

  const totalLoans = loans.reduce((sum, loan) => sum + Number(loan.current_balance), 0);

  const creditCards = accounts
    .filter(acc => acc.account_type === 'credit_card')
    .map(card => {
      const cardExpenses = transactions
        .filter(tx => tx.account_id === card.id && tx.type === 'expense' && tx.status === 'confirmed')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      const cardIncomes = transactions
        .filter(tx => tx.account_id === card.id && tx.type === 'income' && tx.status === 'confirmed')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      
      const currentBill = cardExpenses - cardIncomes;
      return {
        id: card.id,
        name: card.institution_name,
        lastDigits: '0000',
        currentBill,
        limit: Number(card.credit_limit || 0),
        available: Math.max(0, Number(card.credit_limit || 0) - currentBill),
        color: card.color || '#94a3b8'
      };
    });

  const recurringIncome = recurringTransactions
    .filter((rt: any) => rt.type === 'income')
    .reduce((sum: number, rt: any) => sum + Number(rt.amount), 0);
  
  const recurringExpenses = recurringTransactions
    .filter((rt: any) => rt.type === 'expense')
    .reduce((sum: number, rt: any) => sum + Number(rt.amount), 0);

  const goalsWithProgress = goals.map(goal => {
    const contribs = goalContributions.filter((c: any) => c.goal_id === goal.id);
    const saved = contribs.reduce((sum, c) => sum + Number(c.amount), 0);
    return {
      ...goal,
      current_amount: saved,
      progress: goal.target_amount > 0 ? (saved / goal.target_amount) * 100 : 0
    };
  });

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const categorySpending = categories.map(cat => {
    const amount = transactions
      .filter(tx => {
        const txDateStr = (tx.date || '').split('T')[0];
        const txDate = new Date(txDateStr + 'T12:00:00');
        return tx.category === cat.name && tx.type === 'expense' && tx.status === 'confirmed' && txDate >= thirtyDaysAgo;
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    return {
      name: cat.name,
      amount,
      icon: cat.icon || 'category',
      color: cat.color || '#cbd5e1'
    };
  }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 4);

  const heritageEvolution = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
    
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    
    const monIncome = transactions
      .filter(tx => {
        const txDateStr = (tx.date || '').split('T')[0];
        const txDate = new Date(txDateStr + 'T12:00:00');
        return tx.type === 'income' && tx.status === 'confirmed' && txDate <= endOfMonth;
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    const monExpense = transactions
      .filter(tx => {
        const txDateStr = (tx.date || '').split('T')[0];
        const txDate = new Date(txDateStr + 'T12:00:00');
        return tx.type === 'expense' && tx.status === 'confirmed' && txDate <= endOfMonth;
      })
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    heritageEvolution.push({
      month: monthLabel,
      value: initialBalanceSum + monIncome - monExpense
    });
  }

  return {
    stats: {
      totalBalance,
      monthlySpending,
      predictedBalance,
      totalLoans,
      balanceChange,
      spendingChange
    },
    creditCards,
    recurrence: {
      income: recurringIncome,
      expenses: recurringExpenses
    },
    goals: goalsWithProgress.slice(0, 3),
    categorySpending,
    heritageEvolution,
    recentTransactions: transactions.slice(0, 5).map(tx => {
      const cat = categories.find(c => c.name === tx.category);
      return {
        ...tx,
        categoryName: tx.category || 'Outros',
        categoryColor: cat?.color || '#cbd5e1'
      };
    })
  };
}

describe('Dashboard Summary - T1: Cálculo de Saldo Total', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve calcular saldo total corretamente', () => {
    const accounts = [
      createAccount({ initial_balance: 1000 }),
      createAccount({ initial_balance: 500 })
    ];
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', amount: 200 }),
      createTransaction({ type: 'expense', status: 'confirmed', amount: 150 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.totalBalance).toBe(1550);
  });

  it('deve ignorar transações pending no cálculo de saldo', () => {
    const accounts = [createAccount({ initial_balance: 1000 })];
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', amount: 200 }),
      createTransaction({ type: 'income', status: 'pending', amount: 300 }),
      createTransaction({ type: 'expense', status: 'confirmed', amount: 100 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.totalBalance).toBe(1100);
  });

  it('deve ignorar transações cancelled no cálculo de saldo', () => {
    const accounts = [createAccount({ initial_balance: 1000 })];
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', amount: 200 }),
      createTransaction({ type: 'expense', status: 'cancelled', amount: 500 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.totalBalance).toBe(1200);
  });

  it('deve considerar múltiplas contas corretamente', () => {
    const accounts = [
      createAccount({ id: 'acc-1', initial_balance: 1000 }),
      createAccount({ id: 'acc-2', initial_balance: 2000 }),
      createAccount({ id: 'acc-3', initial_balance: 500 })
    ];
    const transactions = [
      createTransaction({ account_id: 'acc-1', type: 'income', amount: 100 }),
      createTransaction({ account_id: 'acc-2', type: 'expense', amount: 200 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.totalBalance).toBe(3400);
  });
});

describe('Dashboard Summary - T2/T3: Transações Pending e Cancelled', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve excluir apenas transações confirmed do cálculo', () => {
    const accounts = [createAccount({ initial_balance: 1000 })];
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', amount: 100 }),
      createTransaction({ type: 'income', status: 'pending', amount: 100 }),
      createTransaction({ type: 'income', status: 'cancelled', amount: 100 }),
      createTransaction({ type: 'expense', status: 'confirmed', amount: 50 }),
      createTransaction({ type: 'expense', status: 'pending', amount: 50 }),
      createTransaction({ type: 'expense', status: 'cancelled', amount: 50 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.totalBalance).toBe(1050);
  });

  it('deve tratar todos os tipos de transação corretamente', () => {
    const accounts = [createAccount({ initial_balance: 500 })];
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', amount: 300 }),
      createTransaction({ type: 'expense', status: 'confirmed', amount: 200 }),
      createTransaction({ type: 'transfer', status: 'confirmed', amount: 100 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.totalBalance).toBe(600);
  });
});

describe('Dashboard Summary - T4/T5: Saldo de Cartão de Crédito', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve calcular currentBill como despesas - pagamentos', () => {
    const accounts = [
      createAccount({ id: 'cc-1', account_type: 'credit_card', credit_limit: 5000 })
    ];
    const transactions = [
      createTransaction({ account_id: 'cc-1', type: 'expense', status: 'confirmed', amount: 500 }),
      createTransaction({ account_id: 'cc-1', type: 'expense', status: 'confirmed', amount: 300 }),
      createTransaction({ account_id: 'cc-1', type: 'income', status: 'confirmed', amount: 200 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.creditCards[0].currentBill).toBe(600);
  });

  it('deve calcular available como credit_limit - currentBill', () => {
    const accounts = [
      createAccount({ id: 'cc-1', account_type: 'credit_card', credit_limit: 2000 })
    ];
    const transactions = [
      createTransaction({ account_id: 'cc-1', type: 'expense', status: 'confirmed', amount: 800 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.creditCards[0].available).toBe(1200);
  });

  it('deve retornar 0 se currentBill exceder credit_limit', () => {
    const accounts = [
      createAccount({ id: 'cc-1', account_type: 'credit_card', credit_limit: 500 })
    ];
    const transactions = [
      createTransaction({ account_id: 'cc-1', type: 'expense', status: 'confirmed', amount: 800 }),
      createTransaction({ account_id: 'cc-1', type: 'income', status: 'confirmed', amount: 100 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.creditCards[0].currentBill).toBe(700);
    expect(result.creditCards[0].available).toBe(0);
  });

  it('não deve considerar transações pending no currentBill', () => {
    const accounts = [
      createAccount({ id: 'cc-1', account_type: 'credit_card', credit_limit: 1000 })
    ];
    const transactions = [
      createTransaction({ account_id: 'cc-1', type: 'expense', status: 'confirmed', amount: 300 }),
      createTransaction({ account_id: 'cc-1', type: 'expense', status: 'pending', amount: 200 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.creditCards[0].currentBill).toBe(300);
    expect(result.creditCards[0].available).toBe(700);
  });
});

describe('Dashboard Summary - T6/T7: Saldo Previsto com Pending', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve incluir pending income do mês atual no saldo previsto', () => {
    const accounts = [createAccount({ initial_balance: 1000 })];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', amount: 200 }),
      createTransaction({ type: 'income', status: 'pending', amount: 300, date: `${currentMonth}-15` })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.predictedBalance).toBe(1500);
  });

  it('deve subtrair pending expense do mês atual no saldo previsto', () => {
    const accounts = [createAccount({ initial_balance: 1000 })];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', amount: 200 }),
      createTransaction({ type: 'expense', status: 'pending', amount: 150, date: `${currentMonth}-15` })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.predictedBalance).toBe(1050);
  });

  it('não deve incluir pending de meses futuros no saldo previsto', () => {
    const accounts = [createAccount({ initial_balance: 1000 })];
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    
    const transactions = [
      createTransaction({ type: 'income', status: 'pending', amount: 500, date: `${nextMonthStr}-15` })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.stats.predictedBalance).toBe(1000);
  });
});

describe('Dashboard Summary - T8: Evolução Patrimonial', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve calcular evolução patrimonial para últimos 6 meses', () => {
    const accounts = [createAccount({ initial_balance: 500 })];
    const now = new Date();
    
    const pastMonth = new Date(now.getFullYear(), now.getMonth() - 3, 15);
    const monthStr = `${pastMonth.getFullYear()}-${String(pastMonth.getMonth() + 1).padStart(2, '0')}-${String(pastMonth.getDate()).padStart(2, '0')}`;
    
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', date: monthStr, amount: 200 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.heritageEvolution).toHaveLength(6);
    const relevantMonth = result.heritageEvolution.find(h => {
      const targetMonth = pastMonth.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      return h.month === targetMonth;
    });
    expect(relevantMonth?.value).toBe(700);
  });

  it('deve mostrar valor atual correto na evolução', () => {
    const accounts = [createAccount({ initial_balance: 1000 })];
    const transactions = [
      createTransaction({ type: 'income', status: 'confirmed', amount: 500 }),
      createTransaction({ type: 'expense', status: 'confirmed', amount: 200 })
    ];

    const result = calculateDashboardSummary(accounts, transactions, []);

    expect(result.heritageEvolution[5].value).toBe(1300);
  });
});

describe('Dashboard Summary - Loans', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve calcular total de loans corretamente', () => {
    const accounts: SupabaseAccount[] = [];
    const loans = [
      createLoan({ current_balance: 5000 }),
      createLoan({ current_balance: 3000 })
    ];

    const result = calculateDashboardSummary(accounts, [], loans);

    expect(result.stats.totalLoans).toBe(8000);
  });
});
