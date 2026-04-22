import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { PlanCode, PLAN_FEATURES } from '../constants/plans.constants';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private supabase = inject(SupabaseService);

  async getCurrentPlan(): Promise<PlanCode> {
    const details = await this.getUserPlan();
    return details.plan;
  }

  async getUserPlan(): Promise<{ plan: PlanCode; resources: any; isPremium: boolean }> {
    const user = await this.supabase.getUser();
    if (!user) return { plan: PlanCode.BASIC, resources: {}, isPremium: false };

    const { data: userData, error: userError } = await this.supabase.client
      .from('active_user_plan')
      .select('active_plan, is_premium_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (userError || !userData || !userData.is_premium_active) {
      return { plan: PlanCode.BASIC, resources: {}, isPremium: false };
    }

    const activePlan = String(userData.active_plan || '').toLowerCase() as PlanCode;

    // Buscar os resources na tabela plans usando o slug
    const { data: planData } = await this.supabase.client
      .from('plans')
      .select('resources')
      .eq('slug', activePlan)
      .maybeSingle();

    return { 
      plan: activePlan, 
      resources: planData?.resources || {}, 
      isPremium: userData.is_premium_active 
    };
  }

  async getAccountLimit(): Promise<number | null> {
    const { resources, plan } = await this.getUserPlan();
    
    // 1. Tentar via resources do banco (mais atualizado)
    if (resources && resources.max_accounts !== undefined) {
      return resources.max_accounts;
    }

    // 2. Fallback para PLAN_FEATURES estático
    const features = PLAN_FEATURES[plan] || [];
    const accountsFeature = features.find(f => f.startsWith('accounts:'));
    
    if (accountsFeature) {
      const value = accountsFeature.split(':')[1];
      if (value === 'unlimited') return null;
      return parseInt(value, 10);
    }

    return 2; // Default fallback (Basic)
  }

  async startCheckout(priceId: string): Promise<string> {
    if (!priceId) {
      throw new Error('Plano invalido: priceId nao informado');
    }

    const {
      data: { session }
    } = await (this.supabase.client.auth as any).getSession();

    if (!session?.access_token) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    const { data, error } = await this.supabase.client.functions.invoke('create-checkout', {
      body: { priceId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      const maybeContext = (error as any).context;
      if (maybeContext) {
        try {
          const payload = await maybeContext.json();
          if (payload?.error) {
            throw new Error(String(payload.error));
          }
        } catch (contextErr) {
          if (contextErr instanceof Error && contextErr.message) {
            throw contextErr;
          }
        }
      }
      throw new Error(error.message || 'Erro ao comunicar com o servidor de pagamento');
    }

    if (!data?.url) {
      throw new Error('Resposta inválida do servidor');
    }

    return data.url as string;
  }

  async cancelSubscription(cancelAtPeriodEnd: boolean = true): Promise<{
    success: boolean;
    message: string;
    cancel_at_period_end: boolean;
    current_period_end?: string;
  }> {
    const {
      data: { session }
    } = await (this.supabase.client.auth as any).getSession();

    if (!session?.access_token) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    const { data, error } = await this.supabase.client.functions.invoke('manage-subscription', {
      body: { action: 'cancel', cancelAtPeriodEnd },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao cancelar assinatura');
    }

    return {
      success: data.success,
      message: data.message,
      cancel_at_period_end: data.cancel_at_period_end,
      current_period_end: data.current_period_end
    };
  }

  async updateSubscriptionPlan(priceId: string): Promise<{
    success: boolean;
    message: string;
    new_plan: string;
    status: string;
    current_period_end?: string;
  }> {
    if (!priceId) {
      throw new Error('Plano invalido: priceId nao informado');
    }

    const {
      data: { session }
    } = await (this.supabase.client.auth as any).getSession();

    if (!session?.access_token) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    const { data, error } = await this.supabase.client.functions.invoke('manage-subscription', {
      body: { action: 'update', priceId },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao atualizar plano');
    }

    return {
      success: data.success,
      message: data.message,
      new_plan: data.new_plan,
      status: data.status,
      current_period_end: data.current_period_end
    };
  }

  async resumeSubscription(): Promise<{
    success: boolean;
    message: string;
    cancel_at_period_end: boolean;
    current_period_end?: string;
  }> {
    const {
      data: { session }
    } = await (this.supabase.client.auth as any).getSession();

    if (!session?.access_token) {
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    const { data, error } = await this.supabase.client.functions.invoke('manage-subscription', {
      body: { action: 'resume' },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      throw new Error(error.message || 'Erro ao manter assinatura');
    }

    return {
      success: data.success,
      message: data.message,
      cancel_at_period_end: data.cancel_at_period_end,
      current_period_end: data.current_period_end
    };
  }
}
