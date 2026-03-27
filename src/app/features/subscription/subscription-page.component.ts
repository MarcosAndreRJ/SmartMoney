import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../core/services/admin.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { NavigationService } from '../../core/services/navigation.service';
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
                <div class="flex items-center gap-2 mb-2">
                  <span class="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
                    {{ getStatusLabel() }}
                  </span>
                </div>
                <h2 class="text-2xl font-bold text-slate-900">{{ currentPlanUI()?.name || 'Plano' }}</h2>
                <p class="text-slate-500 mt-2">
                  @if (userSubscription()?.end_date) {
                    Próxima cobrança: {{ nextBillingDate() }}
                  }
                </p>
                <p class="text-2xl font-bold text-slate-900 mt-2">
                  {{ currentPlanUI()?.price || 'Grátis' }}
                </p>
                <div class="flex gap-3 mt-6">
                  <button (click)="showInvoiceHistory.set(true)" class="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <mat-icon class="text-lg">receipt_long</mat-icon>
                    <span class="text-sm font-medium">Histórico de Faturas</span>
                  </button>
                  @if (userSubscription()?.status === 'active') {
                    <button (click)="showCancelModal.set(true)" class="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors">
                      <mat-icon class="text-lg">cancel</mat-icon>
                      <span class="text-sm font-medium">Cancelar Assinatura</span>
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
                  <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span class="px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">Recomendado</span>
                  </div>
                }
                <h4 class="text-xl font-bold text-slate-900 mt-2">{{ plan.name }}</h4>
                <div class="mt-4">
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
                  class="w-full mt-6 py-3 rounded-xl font-bold text-sm transition-all"
                  [class.bg-emerald-500]="plan.action === 'current'"
                  [class.text-white]="plan.action === 'current'"
                  [class.cursor-not-allowed]="plan.action === 'current'"
                  [class.bg-emerald-500]="plan.action === 'upgrade'"
                  [class.text-white]="plan.action === 'upgrade'"
                  [class.hover:bg-emerald-600]="plan.action === 'upgrade'"
                  [class.border]="plan.action === 'downgrade'"
                  [class.border-slate-300]="plan.action === 'downgrade'"
                  [class.text-slate-700]="plan.action === 'downgrade'"
                  [class.bg-slate-900]="plan.action === 'downgrade'"
                  [class.text-white]="plan.action === 'downgrade'"
                  [class.hover:bg-slate-800]="plan.action === 'downgrade'"
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
            <h3 class="text-xl font-bold text-slate-900 mt-4">Cancelar Assinatura?</h3>
            <p class="text-slate-500 mt-2">
              Você está prestes a cancelar seu plano {{ currentPlanUI()?.name }}.
              @if (userSubscription()?.end_date) {
                Após o cancelamento, você perderá acesso aos recursos premium em {{ nextBillingDate() }}.
              }
            </p>
          </div>
          <div class="flex gap-4 mt-8">
            <button (click)="showCancelModal.set(false)" class="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
              Manter Plano
            </button>
            <button (click)="cancelSubscription()" class="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors">
              Cancelar Agora
            </button>
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

      const [plansData, subscriptionData] = await Promise.all([
        this.adminService.getPlans(),
        this.adminService.getUserSubscription(user.id)
      ]);

      this.plans.set(plansData.filter((p: any) => p.is_active));
      
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

  isLastFeature(features: string[], feature: string): boolean {
    return features.indexOf(feature) === features.length - 1;
  }

  getButtonLabel(action: string, planName?: string): string {
    switch (action) {
      case 'current': return 'Plano Atual';
      case 'upgrade': return 'Upgrade';
      case 'downgrade': return 'Mudar para ' + planName;
      default: return 'Selecionar';
    }
  }

  openChangePlanModal(plan: PlanUI) {
    this.selectedPlan.set(plan);
  }

  async cancelSubscription() {
    const sub = this.userSubscription();
    if (!sub?.id) return;

    try {
      await this.adminService.cancelSubscription(sub.id);
      this.userSubscription.update(s => ({ ...s, status: 'cancelled' }));
      this.showCancelModal.set(false);
      alert('Assinatura cancelada. Você terá acesso até ' + this.nextBillingDate());
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      alert('Erro ao cancelar assinatura');
    }
  }

  async confirmChangePlan() {
    const selected = this.selectedPlan();
    if (!selected) return;

    this.navService.selectedPlanId.set(selected.id);
    this.navService.navigateTo('subscription-checkout');
    this.selectedPlan.set(null);
  }
}