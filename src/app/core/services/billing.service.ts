import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { PlanCode } from '../constants/plans.constants';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private supabase = inject(SupabaseService);

  async getCurrentPlan(): Promise<PlanCode> {
    const user = await this.supabase.getUser();
    if (!user) return PlanCode.BASIC;

    const { data, error } = await this.supabase.client
      .from('active_user_plan')
      .select('active_plan,is_premium_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data || !data.is_premium_active) {
      return PlanCode.BASIC;
    }

    const activePlan = String(data.active_plan || '').toLowerCase();
    if (activePlan === PlanCode.PRO) return PlanCode.PRO;
    if (activePlan === PlanCode.MASTER) return PlanCode.MASTER;
    if (activePlan === PlanCode.FAMILY) return PlanCode.FAMILY;
    return PlanCode.BASIC;
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
}
