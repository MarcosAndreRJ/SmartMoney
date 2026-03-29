import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../core/services/admin.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { NavigationService } from '../../core/services/navigation.service';
import { BillingService } from '../../core/services/billing.service';
import { PLAN_PRICE_IDS, PlanCode } from '../../core/constants/plans.constants';
import { Plan, Subscription } from '../../core/models/admin.models';

interface PlanUI {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  action: 'downgrade' | 'upgrade' | 'current';
  features: string[];
  recommended?: boolean;
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'paid' | 'pending' | 'cancelled';
}

@Component({
  selector: 'app-subscription-page',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-8 max-w-5xl mx-auto space-y-8">
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      } @else {
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Sua Assinatura</h1>
          <p class="text-slate-500 mt-1">Gerencie seu plano e histórico de cobranças</p>
        </div>

        @if (userSubscription()) {
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="flex">
              <div class="w-1/2 bg-gradient-to-br from-emerald-400 to-emerald-500 p-8 flex flex-col justify-center items-center">
                <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                  <mat-icon class="text-5xl text-white">workspace_premium</mat-icon>
                </div>
                <span class="text-white/80 text-sm font-medium">Seu Plano</span>
              </div>
              <div class="w-1/2 p-8">
                <div class="flex items-center gap-3 mb-2">
                  <span class="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded uppercase tracking-wider">
                    Plano Atual
                  </span>
                  @if (userSubscription()?.status === 'active') {
                    <div class="flex items-center gap-1">
                      <mat-icon class="text-emerald-500 text-sm w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center">check_circle</mat-icon>
                      <span class="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Ativo</span>
                    </div>
                  }
                  @if (userSubscription()?.status === 'pending_cancellation') {
                    <div class="flex items-center gap-1">
                      <mat-icon class="text-amber-500 text-sm w-4 h-4 rounded-full bg-amber-50 flex items-center justify-center">schedule</mat-icon>
                      <span class="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Cancelamento Pendente</span>
                    </div>
                  }
                </div>
                <h2 class="text-3xl font-bold text-slate-900 mb-6">{{ currentPlanUI()?.name || 'SmartKonta PRO' }}</h2>
                
                <div class="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-slate-400">event</mat-icon>
                    <p class="text-slate-500 text-sm">
                      @if (userSubscription()?.status === 'pending_cancellation') {
                        Acesso premium até: <span class="font-bold text-slate-600">{{ userSubscription()?.end_date ? nextBillingDate() : '-' }}</span>
                      } @else if (userSubscription()?.status === 'active' || userSubscription()?.status === 'trial') {
                        Próxima cobrança: <span class="font-bold text-slate-600">{{ userSubscription()?.end_date ? nextBillingDate() : '-' }}</span>
                      } @else {
                        Cobrança: <span class="font-bold text-slate-600">Sem cobrança agendada</span>
                      }
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-slate-400">payments</mat-icon>
                    <p class="text-slate-500 text-sm">
                      Valor: <span class="font-bold text-slate-600">{{ currentPlanUI()?.price || 'Grátis' }}</span>
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-6 mt-8">
                  <button (click)="showInvoiceHistory.set(true)" class="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors border-none">
                    Histórico de Faturas
                  </button>
                  @if (userSubscription()?.status === 'active' || userSubscription()?.status === 'pending_cancellation') {
                    <button
                      (click)="showCancelModal.set(true)"
                      class="font-bold text-sm transition-colors bg-transparent border-none p-0 inline-flex items-center"
                      [class.text-red-500]="userSubscription()?.status !== 'pending_cancellation'"
                      [class.hover:text-red-600]="userSubscription()?.status !== 'pending_cancellation'"
                      [class.text-emerald-600]="userSubscription()?.status === 'pending_cancellation'"
                      [class.hover:text-emerald-700]="userSubscription()?.status === 'pending_cancellation'">
                      @if (userSubscription()?.status === 'pending_cancellation') {
                        Manter Assinatura
                      } @else {
                        Cancelar Assinatura
                      }
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        } @else {
          <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                <mat-icon class="text-3xl text-slate-400">workspace_premium</mat-icon>
              </div>
              <div class="flex-1">
                <h2 class="text-xl font-bold text-slate-900">Nenhum plano ativo</h2>
                <p class="text-slate-500 text-sm mt-1">Escolha um plano abaixo para começar</p>
              </div>
            </div>
          </div>
        }

        <div>
          <h3 class="text-lg font-bold text-slate-900 mb-4">Mudar de Plano</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            @for (plan of plansUI(); track plan.id) {
              <div 
                class="bg-white rounded-2xl p-6 transition-all relative"
                [class.border-2]="plan.recommended"
                [class.border-emerald-500]="plan.recommended"
                [class.shadow-lg]="plan.recommended"
                [class.shadow-emerald-100]="plan.recommended"
                [class.border]="!plan.recommended"
                [class.border-slate-200]="!plan.recommended"
              >
                @if (plan.recommended) {
                  <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-wider px-4 py-1 shadow-sm whitespace-nowrap">
                    Recomendado
                  </div>
                }
                <h4 class="text-xl font-bold text-slate-900 mt-2">{{ plan.name }}</h4>
                <p class="text-slate-500 text-sm mb-4">{{ getPlanSubtitle(plan.name) }}</p>
                <div class="mt-2">
                  <span class="text-3xl font-bold" 
                    [class.text-slate-900]="!plan.recommended"
                    [class.text-emerald-600]="plan.recommended">{{ plan.price }}</span>
                </div>
                <ul class="mt-6 space-y-3">
                  @for (feature of plan.features; track feature) {
                    <li class="flex items-center gap-2 text-sm" 
                      [class.text-slate-600]="!isLastFeature(plan.features, feature)"
                      [class.text-slate-400]="isLastFeature(plan.features, feature)">
                      <mat-icon class="text-lg" 
                        [class.text-emerald-500]="!isLastFeature(plan.features, feature)"
                        [class.text-slate-300]="isLastFeature(plan.features, feature)">
                        {{ isLastFeature(plan.features, feature) ? 'close' : 'check_circle' }}
                      </mat-icon>
                      <span [class.line-through]="isLastFeature(plan.features, feature)">
                        {{ feature }}
                      </span>
                    </li>
                  }
                </ul>
                <button 
                  (click)="plan.action === 'current' ? null : openChangePlanModal(plan)"
                  [disabled]="plan.action === 'current'"
                  class="w-full mt-6 py-3 rounded-xl font-bold text-sm transition-all border-none"
                  [class.bg-slate-100]="plan.name === 'Basic' || (plan.action === 'current' && plan.name === 'Basic')"
                  [class.text-slate-800]="plan.name === 'Basic' && plan.action !== 'current'"
                  [class.text-slate-400]="plan.action === 'current' && plan.name === 'Basic'"
                  [class.hover:bg-slate-200]="plan.name === 'Basic' && plan.action !== 'current'"
                  [class.bg-emerald-500]="plan.action === 'current' || plan.name === 'PRO'"
                  [class.text-white]="plan.action === 'current' || plan.name === 'PRO'"
                  [class.hover:bg-emerald-600]="plan.name === 'PRO'"
                  [class.bg-slate-900]="plan.name === 'Family'"
                  [class.text-white]="plan.name === 'Family'"
                  [class.hover:bg-slate-800]="plan.name === 'Family'"
                  [class.bg-yellow-500]="plan.name === 'Master'"
                  [class.text-slate-900]="plan.name === 'Master'"
                  [class.hover:bg-yellow-600]="plan.name === 'Master'"
                  [class.bg-orange-600]="plan.name === 'Ultra'"
                  [class.text-white]="plan.name === 'Ultra'"
                  [class.hover:bg-orange-700]="plan.name === 'Ultra'"
                  [class.cursor-not-allowed]="plan.action === 'current'"
                >
                  {{ getButtonLabel(plan.action, plan.name) }}
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>

    @if (showCancelModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showCancelModal.set(false)">
        <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl" (click)="$event.stopPropagation()">
          <div class="text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <mat-icon class="text-3xl text-red-500">warning</mat-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mt-4">
              @if (userSubscription()?.status === 'pending_cancellation') {
                Manter Assinatura Ativa?
              } @else {
                Cancelar Assinatura?
              }
            </h3>
            <p class="text-slate-500 mt-2">
              @if (userSubscription()?.status === 'pending_cancellation') {
                Seu plano {{ currentPlanUI()?.name }} está com cancelamento agendado.
                @if (userSubscription()?.end_date) {
                  Se você manter a assinatura, a cobrança continuará normalmente após {{ nextBillingDate() }}.
                }
              } @else {
                Você está prestes a cancelar seu plano {{ currentPlanUI()?.name }}.
                @if (userSubscription()?.end_date) {
                  Após o cancelamento, você perderá acesso aos recursos premium em {{ nextBillingDate() }}.
                }
              }
            </p>
          </div>
          <div class="flex gap-4 mt-8">
            <button (click)="showCancelModal.set(false)" class="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
              @if (userSubscription()?.status === 'pending_cancellation') {
                Agora não
              } @else {
                Manter Plano
              }
            </button>
            @if (userSubscription()?.status === 'pending_cancellation') {
              <button (click)="resumeSubscription()" class="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors">
                Manter Assinatura
              </button>
            } @else {
              <button (click)="cancelSubscription()" class="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors">
                Cancelar Agora
              </button>
            }
          </div>
        </div>
      </div>
    }

    @if (selectedPlan()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="selectedPlan.set(null)">
        <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl" (click)="$event.stopPropagation()">
          <div class="text-center">
            <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <mat-icon class="text-3xl text-emerald-500">swap_horiz</mat-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mt-4">Confirmar Mudança de Plano</h3>
            <p class="text-slate-500 mt-2">
              Você deseja mudar do plano <strong>{{ currentPlanUI()?.name }}</strong> para o plano <strong>{{ selectedPlan()?.name }}</strong>?
            </p>
            @if (selectedPlan()?.action === 'upgrade') {
              <p class="text-emerald-600 font-medium mt-2">Você será cobrado {{ selectedPlan()?.price }} a partir de agora.</p>
            }
          </div>
          <div class="flex gap-4 mt-8">
            <button (click)="selectedPlan.set(null)" class="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button (click)="confirmChangePlan()" class="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">
              Confirmar
            </button>
          </div>
        </div>
      </div>
    }

    @if (showInvoiceHistory()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showInvoiceHistory.set(false)">
        <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-xl" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-bold text-slate-900">Histórico de Faturas</h3>
            <button (click)="showInvoiceHistory.set(false)" class="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <mat-icon class="text-slate-500">close</mat-icon>
            </button>
          </div>
          <div class="space-y-3">
            @for (invoice of invoices; track invoice.id) {
              <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div class="flex items-center gap-4">
                  <mat-icon class="text-slate-400">receipt</mat-icon>
                  <div>
                    <p class="font-medium text-slate-900">{{ invoice.date }}</p>
                    <p class="text-sm text-slate-500">Fatura {{ invoice.id }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-slate-900">{{ invoice.amount }}</p>
                  <span class="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">Pago</span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class SubscriptionPageComponent implements OnInit {
  private adminService = inject(AdminService);
  private supabaseService = inject(SupabaseService);
  private navService = inject(NavigationService);
  private billingService = inject(BillingService);

  plans = signal<any[]>([]);
  userSubscription = signal<any>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  plansUI = computed(() => {
    const plansList = this.plans();
    const userSub = this.userSubscription();
    const userPlanId = userSub?.plan_id;
    const userPlanPrice = userSub?.plans?.price ? Number(userSub.plans.price) : 0;

    if (!plansList.length) return [];

    return plansList.map((plan, index) => {
      const planPrice = Number(plan.price) || 0;
      let action: 'current' | 'upgrade' | 'downgrade' = 'current';

      if (userPlanId === plan.id) {
        action = 'current';
      } else if (userPlanId) {
        action = planPrice > userPlanPrice ? 'upgrade' : 'downgrade';
      } else {
        action = planPrice > 0 ? 'upgrade' : 'current';
      }

      return {
        id: plan.id,
        name: plan.name,
        price: plan.price == 0 ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2)}/mês`,
        priceValue: planPrice,
        action,
        features: plan.features || [],
        recommended: index === 1
      };
    });
  });

  currentPlanUI = computed(() => {
    return this.plansUI().find(p => p.action === 'current');
  });

  nextBillingDate = computed(() => {
    const sub = this.userSubscription();
    if (sub?.end_date) {
      const date = new Date(sub.end_date);
      return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return 'Data não disponível';
  });

  invoices: Invoice[] = [
    { id: '001', date: '25/03/2026', amount: 'R$ 29,90', status: 'paid' },
    { id: '002', date: '25/02/2026', amount: 'R$ 29,90', status: 'paid' },
    { id: '003', date: '25/01/2026', amount: 'R$ 29,90', status: 'paid' },
    { id: '004', date: '25/12/2025', amount: 'R$ 29,90', status: 'paid' },
    { id: '005', date: '25/11/2025', amount: 'R$ 29,90', status: 'paid' }
  ];

  showCancelModal = signal(false);
  selectedPlan = signal<PlanUI | null>(null);
  showInvoiceHistory = signal(false);

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const user = await this.supabaseService.getUser();
      if (!user) {
        this.error.set('Usuário não autenticado');
        this.loading.set(false);
        return;
      }

      const plansData = await this.adminService.getPlans();
      this.plans.set(plansData.filter((p: any) => p.is_active));

      let subscriptionData = await this.adminService.getUserSubscription(user.id);

      const { data: activePlanData } = await this.supabaseService.client
        .from('active_user_plan')
        .select('active_plan,is_premium_active,is_pending_cancellation,premium_end_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (activePlanData?.is_premium_active) {
        const premiumPlan = plansData.find((p: any) => p.slug === activePlanData.active_plan);
        if (premiumPlan) {
          subscriptionData = {
            ...(subscriptionData || {}),
            user_id: user.id,
            plan_id: premiumPlan.id,
            plans: premiumPlan,
            plan_name: premiumPlan.name,
            plan_price: Number(premiumPlan.price || 0),
            status: activePlanData?.is_pending_cancellation ? 'pending_cancellation' : 'active',
            end_date: activePlanData?.premium_end_date || subscriptionData?.end_date,
            payment_gateway: 'stripe'
          } as any;
        }
      }
      
      if (!subscriptionData) {
        const { data: stripeSub } = await this.supabaseService.client
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (stripeSub) {
          const planData = plansData.find((p: any) => p.slug === stripeSub.plan_code);
          subscriptionData = {
            id: stripeSub.id,
            user_id: stripeSub.user_id,
            plan_id: planData?.id || '',
            plan_name: planData?.name,
            plan_price: Number(planData?.price || 0),
            status: stripeSub.status === 'active' ? 'active' : 
                   stripeSub.status === 'trialing' ? 'trial' :
                   stripeSub.status === 'canceled' ? 'cancelled' : 'expired',
            start_date: stripeSub.current_period_start || new Date().toISOString(),
            end_date: stripeSub.current_period_end || new Date().toISOString(),
            payment_gateway: 'stripe',
            gateway_subscription_id: stripeSub.stripe_subscription_id,
            created_at: stripeSub.created_at,
            resources: planData?.resources,
            restrictions: planData?.restrictions,
            plans: planData
          } as any;

          if (
            stripeSub.cancel_at_period_end === true &&
            (stripeSub.status === 'active' || stripeSub.status === 'trialing')
          ) {
            (subscriptionData as any).status = 'pending_cancellation';
          }
        }
      }
      
      if (subscriptionData) {
        this.userSubscription.set(subscriptionData);
      } else {
        const basicPlan = plansData.find((p: any) => p.slug === 'basic');
        if (basicPlan) {
          this.userSubscription.set({
            plan_id: basicPlan.id,
            plans: basicPlan,
            status: 'none'
          });
        }
      }
    } catch (err: any) {
      console.error('Error loading subscription data:', err);
      this.error.set(err.message || 'Erro ao carregar dados');
    } finally {
      this.loading.set(false);
    }
  }

  getStatusLabel(): string {
    const sub = this.userSubscription();
    if (!sub) return 'Sem plano';
    
    switch (sub.status) {
      case 'active': return 'Plano Atual · Ativo';
      case 'trial': return 'Período Trial';
      case 'cancelled': return 'Cancelado';
      case 'expired': return 'Expirado';
      default: return 'Plano Atual';
    }
  }

  getPlanSubtitle(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('basic') || lower.includes('grátis')) {
      return 'Para quem está começando';
    }
    if (lower.includes('pro')) {
      return 'Controle total e automação';
    }
    if (lower.includes('master')) {
      return 'Recursos avançados para profissionais';
    }
    if (lower.includes('ultra')) {
      return 'O plano individual definitivo';
    }
    return 'Gestão para toda a família';
  }

  isLastFeature(features: string[], feature: string): boolean {
    return features.indexOf(feature) === features.length - 1;
  }

  getButtonLabel(action: string, planName?: string): string {
    if (action === 'current') return 'Plano Atual';
    if (action === 'downgrade') return 'Fazer Downgrade';
    return planName ? `Mudar para ${planName}` : 'Upgrade';
  }

  openChangePlanModal(plan: PlanUI) {
    this.selectedPlan.set(plan);
  }

  async cancelSubscription() {
    const sub = this.userSubscription();
    if (!sub?.id) return;

    try {
      const result = await this.billingService.cancelSubscription(true);
      this.showCancelModal.set(false);

      const endDate = result.current_period_end
        ? new Date(result.current_period_end).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
        : undefined;

      this.navService.subscriptionStatusContext.set({
        action: 'cancel',
        status: 'success',
        title: 'Cancelamento agendado com sucesso',
        message: endDate
          ? `Seu acesso premium continua até ${endDate}. Depois disso, sua conta passa para o plano Basic automaticamente.`
          : 'Seu cancelamento foi registrado e será aplicado no fim do período vigente.',
        planName: this.currentPlanUI()?.name,
        endDate
      });

      this.navService.navigateTo('subscription-status');
      await this.loadData();
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      this.showCancelModal.set(false);
      this.navService.subscriptionStatusContext.set({
        action: 'cancel',
        status: 'error',
        title: 'Não foi possível cancelar agora',
        message: err instanceof Error ? err.message : 'Erro ao cancelar assinatura',
        planName: this.currentPlanUI()?.name
      });
      this.navService.navigateTo('subscription-status');
    }
  }

  async resumeSubscription() {
    try {
      const result = await this.billingService.resumeSubscription();
      this.showCancelModal.set(false);

      const endDate = result.current_period_end
        ? new Date(result.current_period_end).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
        : undefined;

      this.navService.subscriptionStatusContext.set({
        action: 'resume',
        status: 'success',
        title: 'Assinatura mantida com sucesso',
        message: endDate
          ? `Sua assinatura continua ativa e sua próxima cobrança permanece prevista para ${endDate}.`
          : 'Sua assinatura continua ativa normalmente.',
        planName: this.currentPlanUI()?.name,
        endDate
      });

      this.navService.navigateTo('subscription-status');
      await this.loadData();
    } catch (err) {
      console.error('Error resuming subscription:', err);
      this.showCancelModal.set(false);
      this.navService.subscriptionStatusContext.set({
        action: 'resume',
        status: 'error',
        title: 'Não foi possível manter a assinatura',
        message: err instanceof Error ? err.message : 'Erro ao manter assinatura',
        planName: this.currentPlanUI()?.name
      });
      this.navService.navigateTo('subscription-status');
    }
  }

  async confirmChangePlan() {
    const selected = this.selectedPlan();
    if (!selected) return;

    const isUpgrade = selected.action === 'upgrade';

    if (isUpgrade) {
      this.navService.selectedPlanId.set(selected.id);
      this.navService.navigateTo('subscription-checkout');
      this.selectedPlan.set(null);
      return;
    }

    try {
      const planSlug = String(selected.name || '').toLowerCase();
      let priceId = '';
      
      if (planSlug.includes('pro')) {
        priceId = PLAN_PRICE_IDS[PlanCode.PRO];
      } else if (planSlug.includes('master')) {
        priceId = PLAN_PRICE_IDS[PlanCode.MASTER];
      } else if (planSlug.includes('family')) {
        priceId = PLAN_PRICE_IDS[PlanCode.FAMILY];
      } else if (planSlug.includes('basic')) {
        priceId = '';
      }

      if (!priceId && !planSlug.includes('basic')) {
        throw new Error('Plano não encontrado para downgrade');
      }

      const result = await this.billingService.updateSubscriptionPlan(priceId);
      
      this.selectedPlan.set(null);
      
      if (result.current_period_end) {
        const endDate = new Date(result.current_period_end).toLocaleDateString('pt-BR', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        alert(`Downgrade agendado!\n\nVocê continuará com o plano atual até ${endDate}.\nA partir dessa data, você terá o plano ${selected.name}.`);
      } else {
        alert(`Plano alterado para ${selected.name} com sucesso!`);
      }
      
      await this.loadData();
    } catch (err) {
      console.error('Error changing plan:', err);
      alert(err instanceof Error ? err.message : 'Erro ao alterar plano');
    }
  }
}
