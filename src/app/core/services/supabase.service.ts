import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseAccount {
  id: string;
  user_id: string;
  institution_name: string;
  account_type: string;
  initial_balance: number;
  credit_limit?: number;
  closing_date?: number;
  due_date?: number;
  agency_number?: string;
  account_number?: string;
  card_name?: string;
  card_number?: string;
  card_expiration?: string;
  card_cvv?: string;
  color: string;
  icon: string;
  is_main_account: boolean;
  created_at: string;
}

export interface SupabaseTransaction {
  id: string;
  user_id: string;
  account_id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'confirmed' | 'pending' | 'cancelled';
  created_at: string;
  recurring_source_id?: string;
  loan_id?: string;
  installment_number?: number;
}

export interface SupabaseCardTransaction {
  id: string;
  user_id: string;
  card_id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  installment_number?: number;
  total_installments?: number;
  installment_group_id?: string;
  created_at: string;
}

export interface SupabaseContact {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  bank_name?: string;
  bank_agency?: string;
  account_number?: string;
  tax_id?: string;
  pix_key?: string;
  is_favorite: boolean;
  created_at: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  avatar: string | null;
  birthDate?: string | null;
}

export interface SupabaseLoan {
  id: string;
  user_id: string;
  creditor_name: string;
  type: 'fixed' | 'interest';
  initial_amount: number;
  current_balance: number;
  monthly_rate?: number;
  total_installments?: number;
  paid_installments: number;
  installment_amount?: number;
  due_day: number;
  start_date: string;
  status: 'active' | 'paid' | 'overdue';
  total_paid: number;
  account_id?: string;
  created_at: string;
}

export interface SupabaseLoanPayment {
  id: string;
  loan_id: string;
  account_id?: string;
  payment_date: string;
  amount_paid: number;
  interest_portion: number;
  principal_portion: number;
  installment_number?: number;
  balance_before: number;
  balance_after: number;
  adjustment_type?: 'redistribute' | 'next' | 'last' | 'none';
  adjustment_value?: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Shared signal for real-time profile sync across Header, Profile, etc.
  currentUserProfile = signal<UserProfile | null>(null);
  private initialFetch = false;
  private userPromise: Promise<any> | null = null;

  constructor() {
    const supabaseUrl = 'https://niobxjtufruqliakyydv.supabase.co';
    // Using the legacy anon JWT key — required for Edge Function auth validation (getUser)
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pb2J4anR1ZnJ1cWxpYWt5eWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTQxOTgsImV4cCI6MjA4ODczMDE5OH0.i9K6Sy9N978npTaFkRKarRIit8MiInJjwZIJ7Ffc8bY';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  get client() {
    return this.supabase;
  }

  getUrl(): string {
    return 'https://niobxjtufruqliakyydv.supabase.co';
  }

  // Example: Get current user
  async getUser() {
    if (this.userPromise) return this.userPromise;

    this.userPromise = (async () => {
      try {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user && !this.initialFetch) {
          this.refreshProfileMetadata(user);
          this.initialFetch = true;
        }
        return user;
      } finally {
        // Limpar a promessa após um curto período para permitir novas checagens se necessário,
        // mas mantendo tempo suficiente para resolver concorrências imediatas (ex: Promise.all)
        setTimeout(() => { this.userPromise = null; }, 500);
      }
    })();

