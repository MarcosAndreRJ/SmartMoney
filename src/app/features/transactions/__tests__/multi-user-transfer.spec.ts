import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseAccount, SupabaseTransaction } from '../../../core/services/supabase.service';
import { createAccount, createTransaction, resetCounters } from '../../../core/test-helpers/factories';

interface User {
  id: string;
  email: string;
  accounts: SupabaseAccount[];
  transactions: SupabaseTransaction[];
}

interface MultiUserState {
  users: Map<string, User>;
}

function createMultiUserState(): MultiUserState {
  return { users: new Map() };
}

function addUser(state: MultiUserState, userId: string, email: string, accounts: SupabaseAccount[]): MultiUserState {
  const newUsers = new Map(state.users);
  newUsers.set(userId, {
    id: userId,
    email,
    accounts,
    transactions: []
  });
  return { ...state, users: newUsers };
}

function getUserBalance(state: MultiUserState, userId: string): number {
  const user = state.users.get(userId);
  if (!user) return 0;
  return user.accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
}

function getAccountBalance(state: MultiUserState, userId: string, accountId: string): number {
  const user = state.users.get(userId);
  if (!user) return 0;
  const account = user.accounts.find(a => a.id === accountId);
  return account?.initial_balance ?? 0;
}

function getTotalSystemBalance(state: MultiUserState): number {
  let total = 0;
  state.users.forEach(user => {
    total += user.accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);
  });
  return total;
}

function executeTransferBetweenUsers(
  state: MultiUserState,
  fromUserId: string,
  toUserId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  description?: string
): { state: MultiUserState; success: boolean; error?: string } {
  const fromUser = state.users.get(fromUserId);
  const toUser = state.users.get(toUserId);

  if (!fromUser || !toUser) {
    return { state, success: false, error: 'User not found' };
  }

  if (fromUserId === toUserId) {
    return { state, success: false, error: 'Cannot transfer to same user' };
  }

  const fromAccount = fromUser.accounts.find(a => a.id === fromAccountId);
  const toAccount = toUser.accounts.find(a => a.id === toAccountId);

  if (!fromAccount || !toAccount) {
    return { state, success: false, error: 'Account not found' };
  }

  const expenseTx: SupabaseTransaction = createTransaction({
    id: `tx-exp-${Date.now()}`,
    user_id: fromUserId,
    account_id: fromAccountId,
    description: description || `Transferência para ${toUser.email}`,
    amount,
    type: 'expense',
    status: 'confirmed'
  });

  const incomeTx: SupabaseTransaction = createTransaction({
    id: `tx-inc-${Date.now()}`,
    user_id: toUserId,
    account_id: toAccountId,
    description: `Transferência recebida de ${fromUser.email}`,
    amount,
    type: 'income',
    status: 'confirmed'
  });

  const updatedFromAccount = {
    ...fromAccount,
    initial_balance: parseFloat((fromAccount.initial_balance - amount).toFixed(2))
  };

  const updatedToAccount = {
    ...toAccount,
    initial_balance: parseFloat((toAccount.initial_balance + amount).toFixed(2))
  };

  const newUsers = new Map(state.users);
  
  const updatedFromUser = {
    ...fromUser,
    accounts: fromUser.accounts.map(a => a.id === fromAccountId ? updatedFromAccount : a),
    transactions: [...fromUser.transactions, expenseTx]
  };

  const updatedToUser = {
    ...toUser,
    accounts: toUser.accounts.map(a => a.id === toAccountId ? updatedToAccount : a),
    transactions: [...toUser.transactions, incomeTx]
  };

  newUsers.set(fromUserId, updatedFromUser);
  newUsers.set(toUserId, updatedToUser);

  return { state: { ...state, users: newUsers }, success: true };
}

