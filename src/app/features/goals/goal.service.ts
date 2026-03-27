import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';
import { Goal, GoalContribution } from './goal.models';

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private supabaseService = inject(SupabaseService);
  // Using any to bypass strict private accessor for now just to get the client
  private get supabase() { return (this.supabaseService as any).supabase; }
  private loading = inject(LoadingService);

  goals = signal<Goal[]>([]);
  contributions = signal<GoalContribution[]>([]);
  allContributions = signal<GoalContribution[]>([]);

  async loadGoals() {
    try {
      this.loading.show();
      const user = await this.supabaseService.getUser();
      if (!user) return;

      const { data, error: goalsError } = await this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;
      const goals = data as any[];

      // Need to compute current_amount for each goal
      const { data: contribs, error: contribError } = await this.supabase
        .from('goal_contributions')
        .select('goal_id, amount')
        .eq('user_id', user.id);

      if (contribError) throw contribError;

      // Map contributions to goals
      const goalsWithAmount = goals.map(goal => {
        const goalContribs = contribs.filter((c: any) => c.goal_id === goal.id);
        const currentAmount = goalContribs.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
        return { ...goal, current_amount: currentAmount };
      });

      this.goals.set(goalsWithAmount || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      this.loading.hide();
    }
  }

  async loadRecentContributions() {
    try {
      const user = await this.supabaseService.getUser();
      if (!user) return;

      const { data, error } = await this.supabase
        .from('goal_contributions')
        .select('*, goals:goal_id(name, color, icon)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      this.contributions.set((data as any[]) || []);
    } catch (error) {
      console.error('Error loading contributions:', error);
    }
  }

  async loadAllContributions() {
    try {
      this.loading.show();
      const user = await this.supabaseService.getUser();
      if (!user) return;

      const { data, error } = await this.supabase
        .from('goal_contributions')
        .select('*, goals:goal_id(name, color, icon)')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      this.allContributions.set((data as any[]) || []);
    } catch (error) {
      console.error('Error loading all contributions:', error);
    } finally {
      this.loading.hide();
    }
  }

  async createGoal(goal: Partial<Goal>) {
    try {
      this.loading.show();
      const user = await this.supabaseService.getUser();
      if (!user) throw new Error('User not authenticated');

      const { current_amount, account_id, ...goalData } = goal as any;

      const { data, error } = await this.supabase
        .from('goals')
        .insert([{ ...goalData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      this.goals.update(goals => [{ ...(data as any), current_amount: 0 }, ...goals]);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating goal:', error);
      return { data: null, error };
    } finally {
      this.loading.hide();
    }
  }

  async updateGoal(id: string, updates: Partial<Goal>) {
    try {
      this.loading.show();
      const { current_amount, account_id, ...updatesToSave } = updates as any;
      const { data, error } = await this.supabase
        .from('goals')
        .update(updatesToSave)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      this.goals.update(goals => 
        goals.map(g => g.id === id ? { ...g, ...(data as any) } : g)
      );
      return { data, error: null };
    } catch (error) {
      console.error('Error updating goal:', error);
      return { data: null, error };
    } finally {
      this.loading.hide();
    }
  }

  async updateGoalStatus(id: string, status: 'active' | 'completed' | 'suspended') {
    return this.updateGoal(id, { status });
  }

  async deleteGoal(id: string) {
    try {
      this.loading.show();
      const { error } = await this.supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      this.goals.update(goals => goals.filter(g => g.id !== id));
      return { error: null };
    } catch (error) {
      console.error('Error deleting goal:', error);
      return { error };
    } finally {
      this.loading.hide();
    }
  }

  async addContribution(contribution: Partial<GoalContribution>) {
    try {
      this.loading.show();
      const user = await this.supabaseService.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('goal_contributions')
        .insert([{ ...contribution, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      // Update the local goal amount
      this.goals.update(goals => 
        goals.map(g => 
          g.id === contribution.goal_id 
            ? { ...g, current_amount: (g.current_amount || 0) + Number(contribution.amount) } 
            : g
        )
      );
      
      await this.loadRecentContributions();
      return { data: data as any, error: null };
    } catch (error) {
      console.error('Error adding contribution:', error);
      return { data: null, error };
    } finally {
      this.loading.hide();
    }
  }
}