    return this.userPromise;
  }

  private refreshProfileMetadata(user: any) {
    this.currentUserProfile.set({
      id: user.id,
      name: user.user_metadata?.['full_name'] || user.email?.split('@')[0] || '',
      email: user.email || '',
      avatar: user.user_metadata?.['avatar_url'] || null,
      birthDate: user.user_metadata?.['birth_date'] || null
    });
  }

  // Example: Sign out
  async signOut() {
    await this.supabase.auth.signOut();
    this.currentUserProfile.set(null);
    this.initialFetch = false;
  }

  // Account Management
  async getAccounts() {
    const user = await this.getUser();
    if (!user) return { data: [], error: new Error('User not authenticated') };

    return await this.supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
  }

  async createAccount(accountData: Partial<SupabaseAccount>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('accounts')
      .insert([{ ...accountData, user_id: user.id }])
      .select()
      .single();
  }

  async updateAccount(id: string, updates: Partial<SupabaseAccount>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
  }

  async deleteAccount(id: string) {
    const user = await this.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    return await this.supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  }

  // Transaction Management
  async getTransactions(accountId?: string) {
    const user = await this.getUser();
    if (!user) return { data: [], error: new Error('User not authenticated') };

    let query = this.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    return await query;
  }

  async createTransaction(txData: Partial<SupabaseTransaction>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('transactions')
      .insert([{ ...txData, user_id: user.id }])
      .select()
      .single();
  }

  async updateTransaction(id: string, updates: Partial<SupabaseTransaction>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
  }

  async getLoanTransaction(loanId: string, installmentNumber: number) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('transactions')
      .select('*')
      .eq('loan_id', loanId)
      .eq('installment_number', installmentNumber)
      .eq('user_id', user.id)
      .maybeSingle();
  }

  /**
   * Atualiza as parcelas futuras de um empréstimo fixo para redistribuir um saldo.
   */
  async updateFutureFixedInstallments(loanId: string, startInstallment: number, newAmount: number) {
    const user = await this.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    // 1. Atualizar todas as transações pendentes deste empréstimo a partir de um índice
    const { error } = await this.supabase
      .from('transactions')
      .update({ amount: newAmount })
      .eq('loan_id', loanId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .gte('installment_number', startInstallment);

    return { error };
  }

  /**
   * Ajusta uma parcela específica (próxima ou última) somando/subtraindo um valor.
   */
  async adjustSpecificInstallment(loanId: string, installmentNumber: number, delta: number) {
    const user = await this.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    // Primeiro buscamos a transação para saber o valor atual
    const { data: tx } = await this.getLoanTransaction(loanId, installmentNumber);
    if (!tx || tx.status !== 'pending') return { error: new Error('Transação pendente não encontrada') };

    const newAmount = Math.max(0, Number(tx.amount) + delta);

    const { error } = await this.supabase
      .from('transactions')
      .update({ amount: newAmount })
      .eq('id', tx.id);

    return { error };
  }

  /**
   * Sincroniza o saldo e status do empréstimo com base nas transações confirmadas.
   */
  async syncLoanData(loanId: string) {
    // Busca todas as transações confirmadas deste empréstimo para recalcular
    const { data: txs } = await this.supabase
      .from('transactions')
      .select('amount, installment_number')
      .eq('loan_id', loanId)
      .eq('status', 'confirmed');

    const confirmedTxs = txs || [];
    const totalPaid = confirmedTxs.reduce((sum, t) => sum + Number(t.amount), 0);
    const paidInstallments = confirmedTxs.filter(t => t.installment_number !== null).length;

    // Busca o empréstimo para saber o valor inicial
    const { data: loan } = await this.supabase
      .from('loans')
      .select('initial_amount, total_installments, type')
      .eq('id', loanId)
      .single();

    if (loan) {
      const currentBalance = Math.max(0, Number(loan.initial_amount) - totalPaid);
      const isPaid = loan.type === 'fixed' 
        ? (paidInstallments >= Number(loan.total_installments || 0) || currentBalance <= 0)
        : (currentBalance <= 0);

      const { data: updatedLoan, error } = await this.updateLoan(loanId, {
        total_paid: totalPaid,
        paid_installments: paidInstallments,
        current_balance: currentBalance,
        status: isPaid ? 'paid' : 'active'
      });
      
      return { data: updatedLoan, error };
    }
    
    return { data: null, error: new Error('Loan not found') };
  }

  /**
   * Adiciona uma nova parcela ao final do contrato.
   */
  async addExtraInstallment(loanId: string, amount: number) {
    const user = await this.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    // 1. Buscar o empréstimo para saber a última parcela e conta
    const { data: loan } = await this.supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (!loan) return { error: new Error('Loan not found') };

    const nextInstallmentNum = (loan.total_installments || 0) + 1;
    
    // 2. Calcular data (mês seguinte à data de início + parcelas totais)
    const startDate = new Date(loan.start_date + 'T12:00:00');
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + (nextInstallmentNum - 1));

    // 3. Criar a nova transação pendente
    const { error: txError } = await this.supabase.from('transactions').insert([{
      user_id: user.id,
      loan_id: loanId,
      account_id: loan.account_id,
      description: `Parcela Extra ${nextInstallmentNum}/${nextInstallmentNum} - ${loan.creditor_name}`,
      amount: amount,
      date: dueDate.toISOString().split('T')[0],
      category: 'Empréstimo',
      type: 'expense',
      status: 'pending',
      installment_number: nextInstallmentNum
    }]);

    if (txError) return { error: txError };

    // 4. Atualizar o contrato com o novo total de parcelas
    const { error: loanError } = await this.supabase
      .from('loans')
      .update({ total_installments: nextInstallmentNum })
      .eq('id', loanId);

    return { error: loanError };
  }

  // Credit Card Transaction Management
  async getCardTransactions(cardId?: string) {
    const user = await this.getUser();
    if (!user) return { data: [], error: new Error('User not authenticated') };

    let query = this.supabase
      .from('credit_card_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (cardId) {
      query = query.eq('card_id', cardId);
    }

    return await query;
  }

  async createCardTransaction(txData: Partial<SupabaseCardTransaction>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('credit_card_transactions')
      .insert([{ ...txData, user_id: user.id }]);
  }

  async createCardTransactions(txs: Partial<SupabaseCardTransaction>[]) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    const txsWithUser = txs.map(tx => ({ ...tx, user_id: user.id }));

    return await this.supabase
      .from('credit_card_transactions')
      .insert(txsWithUser);
  }

  async updateCardTransaction(id: string, updates: Partial<SupabaseCardTransaction>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('credit_card_transactions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
  }

  async deleteCardTransaction(id: string) {
    const user = await this.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    return await this.supabase
      .from('credit_card_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
  }

  async deleteCardTransactionGroup(groupId: string) {
    const user = await this.getUser();
    if (!user) return { error: new Error('User not authenticated') };

    return await this.supabase
      .from('credit_card_transactions')
      .delete()
      .eq('installment_group_id', groupId)
      .eq('user_id', user.id);
  }

  // Contact Management
  async getContacts() {
    const user = await this.getUser();
    if (!user) return { data: [], error: new Error('User not authenticated') };

    return await this.supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });
  }

  async createContact(contactData: Partial<SupabaseContact>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('contacts')
      .insert([{ ...contactData, user_id: user.id }])
      .select()
      .single();
  }

  async updateContact(id: string, contactData: Partial<SupabaseContact>) {
    return await this.supabase
      .from('contacts')
      .update(contactData)
      .eq('id', id)
      .select()
      .single();
  }

  async deleteContact(id: string) {
    return await this.supabase
      .from('contacts')
      .delete()
      .eq('id', id);
  }

  // User Discovery
  async searchUserByEmail(email: string) {
    return await this.supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('email', email)
      .single();
  }

  async getCategories(type?: 'income' | 'expense') {
    const user = await this.getUser();
    if (!user) return { data: [], error: new Error('User not authenticated') };

    let query = this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) return { data, error };

    // Processar no frontend (bypass no erro PGRST de esquema quebrado do Supabase)
    const allCategories = data || [];
    const mainCategories = allCategories.filter((c: any) => c.parent_id === null);

    const result = mainCategories.map((main: any) => {
      const subCount = allCategories.filter((sub: any) => sub.parent_id === main.id).length;
      return {
        ...main,
        subcategories: [{ count: subCount }]
      };
    });

    return { data: result, error: null };
  }

  async getAllCategories(type?: 'income' | 'expense') {
    const user = await this.getUser();
    if (!user) return { data: [], error: new Error('User not authenticated') };

    let query = this.supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) return { data: [], error };
    return { data: data || [], error: null };
  }

  async createCategory(categoryData: any) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    return await this.supabase
      .from('categories')
      .insert([{ ...categoryData, user_id: user.id }])
      .select()
      .single();
  }

  async updateCategory(id: string, categoryData: any) {
    return await this.supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();
  }

  async deleteCategory(id: string) {
    return await this.supabase
      .from('categories')
      .delete()
      .eq('id', id);
  }

  // Profile Management
  async uploadAvatar(file: File) {
    const user = await this.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = this.supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  }

  async updateUserMetadata(data: any) {
    const { data: { user }, error } = await this.supabase.auth.updateUser({
      data: data
    });
    if (error) throw error;
    if (user) {
      this.refreshProfileMetadata(user);
    }
  }

  // ── Loan Management ──────────────────────────────────────────────────────────

  async getLoans() {
    const user = await this.getUser();
    if (!user) return { data: [], error: new Error('User not authenticated') };
    return await this.supabase
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
  }

  async createLoan(loanData: Partial<SupabaseLoan>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    const { data: loan, error } = await this.supabase
      .from('loans')
      .insert([{ ...loanData, user_id: user.id }])
      .select()
      .single();

    if (error || !loan) return { data: loan, error };

    // Se for FIXO e tiver parcelas, gera o cronograma automaticamente
    if (loan.type === 'fixed' && loan.total_installments && loan.total_installments > 0) {
      const installments: any[] = [];
      const startDate = new Date(loan.start_date + 'T12:00:00');
      const totalAmount = loan.initial_amount;
      const installmentAmount = loan.installment_amount || 0;
      let accumulated = 0;
      
      for (let i = 1; i <= (loan.total_installments || 0); i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + (i - 1));
        
        // Ajuste fino na última parcela para bater o centavo do valor total
        let currentAmount = installmentAmount;
        if (i === loan.total_installments) {
          currentAmount = parseFloat((totalAmount - accumulated).toFixed(2));
        } else {
          accumulated = parseFloat((accumulated + currentAmount).toFixed(2));
        }

        installments.push({
          user_id: user.id,
          account_id: loan.account_id,
          description: `Parcela ${i}/${loan.total_installments} - ${loan.creditor_name}`,
          amount: currentAmount,
          date: dueDate.toISOString().split('T')[0],
          category: 'Empréstimo',
          type: 'expense',
          status: 'pending',
          loan_id: loan.id,
          installment_number: i
        });
      }

      // Inserção em lote das transações
      await this.supabase.from('transactions').insert(installments);
    }

    return { data: loan, error: null };
  }

  async updateLoan(id: string, updates: Partial<SupabaseLoan>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };
    return await this.supabase
      .from('loans')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
  }

  async deleteLoan(id: string) {
    const user = await this.getUser();
    if (!user) return { error: new Error('User not authenticated') };
    return await this.supabase.from('loans').delete().eq('id', id).eq('user_id', user.id);
  }

  async getLoanPayments(loanId: string) {
    const user = await this.getUser();
    if (!user) return { data: [], error: new Error('User not authenticated') };
    return await this.supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .eq('user_id', user.id)
      .order('payment_date', { ascending: false });
  }

  async createLoanPayment(paymentData: Partial<SupabaseLoanPayment>) {
    const user = await this.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };
    return await this.supabase
      .from('loan_payments')
      .insert([{ ...paymentData, user_id: user.id }])
      .select()
      .single();
  }

  async getDashboardSummary() {
    const user = await this.getUser();
    if (!user) return null;

    // Fetch everything in parallel for performance
    const [
      accRes, 
      txRes, 
      loanRes, 
      goalRes, 
      goalContribRes,
      catRes,
      recurringRes,
      cardTxRes
    ] = await Promise.all([
      this.getAccounts(),
      this.supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
      this.getLoans(),
      this.supabase.from('goals').select('*').eq('user_id', user.id),
      this.supabase.from('goal_contributions').select('*').eq('user_id', user.id),
      this.supabase.from('categories').select('*').eq('user_id', user.id),
      this.supabase.from('recurring_transactions').select('*').eq('user_id', user.id).eq('is_active', true),
      this.supabase.from('credit_card_transactions').select('*').eq('user_id', user.id).order('date', { ascending: false })
    ]);

    const accounts = accRes.data || [];
    const transactions = txRes.data || [];
    const loans = loanRes.data || [];
    const goals = goalRes.data || [];
    const goalContributions = goalContribRes.data || [];
    const categories = catRes.data || [];
    const recurringTransactions = recurringRes.data || [];
    const cardTransactions = cardTxRes.data || [];

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 1. Basic Stats
    const initialBalanceSum = accounts.reduce((sum, acc) => sum + Number(acc.initial_balance), 0);
    const totalIncome = transactions
      .filter(tx => tx.type === 'income' && tx.status === 'confirmed')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalExpense = transactions
      .filter(tx => tx.type === 'expense' && tx.status === 'confirmed')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    
    const totalBalance = initialBalanceSum + totalIncome - totalExpense;

    // 1. Calcular faturas individuais primeiro para poder somar no total de gastos
    const creditCards = accounts
      .filter(acc => acc.account_type === 'credit_card')
      .map(card => {
        const closeDay = Number(card.closing_date || 10);
        const dueDay = Number(card.due_date || 17);
        
        const todayDay = now.getDate();
        const todayMonth = now.getMonth();
        const todayYear = now.getFullYear();

        // Mês Absoluto Hoje
        const nowAbs = todayYear * 12 + todayMonth;

        // Fatura Vigente: segue a lógica do card (pula se passar do vencimento)
        let activeAbsMonth = nowAbs;
        if (todayDay > dueDay) {
          activeAbsMonth++;
        }

        const getTxAbsCompetence = (dateStr: string, closingD: number, dueD: number) => {
          if (!dateStr) return 0;
          const cleanDate = dateStr.split('T')[0];
          const parts = cleanDate.split('-');
          if (parts.length < 3) return 0;
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          let txMonth = m;
          let txYear = y;
          if (d >= closingD) {
            txMonth++;
            if (txMonth > 11) { txMonth = 0; txYear++; }
          }
          let dueMonth = txMonth;
          let dueYear = txYear;
          if (closingD > dueD) {
            dueMonth++;
            if (dueMonth > 11) { dueMonth = 0; dueYear++; }
          }
          return dueYear * 12 + dueMonth;
        };

        const currentBillValue = cardTransactions
          .filter((tx: any) => 
            tx.card_id === card.id && 
            tx.status === 'confirmed' && 
            getTxAbsCompetence(tx.date, closeDay, dueDay) === activeAbsMonth
          )
          .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

        const totalDebt = cardTransactions
          .filter((tx: any) => tx.card_id === card.id && (tx.status === 'confirmed' || tx.status === 'pending'))
          .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

        return {
          id: card.id,
          name: card.institution_name,
          lastDigits: card.account_number?.slice(-4) || '0000',
          currentBill: currentBillValue,
          limit: Number(card.credit_limit || 0),
          available: Math.max(0, Number(card.credit_limit || 0) - totalDebt),
          color: card.color || '#94a3b8'
        };
      });

    // 2. monthlySpending agora é Transações de Banco + Soma das Faturas Ativas dos Cartões
    const monthlySpendingBank = transactions.filter(tx => {
      const txDateStr = (tx.date || '').split('T')[0];
      const txDate = new Date(txDateStr + 'T12:00:00');
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return tx.type === 'expense' && tx.status === 'confirmed' && tx.category !== 'Transferência' && txDate >= startOfMonth;
    }).reduce((sum, tx) => sum + Number(tx.amount), 0);

    const monthlySpendingCards = creditCards.reduce((sum, card) => sum + card.currentBill, 0);
    const monthlySpending = monthlySpendingBank + monthlySpendingCards;

    // Calcular mudanças (spent)
    const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const lastMonthSpending = [
      ...transactions.filter(tx => {
        const txDateStr = (tx.date || '').split('T')[0];
        const txDate = new Date(txDateStr + 'T12:00:00');
        return tx.type === 'expense' && tx.status === 'confirmed' && txDate >= lastMonthFirst && txDate <= lastMonthLast;
      }),
      ...cardTransactions.filter((tx: any) => {
        const txDateStr = (tx.date || '').split('T')[0];
        const txDate = new Date(txDateStr + 'T12:00:00');
        return tx.status === 'confirmed' && txDate >= lastMonthFirst && txDate <= lastMonthLast;
      })
    ].reduce((sum, tx) => sum + Number(tx.amount), 0);
    
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

    // 2. Predicted Balance (Current + Pending this month)
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

    // 6. Total Loans
    const totalLoans = loans.reduce((sum, loan) => sum + Number(loan.current_balance), 0);




    // 5. Recurrence (Fixed Movements)
    // Assume fixed movements are those with a recurring_source_id or specifically tagged (logic can be refined)
    // For now, let's just use some sample logic or if there's a flag in categories/transactions
    const recurringIncome = recurringTransactions
      .filter((rt: any) => rt.type === 'income')
      .reduce((sum: number, rt: any) => sum + Number(rt.amount), 0);
    
    const recurringExpenses = recurringTransactions
      .filter((rt: any) => rt.type === 'expense')
      .reduce((sum: number, rt: any) => sum + Number(rt.amount), 0);

    // 6. Goals Progress
    const goalsWithProgress = goals.map(goal => {
      const contribs = goalContributions.filter(c => c.goal_id === goal.id);
      const saved = contribs.reduce((sum, c) => sum + Number(c.amount), 0);
      return {
        ...goal,
        current_amount: saved,
        progress: goal.target_amount > 0 ? (saved / goal.target_amount) * 100 : 0
      };
    });

    // 7. Spending By Category (Last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const categorySpending = categories.map(cat => {
      const amountFromTransactions = transactions
        .filter(tx => {
          const txDateStr = (tx.date || '').split('T')[0];
          const txDate = new Date(txDateStr + 'T12:00:00');
          return tx.category === cat.name && tx.type === 'expense' && tx.status === 'confirmed' && txDate >= thirtyDaysAgo;
        })
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const amountFromCards = cardTransactions
        .filter((tx: any) => {
          const txDateStr = (tx.date || '').split('T')[0];
          const txDate = new Date(txDateStr + 'T12:00:00');
          return tx.category === cat.name && tx.status === 'confirmed' && txDate >= thirtyDaysAgo;
        })
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      return {
        name: cat.name,
        amount: amountFromTransactions + amountFromCards,
        icon: cat.icon || 'category',
        color: cat.color || '#cbd5e1'
      };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 4);

    // 8. Heritage Evolution (Last 6 months)
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
      recentTransactions: [
        ...transactions,
        ...cardTransactions.map((tx: any) => ({ ...tx, type: 'expense' }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5).map(tx => {
        const cat = categories.find(c => c.name === tx.category);
        return {
          ...tx,
          categoryName: tx.category || 'Outros',
          categoryColor: cat?.color || '#cbd5e1'
        };
      })
    };
  }
}