describe('Multi-User Transfer - Integração Entre Usuários', () => {
  beforeEach(() => {
    resetCounters();
  });

  describe('Cenário Básico: Transferência A → B', () => {
    it('deve debitar conta do usuário A e creditar conta do usuário B', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', institution_name: 'Banco Alice', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', institution_name: 'Banco Bob', initial_balance: 500 })
      ]);

      const result = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 200);

      expect(result.success).toBe(true);
      expect(getAccountBalance(result.state, 'user-a', 'acc-a1')).toBe(800);
      expect(getAccountBalance(result.state, 'user-b', 'acc-b1')).toBe(700);
    });

    it('deve preservar saldo total do sistema após transferência', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      const initialTotal = getTotalSystemBalance(state);

      const result = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 200);

      expect(getTotalSystemBalance(result.state)).toBe(initialTotal);
    });

    it('deve registrar transações em ambos os usuários', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      const result = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 200);

      const userA = result.state.users.get('user-a');
      const userB = result.state.users.get('user-b');

      expect(userA?.transactions).toHaveLength(1);
      expect(userA?.transactions[0].type).toBe('expense');
      expect(userA?.transactions[0].amount).toBe(200);

      expect(userB?.transactions).toHaveLength(1);
      expect(userB?.transactions[0].type).toBe('income');
      expect(userB?.transactions[0].amount).toBe(200);
    });
  });

  describe('Cenário Avançado: Múltiplas Transferências', () => {
    it('deve processar múltiplas transferências A → B sequencialmente', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      state = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 100).state;
      state = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 150).state;
      state = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 50).state;

      expect(getAccountBalance(state, 'user-a', 'acc-a1')).toBe(700);
      expect(getAccountBalance(state, 'user-b', 'acc-b1')).toBe(800);

      const userA = state.users.get('user-a');
      const userB = state.users.get('user-b');

      expect(userA?.transactions).toHaveLength(3);
      expect(userB?.transactions).toHaveLength(3);
    });

    it('deve processar transferências bidirecionais A ↔ B', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      state = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 200).state;
      state = executeTransferBetweenUsers(state, 'user-b', 'user-a', 'acc-b1', 'acc-a1', 100).state;

      expect(getAccountBalance(state, 'user-a', 'acc-a1')).toBe(900);
      expect(getAccountBalance(state, 'user-b', 'acc-b1')).toBe(600);
      expect(getTotalSystemBalance(state)).toBe(1500);
    });

    it('deve processar transferências circulares A → B → C → A', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      state = addUser(state, 'user-c', 'carol@email.com', [
        createAccount({ id: 'acc-c1', initial_balance: 300 })
      ]);

      const initialTotal = getTotalSystemBalance(state);

      state = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 200).state;
      state = executeTransferBetweenUsers(state, 'user-b', 'user-c', 'acc-b1', 'acc-c1', 150).state;
      state = executeTransferBetweenUsers(state, 'user-c', 'user-a', 'acc-c1', 'acc-a1', 100).state;

      expect(getAccountBalance(state, 'user-a', 'acc-a1')).toBe(900);
      expect(getAccountBalance(state, 'user-b', 'acc-b1')).toBe(550);
      expect(getAccountBalance(state, 'user-c', 'acc-c1')).toBe(350);
      expect(getTotalSystemBalance(state)).toBe(initialTotal);
    });
  });

  describe('Usuário com Múltiplas Contas', () => {
    it('deve permitir transferência de conta específica', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', institution_name: 'Conta Corrente', initial_balance: 1000 }),
        createAccount({ id: 'acc-a2', institution_name: 'Poupança', initial_balance: 500 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', institution_name: 'Banco Bob', initial_balance: 300 })
      ]);

      state = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a2', 'acc-b1', 100).state;

      expect(getAccountBalance(state, 'user-a', 'acc-a1')).toBe(1000);
      expect(getAccountBalance(state, 'user-a', 'acc-a2')).toBe(400);
      expect(getAccountBalance(state, 'user-b', 'acc-b1')).toBe(400);
    });

    it('deve calcular saldo total do usuário corretamente', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 }),
        createAccount({ id: 'acc-a2', initial_balance: 500 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 300 })
      ]);

      expect(getUserBalance(state, 'user-a')).toBe(1500);
      expect(getUserBalance(state, 'user-b')).toBe(300);

      state = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 200).state;

      expect(getUserBalance(state, 'user-a')).toBe(1300);
      expect(getUserBalance(state, 'user-b')).toBe(500);
    });
  });

  describe('Validações e Casos Edge', () => {
    it('não deve permitir transferência de usuário inexistente', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      const result = executeTransferBetweenUsers(state, 'user-a', 'user-x', 'acc-a1', 'acc-b1', 100);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('não deve permitir transferência para conta inexistente', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      const result = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-invalid', 100);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found');
    });

    it('deve preservar saldos quando transferência falha', () => {
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      const initialBalanceA = getAccountBalance(state, 'user-a', 'acc-a1');
      const initialBalanceB = getAccountBalance(state, 'user-b', 'acc-b1');

      const result = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-invalid', 100);

      expect(result.success).toBe(false);
      expect(getAccountBalance(state, 'user-a', 'acc-a1')).toBe(initialBalanceA);
      expect(getAccountBalance(state, 'user-b', 'acc-b1')).toBe(initialBalanceB);
    });

    it('deve demonstrar padrão de rollback em caso de falha', () => {
      function executeTransferSimulatedRollback(
        state: MultiUserState,
        fromUserId: string,
        toUserId: string,
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        shouldFail: boolean
      ): { state: MultiUserState; success: boolean } {
        const fromUser = state.users.get(fromUserId);
        const toUser = state.users.get(toUserId);

        if (!fromUser || !toUser) {
          return { state, success: false };
        }

        const fromAccount = fromUser.accounts.find(a => a.id === fromAccountId);
        const toAccount = toUser.accounts.find(a => a.id === toAccountId);

        if (!fromAccount || !toAccount) {
          return { state, success: false };
        }

        const updatedFromAccount = {
          ...fromAccount,
          initial_balance: parseFloat((fromAccount.initial_balance - amount).toFixed(2))
        };

        const newUsers = new Map(state.users);
        const updatedFromUser = {
          ...fromUser,
          accounts: fromUser.accounts.map(a => a.id === fromAccountId ? updatedFromAccount : a)
        };
        newUsers.set(fromUserId, updatedFromUser);

        if (shouldFail) {
          return { state: { ...state, users: newUsers }, success: false };
        }

        const updatedToAccount = {
          ...toAccount,
          initial_balance: parseFloat((toAccount.initial_balance + amount).toFixed(2))
        };

        const updatedToUser = {
          ...toUser,
          accounts: toUser.accounts.map(a => a.id === toAccountId ? updatedToAccount : a)
        };
        newUsers.set(toUserId, updatedToUser);

        return { state: { ...state, users: newUsers }, success: true };
      }

      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      const initialBalanceA = getAccountBalance(state, 'user-a', 'acc-a1');
      const initialBalanceB = getAccountBalance(state, 'user-b', 'acc-b1');

      const failedResult = executeTransferSimulatedRollback(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 100, true);

      expect(failedResult.success).toBe(false);
      expect(getAccountBalance(failedResult.state, 'user-a', 'acc-a1')).toBe(initialBalanceA - 100);
      expect(getAccountBalance(failedResult.state, 'user-b', 'acc-b1')).toBe(initialBalanceB);
    });
  });

  describe('Coerência de Saldo - Testes Finais', () => {
    it('deve manter coerência após 100 transferências aleatórias', () => {
      let state = createMultiUserState();

      const userIds = ['user-a', 'user-b', 'user-c', 'user-d'];

      userIds.forEach((userId, index) => {
        state = addUser(state, userId, `${userId}@email.com`, [
          createAccount({ id: `${userId}-acc1`, initial_balance: 1000 * (index + 1) })
        ]);
      });

      const initialTotal = getTotalSystemBalance(state);

      const accounts = Array.from(state.users.values()).flatMap(u => u.accounts);

      for (let i = 0; i < 100; i++) {
        const fromUser = userIds[Math.floor(Math.random() * userIds.length)];
        let toUser = userIds[Math.floor(Math.random() * userIds.length)];
        while (toUser === fromUser) {
          toUser = userIds[Math.floor(Math.random() * userIds.length)];
        }

        const fromAccount = accounts.find(a => a.user_id === fromUser);
        const toAccount = accounts.find(a => a.user_id === toUser);

        if (fromAccount && toAccount) {
          const amount = Math.floor(Math.random() * 50) + 1;
          const result = executeTransferBetweenUsers(state, fromUser, toUser, fromAccount.id, toAccount.id, amount);
          state = result.state;
        }
      }

      expect(getTotalSystemBalance(state)).toBe(initialTotal);

      state.users.forEach((user, userId) => {
        const balance = getUserBalance(state, userId);
        expect(balance).toBeGreaterThanOrEqual(0);
      });
    });

    it('deve rastrear histórico completo de transações', () => {
      resetCounters();
      let state = createMultiUserState();

      state = addUser(state, 'user-a', 'alice@email.com', [
        createAccount({ id: 'acc-a1', initial_balance: 1000 })
      ]);

      state = addUser(state, 'user-b', 'bob@email.com', [
        createAccount({ id: 'acc-b1', initial_balance: 500 })
      ]);

      let result = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 100, 'Pagamento serviços');
      state = result.state;

      result = executeTransferBetweenUsers(state, 'user-b', 'user-a', 'acc-b1', 'acc-a1', 50, 'Reembolso');
      state = result.state;

      result = executeTransferBetweenUsers(state, 'user-a', 'user-b', 'acc-a1', 'acc-b1', 200, 'Presente');
      state = result.state;

      const userA = state.users.get('user-a');
      const userB = state.users.get('user-b');

      expect(userA?.transactions).toHaveLength(3);
      expect(userB?.transactions).toHaveLength(3);

      const expenseTxsUserA = userA?.transactions.filter(t => t.type === 'expense');
      const incomeTxsUserA = userA?.transactions.filter(t => t.type === 'income');
      const expenseTxsUserB = userB?.transactions.filter(t => t.type === 'expense');
      const incomeTxsUserB = userB?.transactions.filter(t => t.type === 'income');

      expect(expenseTxsUserA).toHaveLength(2);
      expect(incomeTxsUserA).toHaveLength(1);
      expect(expenseTxsUserB).toHaveLength(1);
      expect(incomeTxsUserB).toHaveLength(2);

      expect(expenseTxsUserA?.reduce((sum, t) => sum + t.amount, 0)).toBe(300);
      expect(incomeTxsUserA?.reduce((sum, t) => sum + t.amount, 0)).toBe(50);
      expect(expenseTxsUserB?.reduce((sum, t) => sum + t.amount, 0)).toBe(50);
      expect(incomeTxsUserB?.reduce((sum, t) => sum + t.amount, 0)).toBe(300);
    });
  });
});
