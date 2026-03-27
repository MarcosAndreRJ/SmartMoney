import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Plan, Subscription, AdminMetrics, SystemNotification, UserProfile, GlobalTransaction } from '../models/admin.models';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private supabase = inject(SupabaseService);
  private client = this.supabase.client;

  async isAdmin(): Promise<boolean> {
    const user = await this.supabase.getUser();
    if (!user) return false;
    
    // Verificar role em user_metadata (Supabase usa raw_user_meta_data)
    const role = (user as any).user_metadata?.['role'] || (user as any).app_metadata?.['role'];
    return role === 'admin';
  }

  async getMetrics(): Promise<AdminMetrics | null> {
    const { data, error } = await this.client.rpc('get_admin_metrics');
    if (error) { 
      console.error('Error fetching metrics:', error); 
      return this.getDefaultMetrics();
    }
    return data as AdminMetrics;
  }

  private getDefaultMetrics(): AdminMetrics {
    return {
      total_users: 0,
      active_users: 0,
      new_users_today: 0,
      total_transactions: 0,
      total_balance: 0,
      active_subscriptions: 0,
      revenue_month: 0,
      subscriptions_by_plan: []
    };
  }

  async getAllUsers(): Promise<UserProfile[]> {
    // Buscar de auth.users via RPC (não funciona via client direct)
    const { data, error } = await this.client.rpc('get_all_users');
    
    if (error) { 
      console.error('Error fetching users:', error); 
      return []; 
    }
    
    return (data || []).map((u: any) => ({
      id: u.id,
      name: u.full_name || u.email?.split('@')[0] || '',
      email: u.email || '',
      avatar: u.avatar_url,
      role: u.role || 'user',
      created_at: u.created_at
    }));
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<boolean> {
    // Atualizar role em user_metadata (Opção B)
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      user_metadata: { role }
    });
    
    return !error;
  }

  async createUserWithEmail(email: string, password: string, metadata: any = {}): Promise<{ data: any; error: string | null }> {
    try {
      const { data, error } = await this.client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata
      });
      
      if (error) {
        return { data: null, error: error.message };
      }
      
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: e.message };
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    // Atualizar em user_metadata (Opção B)
    const metadata: any = {};
    if (updates.name) metadata.full_name = updates.name;
    if (updates.role) metadata.role = updates.role;
    
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      user_metadata: metadata
    });
    
    return !error;
  }

  async deactivateUser(userId: string): Promise<boolean> {
    const { error } = await this.client.auth.admin.updateUserById(userId, {
      user_metadata: { disabled: true }
    });
    return !error;
  }

  async getPlans(): Promise<Plan[]> {
    // Debug: check current user
    const { data: { user } } = await this.client.auth.getUser();
    console.log('Current user:', user);
    console.log('User metadata:', user?.user_metadata);
    console.log('App metadata:', user?.app_metadata);
    
    const { data, error } = await this.client
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
    console.log('Plans data from Supabase:', data);

    const defaultResources = {
      account_transfers: false,
      goals: false,
      loans: false,
      investments: false,
      whatsapp_entries: false,
      shared_accounts: false
    };

    return (data || []).map(p => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      features: p.features || [],
      restrictions: p.restrictions || {
        max_accounts: p.limits?.accounts ?? null,
        max_cards: null
      },
      resources: {
        ...defaultResources,
        ...(p.resources || {})
      },
      is_active: p.is_active,
      created_at: p.created_at
    }));
  }

  async createPlan(plan: Partial<Plan>): Promise<boolean> {
    const { error } = await this.client
      .from('plans')
      .insert([{
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        features: plan.features,
        restrictions: plan.restrictions,
        resources: plan.resources,
        is_active: plan.is_active ?? true
      }]);
    return !error;
  }

  async updatePlan(id: string, updates: Partial<Plan>): Promise<boolean> {
    const { error } = await this.client
      .from('plans')
      .update({
        slug: updates.slug,
        name: updates.name,
        description: updates.description,
        price: updates.price,
        features: updates.features,
        restrictions: updates.restrictions,
        resources: updates.resources,
        is_active: updates.is_active
      })
      .eq('id', id);
    return !error;
  }

  async deletePlan(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('plans')
      .delete()
      .eq('id', id);
    return !error;
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select(`
        *,
        profiles:user_id (email),
        plans:plan_id (name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) { 
      console.error('Error fetching subscriptions:', error); 
      return []; 
    }
    
    return (data || []).map(s => ({
      id: s.id,
      user_id: s.user_id,
      user_email: s.profiles?.email,
      plan_id: s.plan_id,
      plan_name: s.plans?.name,
      status: s.status,
      start_date: s.start_date,
      end_date: s.end_date,
      payment_gateway: s.payment_gateway,
      gateway_subscription_id: s.gateway_subscription_id,
      created_at: s.created_at
    }));
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const { data } = await this.client
      .from('subscriptions')
      .select('*, plans:plan_id (name)')
      .eq('user_id', userId)
      .single();
    return data;
  }

  async createSubscription(sub: Partial<Subscription>): Promise<boolean> {
    const { error } = await this.client
      .from('subscriptions')
      .insert([{
        user_id: sub.user_id,
        plan_id: sub.plan_id,
        status: sub.status || 'trial',
        start_date: sub.start_date || new Date().toISOString(),
        end_date: sub.end_date,
        payment_gateway: sub.payment_gateway || 'manual',
        gateway_subscription_id: sub.gateway_subscription_id
      }]);
    return !error;
  }

  async cancelSubscription(id: string): Promise<boolean> {
    const { error } = await this.client
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    return !error;
  }

  async extendSubscription(id: string, days: number): Promise<boolean> {
    const { data } = await this.client
      .from('subscriptions')
      .select('end_date')
      .eq('id', id)
      .single();
    
    if (!data) return false;
    
    const currentEndDate = data.end_date ? new Date(data.end_date) : new Date();
    currentEndDate.setDate(currentEndDate.getDate() + days);
    
    const { error } = await this.client
      .from('subscriptions')
      .update({ end_date: currentEndDate.toISOString() })
      .eq('id', id);
    
    return !error;
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<boolean> {
    const { error } = await this.client
      .from('subscriptions')
      .update({
        plan_id: updates.plan_id,
        status: updates.status,
        end_date: updates.end_date,
        payment_gateway: updates.payment_gateway
      })
      .eq('id', id);
    return !error;
  }

  async sendNotification(notification: Partial<SystemNotification>): Promise<boolean> {
    const { error } = await this.client
      .from('system_notifications')
      .insert([{
        user_id: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'in_app',
        status: 'sent',
        sent_at: new Date().toISOString()
      }]);
    
    if (!error && notification.type === 'in_app') {
      await this.client.rpc('create_notification', {
        p_user_id: notification.user_id,
        p_type: 'info',
        p_title: notification.title,
        p_description: notification.message,
        p_icon: 'notifications_active',
        p_color: '#3B82F6',
        p_bg_color: '#EFF6FF'
      });
    }
    
    return !error;
  }

  async sendBulkNotification(userIds: string[], notification: Partial<SystemNotification>): Promise<number> {
    if (userIds.length === 0) return 0;
    
    const inserts = userIds.map(userId => ({
      user_id: userId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'in_app',
      status: 'sent',
      sent_at: new Date().toISOString()
    }));
    
    const { error } = await this.client
      .from('system_notifications')
      .insert(inserts);
    
    if (error) {
      console.error('Error sending bulk notification:', error);
      return 0;
    }

    if (notification.type === 'in_app') {
      for (const userId of userIds) {
        await this.client.rpc('create_notification', {
          p_user_id: userId,
          p_type: 'info',
          p_title: notification.title,
          p_description: notification.message,
          p_icon: 'notifications_active',
          p_color: '#3B82F6',
          p_bg_color: '#EFF6FF'
        });
      }
    }
    
    return userIds.length;
  }

  async sendBroadcastNotification(notification: Partial<SystemNotification>): Promise<number> {
    // Buscar todos os usuários via RPC
    const { data: users, error } = await this.client.rpc('get_all_users');
    
    if (error || !users || users.length === 0) {
      console.error('Error fetching users for broadcast:', error);
      return 0;
    }
    
    return this.sendBulkNotification(users.map((u: any) => u.id), notification);
  }

  async getNotificationHistory(userId?: string): Promise<SystemNotification[]> {
    let query = this.client
      .from('system_notifications')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data } = await query;
    return data || [];
  }

  async getAllTransactions(limit = 100): Promise<GlobalTransaction[]> {
    const { data, error } = await this.client
      .from('transactions')
      .select(`
        *,
        profiles:user_id (email, full_name),
        accounts:account_id (institution_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) { 
      console.error('Error fetching transactions:', error); 
      return []; 
    }
    
    return (data || []).map(t => ({
      id: t.id,
      user_id: t.user_id,
      user_email: t.profiles?.email,
      user_name: t.profiles?.full_name,
      account_id: t.account_id,
      account_name: t.accounts?.institution_name,
      description: t.description,
      amount: Number(t.amount),
      date: t.date,
      category: t.category,
      type: t.type,
      status: t.status || 'confirmed',
      created_at: t.created_at
    }));
  }

  async getUserStats(userId: string): Promise<{
    totalTransactions: number;
    totalAccounts: number;
    totalBalance: number;
  }> {
    const { count: totalTransactions } = await this.client
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: accounts } = await this.client
      .from('accounts')
      .select('initial_balance')
      .eq('user_id', userId);

    const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.initial_balance || 0), 0) || 0;

    return {
      totalTransactions: totalTransactions || 0,
      totalAccounts: accounts?.length || 0,
      totalBalance
    };
  }
}
