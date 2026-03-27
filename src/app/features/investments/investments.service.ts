import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  category: 'AÇÕES' | 'FIIS' | 'CRIPTO' | 'RENDA FIXA' | 'OUTROS';
  initial_amount: number;
  current_amount: number;
  expected_yield: number;
  status: 'active' | 'inactive';
  created_at: string;
  
  // UI helpers
  changeAmount?: number;
  changePercent?: number;
}

export interface InvestmentTransaction {
  id: string;
  investment_id: string;
  user_id: string;
  account_id?: string;
  type: 'buy' | 'sell' | 'yield' | 'adjustment';
  amount: number;
  date: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvestmentService {
  private supabase = inject(SupabaseService);

  // State
  investments = signal<Investment[]>([]);
  transactions = signal<InvestmentTransaction[]>([]);

  // Computed Derived State
  totalInvested = computed(() => {
    return this.investments().reduce((sum, inv) => sum + Number(inv.current_amount), 0);
  });

  totalProfitLoss = computed(() => {
    return this.investments().reduce((sum, inv) => {
      return sum + (Number(inv.current_amount) - Number(inv.initial_amount));
    }, 0);
  });

  totalProfitLossPercent = computed(() => {
    const totalInitial = this.investments().reduce((sum, inv) => sum + Number(inv.initial_amount), 0);
    if (totalInitial === 0) return 0;
    return (this.totalProfitLoss() / totalInitial) * 100;
  });

  // To match the design's "Retorno Mensal" logic, we need to know the initial value of the month.
  // For simplicity since we don't have historical snapshot tables yet, we'll estimate or mock this metric.
  monthlyReturn = computed(() => {
    // Basic approximation: 20% of the total profit
    const roughEstimate = this.totalProfitLoss() * 0.2;
    return roughEstimate; 
  });
  monthlyReturnPercent = computed(() => {
    if (this.totalInvested() === 0) return 0;
     return (this.monthlyReturn() / (this.totalInvested() - this.monthlyReturn())) * 100;
  });


  async loadInvestments() {
    const user = await this.supabase.getUser();
    if (!user) return;

    const { data, error } = await this.supabase.client
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading investments:', error);
      return;
    }

    // Process UI helpers
    const processedData = (data as Investment[]).map(inv => {
        const current = Number(inv.current_amount);
        const initial = Number(inv.initial_amount);
        const change = current - initial;
        const changePercent = initial > 0 ? (change / initial) * 100 : 0;
        
        return {
            ...inv,
            changeAmount: change,
            changePercent: changePercent
        };
    });

    this.investments.set(processedData);
  }

  async createInvestment(investment: Partial<Investment>) {
    const user = await this.supabase.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.supabase.client
      .from('investments')
      .insert({
        user_id: user.id,
        name: investment.name,
        category: investment.category,
        initial_amount: investment.initial_amount,
        current_amount: investment.initial_amount, // starts the same
        expected_yield: investment.expected_yield,
        status: investment.status || 'active'
      })
      .select()
      .single();

    if (error) throw error;
    
    await this.loadInvestments(); // Refresh
    return data;
  }

  async updateInvestment(id: string, updates: Partial<Investment>) {
     // Allowed to edit name, category, expected yield, status
     const { data, error } = await this.supabase.client
        .from('investments')
        .update({
            name: updates.name,
            category: updates.category,
            expected_yield: updates.expected_yield,
            status: updates.status
        })
        .eq('id', id);

     if (error) throw error;
     await this.loadInvestments();
  }

  async deleteInvestment(id: string) {
    const { error } = await this.supabase.client
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await this.loadInvestments();
  }

  async addContribution(investmentId: string, amount: number, accountId?: string, dateStr?: string) {
      const user = await this.supabase.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. Get current investment
      const currentInv = this.investments().find(i => i.id === investmentId);
      if (!currentInv) throw new Error('Investment not found');

      // 2. Add transaction record
      const { error: txError } = await this.supabase.client
        .from('investment_transactions')
        .insert({
            user_id: user.id,
            investment_id: investmentId,
            account_id: accountId || null,
            type: 'buy',
            amount: amount,
            date: dateStr || new Date().toISOString()
        });
        
      if (txError) throw txError;

      // 3. Optional: Deduct from source account (if account provided). 
      // For now, we assume the user just wants track the asset amount increase.
      // But if we wanted we would do: UPDATE accounts SET initial_balance = ... WHERE id = accountId

      // 4. Update investment current_amount (and initial_amount to reflect cost basis going up)
      const newAmount = Number(currentInv.current_amount) + amount;
      const newInitial = Number(currentInv.initial_amount) + amount; // Adding aportes raises the "cost basis"

      const { error: updateError } = await this.supabase.client
        .from('investments')
        .update({
             current_amount: newAmount,
             initial_amount: newInitial
        })
        .eq('id', investmentId);

      if (updateError) throw updateError;

      await this.loadInvestments();
  }
}
