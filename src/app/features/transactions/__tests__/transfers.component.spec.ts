import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseAccount } from '../../../core/services/supabase.service';
import { createAccount, resetCounters } from '../../../core/test-helpers/factories';

interface TransferResult {
  fromAccount: SupabaseAccount;
  toAccount: SupabaseAccount;
  amount: number;
  success: boolean;
}

function executeTransfer(
  fromAccount: SupabaseAccount,
  toAccount: SupabaseAccount,
  amount: number
): TransferResult {
  if (fromAccount.id === toAccount.id) {
    return { fromAccount, toAccount, amount, success: false };
  }

  const updatedFrom = {
    ...fromAccount,
    initial_balance: parseFloat((fromAccount.initial_balance - amount).toFixed(2))
  };
  const updatedTo = {
    ...toAccount,
    initial_balance: parseFloat((toAccount.initial_balance + amount).toFixed(2))
  };

  return {
    fromAccount: updatedFrom,
    toAccount: updatedTo,
    amount,
    success: true
  };
}

function getTotalBalance(accounts: SupabaseAccount[]): number {
  return accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
}

describe('Transfers - T19/T20: Transferência Entre Contas', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('T19: conta origem deve ser debitada com valor correto', () => {
    const fromAccount = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const toAccount = createAccount({ id: 'acc-2', initial_balance: 500 });
    const amount = 200;

    const result = executeTransfer(fromAccount, toAccount, amount);

    expect(result.success).toBe(true);
    expect(result.fromAccount.initial_balance).toBe(800);
  });

  it('T20: conta destino deve ser creditada com valor correto', () => {
    const fromAccount = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const toAccount = createAccount({ id: 'acc-2', initial_balance: 500 });
    const amount = 200;

    const result = executeTransfer(fromAccount, toAccount, amount);

    expect(result.success).toBe(true);
    expect(result.toAccount.initial_balance).toBe(700);
  });

  it('deve usar parseFloat toFixed para precisão', () => {
    const fromAccount = createAccount({ id: 'acc-1', initial_balance: 1000.33 });
    const toAccount = createAccount({ id: 'acc-2', initial_balance: 500.11 });
    const amount = 100.22;

    const result = executeTransfer(fromAccount, toAccount, amount);

    expect(result.fromAccount.initial_balance).toBe(900.11);
    expect(result.toAccount.initial_balance).toBe(600.33);
  });
});

describe('Transfers - T21: Conservação de Valor Total', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('T21: valor total entre contas deve ser preservado', () => {
    const fromAccount = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const toAccount = createAccount({ id: 'acc-2', initial_balance: 500 });
    const amount = 200;

    const initialTotal = fromAccount.initial_balance + toAccount.initial_balance;
    const result = executeTransfer(fromAccount, toAccount, amount);
    const finalTotal = result.fromAccount.initial_balance + result.toAccount.initial_balance;

    expect(finalTotal).toBe(initialTotal);
  });

  it('deve preservar valor total após múltiplas transferências', () => {
    let fromAccount = createAccount({ id: 'acc-1', initial_balance: 1000 });
    let toAccount = createAccount({ id: 'acc-2', initial_balance: 500 });
    let toAccount2 = createAccount({ id: 'acc-3', initial_balance: 300 });

    const initialTotal = fromAccount.initial_balance + toAccount.initial_balance + toAccount2.initial_balance;

    let result = executeTransfer(fromAccount, toAccount, 100);
    fromAccount = result.fromAccount;
    toAccount = result.toAccount;

    result = executeTransfer(fromAccount, toAccount2, 150);
    fromAccount = result.fromAccount;
    toAccount2 = result.toAccount;

    const finalTotal = fromAccount.initial_balance + toAccount.initial_balance + toAccount2.initial_balance;
    expect(finalTotal).toBe(initialTotal);
  });
});

describe('Transfers - T22: Validação de Transferência', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('T22: não deve permitir transferência para mesma conta', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const amount = 200;

    const result = executeTransfer(account, account, amount);

    expect(result.success).toBe(false);
    expect(result.fromAccount.initial_balance).toBe(1000);
    expect(result.toAccount.initial_balance).toBe(1000);
  });
});

describe('Transfers - Casos Edge', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve lidar com saldo zero', () => {
    const fromAccount = createAccount({ id: 'acc-1', initial_balance: 0 });
    const toAccount = createAccount({ id: 'acc-2', initial_balance: 500 });
    const amount = 100;

    const result = executeTransfer(fromAccount, toAccount, amount);

    expect(result.success).toBe(true);
    expect(result.fromAccount.initial_balance).toBe(-100);
    expect(result.toAccount.initial_balance).toBe(600);
  });

  it('deve lidar com transferência do valor total', () => {
    const fromAccount = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const toAccount = createAccount({ id: 'acc-2', initial_balance: 0 });
    const amount = 1000;

    const result = executeTransfer(fromAccount, toAccount, amount);

    expect(result.success).toBe(true);
    expect(result.fromAccount.initial_balance).toBe(0);
    expect(result.toAccount.initial_balance).toBe(1000);
  });

  it('deve lidar com valores decimais pequenos', () => {
    const fromAccount = createAccount({ id: 'acc-1', initial_balance: 1000.50 });
    const toAccount = createAccount({ id: 'acc-2', initial_balance: 0 });
    const amount = 0.01;

    const result = executeTransfer(fromAccount, toAccount, amount);

    expect(result.success).toBe(true);
    expect(result.fromAccount.initial_balance).toBe(1000.49);
    expect(result.toAccount.initial_balance).toBe(0.01);
  });

  it('não deve criar saldo negativo em transferência falhada', () => {
    const account = createAccount({ id: 'acc-1', initial_balance: 1000 });
    
    executeTransfer(account, account, 500);
    
    expect(account.initial_balance).toBe(1000);
  });

  it('deve atualizar contas diferentes independentemente', () => {
    const acc1 = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const acc2 = createAccount({ id: 'acc-2', initial_balance: 2000 });
    const acc3 = createAccount({ id: 'acc-3', initial_balance: 3000 });

    const result = executeTransfer(acc1, acc3, 100);

    expect(result.fromAccount.id).toBe('acc-1');
    expect(result.toAccount.id).toBe('acc-3');
    expect(result.fromAccount.initial_balance).toBe(900);
    expect(result.toAccount.initial_balance).toBe(3100);
  });
});

describe('Transfers - Integração com Múltiplas Contas', () => {
  beforeEach(() => {
    resetCounters();
  });

  it('deve atualizar apenas contas envolvidas na transferência', () => {
    const accounts = [
      createAccount({ id: 'acc-1', initial_balance: 1000 }),
      createAccount({ id: 'acc-2', initial_balance: 2000 }),
      createAccount({ id: 'acc-3', initial_balance: 3000 })
    ];

    const result = executeTransfer(accounts[0], accounts[2], 500);

    expect(result.fromAccount.initial_balance).toBe(500);
    expect(result.toAccount.initial_balance).toBe(3500);
    expect(accounts[1].initial_balance).toBe(2000);
  });

  it('transferências sequenciais devem ser acumulativas', () => {
    let from = createAccount({ id: 'acc-1', initial_balance: 1000 });
    const to1 = createAccount({ id: 'acc-2', initial_balance: 0 });
    const to2 = createAccount({ id: 'acc-3', initial_balance: 0 });

    let result = executeTransfer(from, to1, 300);
    from = result.fromAccount;

    result = executeTransfer(from, to2, 200);

    expect(result.fromAccount.initial_balance).toBe(500);
  });
});
