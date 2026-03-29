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
  slug: string;
  price: string;
  priceValue: number;
  action: 'current' | 'upgrade' | 'downgrade';
  features: string[];
  recommended: boolean;
  badge: string;
  highlight: 'recommended' | 'popular' | 'premium' | null;
  planColor: string;
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
    <div class="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      @if (loading()) {
        <div class="flex items-center justify-center py-20">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
        </div>
      } @else {

        <div class="text-center max-w-2xl mx-auto">
          <h1 class="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Escolha seu plano
          </h1>
          <p class="text-slate-500 mt-3 text-lg">
            Todos os planos incluem trial de 7 dias. Cancele quando quiser.
          </p>
        </div>

        @if (userSubscription() && userSubscription()?.status !== 'none' && userSubscription()?.status !== 'cancelled' && userSubscription()?.status !== 'expired') {
          <div class="bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm">
            <div class="grid md:grid-cols-2 gap-6 p-6 md:p-8">
              <div class="flex items-center gap-5">
                <div class="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <mat-icon class="text-3xl text-white">workspace_premium</mat-icon>
                </div>
                <div>
                  <p class="text-xs text-slate-500 uppercase tracking-wider font-semibold">Plano atual</p>
                  <h2 class="text-xl font-bold text-slate-900">{{ currentPlanUI()?.name }}</h2>
                  @if (userSubscription()?.status === 'active') {
                    <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                      <mat-icon class="text-sm leading-none">check_circle</mat-icon>
                      Assinatura Ativa
                    </span>
                  }
                  @if (userSubscription()?.status === 'pending_cancellation') {
                    <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold">
                      <mat-icon class="text-sm leading-none">schedule</mat-icon>
                      Cancelamento Agendado
                    </span>
                  }
                </div>
              </div>
              <div class="flex flex-col justify-center">
                <div class="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p class="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                      {{ userSubscription()?.status === 'pending_cancellation' ? 'Acesso até' : 'Próxima cobrança' }}
                    </p>
                    <p class="font-bold text-slate-900 text-lg">{{ nextBillingDate() }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Valor mensal</p>
                    <p class="font-bold text-slate-900 text-lg">{{ currentPlanUI()?.price }}</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <button (click)="showInvoiceHistory.set(true)"
                    class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors border-none">
                    Histórico
                  </button>
                  @if (userSubscription()?.status === 'active') {
                    <button (click)="showCancelModal.set(true)"
                      class="px-4 py-2 text-red-500 hover:text-red-600 font-semibold text-sm transition-colors bg-transparent border-none">
                      Cancelar
                    </button>
                  }
                  @if (userSubscription()?.status === 'pending_cancellation') {
                    <button (click)="showCancelModal.set(true)"
                      class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors border-none">
                      Manter Assinatura
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          @for (plan of plansUI(); track plan.id) {
            <div
              class="relative flex flex-col rounded-2xl border transition-all duration-300 overflow-hidden h-full"
              [class]="getCardClasses(plan)"
            >
              <div class="p-6 flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center" [class]="getIconBgClass(plan.name)">
                      <mat-icon [class]="getIconClass(plan.name)">{{ getPlanIcon(plan.name) }}</mat-icon>
                    </div>
                    <div>
                      <h3 class="text-lg font-bold text-slate-900">{{ plan.name }}</h3>
                      @if (plan.action === 'current') {
                        <span class="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Plano atual</span>
                      }
                    </div>
                  </div>
                  @if (plan.badge) {
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm whitespace-nowrap" [class]="getBadgeClasses(plan.highlight)">
                      <mat-icon class="text-sm leading-none">star</mat-icon>
                      {{ plan.badge }}
                    </span>
                  }
                </div>

                <div class="mb-5">
                  <div class="flex items-end gap-1">
                    <span class="text-3xl font-black" [class]="plan.highlight ? 'text-emerald-600' : 'text-slate-900'">
                      {{ plan.price }}
                    </span>
                    @if (plan.priceValue > 0) {
                      <span class="text-slate-400 text-sm mb-1">/mês</span>
                    }
                  </div>
                  @if (plan.priceValue === 0) {
                    <p class="text-slate-500 text-sm mt-1">Para sempre</p>
                  }
                </div>

                <ul class="space-y-3 flex-1 mb-6">
                  @for (feature of getDisplayFeatures(plan); track feature.text) {
                    <li class="flex items-start gap-2.5">
                      <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                           [class.bg-emerald-100]="feature.included"
                           [class.text-emerald-600]="feature.included"
                           [class.bg-slate-100]="!feature.included"
                           [class.text-slate-400]="!feature.included">
                        <mat-icon class="text-base leading-none">
                          {{ feature.included ? 'check' : 'close' }}
                        </mat-icon>
                      </div>
                      <span [class.text-slate-700]="feature.included"
                            [class.text-slate-400]="!feature.included"
                            [class.line-through]="!feature.included"
                            class="text-sm leading-snug">
                        {{ feature.text }}
                      </span>
                    </li>
                  }
                </ul>

                <button
                  (click)="plan.action === 'current' ? null : openChangePlanModal(plan)"
                  [disabled]="plan.action === 'current'"
                  class="w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 border-none focus:outline-none focus:ring-2 focus:ring-offset-2"
                  [class]="getButtonClasses(plan)">
                  <span class="flex items-center justify-center gap-2">
                    @if (plan.action === 'current') {
                      <mat-icon class="text-base leading-none">check_circle</mat-icon>
                      Plano Atual
                    } @else if (plan.action === 'upgrade') {
                      <mat-icon class="text-base leading-none">arrow_upward</mat-icon>
                      Fazer Upgrade
                    } @else {
                      <mat-icon class="text-base leading-none">arrow_downward</mat-icon>
                      Fazer Downgrade
                    }
                  </span>
                </button>
              </div>
            </div>
          }
        </div>

      }
    </div>

    @if (showCancelModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="showCancelModal.set(false)">
        <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" (click)="$event.stopPropagation()">
          <div class="text-center">
            <div class="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto" [class.bg-emerald-100]="userSubscription()?.status === 'pending_cancellation'" [class.text-red-500]="userSubscription()?.status !== 'pending_cancellation'" [class.text-emerald-500]="userSubscription()?.status === 'pending_cancellation'" [class.bg-red-100]="userSubscription()?.status !== 'pending_cancellation'">
              <mat-icon class="text-3xl">{{ userSubscription()?.status === 'pending_cancellation' ? 'restart_alt' : 'warning' }}</mat-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mt-4">
              {{ userSubscription()?.status === 'pending_cancellation' ? 'Manter Assinatura Ativa?' : 'Cancelar Assinatura?' }}
            </h3>
            <p class="text-slate-500 mt-2 leading-relaxed">
              @if (userSubscription()?.status === 'pending_cancellation') {
                Seu plano <strong>{{ currentPlanUI()?.name }}</strong> está com cancelamento agendado.
                @if (userSubscription()?.end_date) {
                  Ao manter, a cobrança continua normalmente após <strong>{{ nextBillingDate() }}</strong>.
                }
              } @else {
                Você está cancelando <strong>{{ currentPlanUI()?.name }}</strong>.
                @if (userSubscription()?.end_date) {
                  Terá acesso até <strong>{{ nextBillingDate() }}</strong>, depois volta para Basic.
                }
              }
            </p>
          </div>
          <div class="flex gap-3 mt-8">
            <button (click)="showCancelModal.set(false)"
              class="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
              {{ userSubscription()?.status === 'pending_cancellation' ? 'Agora não' : 'Manter Plano' }}
            </button>
            @if (userSubscription()?.status === 'pending_cancellation') {
              <button (click)="resumeSubscription()"
                class="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors">
                Manter Assinatura
              </button>
            } @else {
              <button (click)="cancelSubscription()"
                class="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors">
                Cancelar Agora
              </button>
            }
          </div>
        </div>
      </div>
    }

    @if (selectedPlan()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="selectedPlan.set(null)">
        <div class="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" (click)="$event.stopPropagation()">
          <div class="text-center">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                 [class.bg-emerald-100]="selectedPlan()?.action === 'upgrade'"
                 [class.text-emerald-500]="selectedPlan()?.action === 'upgrade'"
                 [class.bg-slate-100]="selectedPlan()?.action === 'downgrade'"
                 [class.text-slate-500]="selectedPlan()?.action === 'downgrade'">
              <mat-icon class="text-3xl">{{ selectedPlan()?.action === 'upgrade' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mt-4">Confirmar Mudança de Plano</h3>
            <p class="text-slate-500 mt-2">
              De <strong>{{ currentPlanUI()?.name }}</strong> para
              <strong>{{ selectedPlan()?.name }}</strong>
            </p>
            @if (selectedPlan()?.action === 'upgrade') {
              <div class="mt-4 p-4 bg-emerald-50 rounded-xl">
                <p class="text-emerald-700 font-semibold text-sm">
                  Você será cobrado {{ selectedPlan()?.price }}/mês a partir de agora.
                </p>
              </div>
            } @else {
              <div class="mt-4 p-4 bg-slate-50 rounded-xl">
                <p class="text-slate-600 text-sm">
                  A mudança entra em vigor ao final do período atual. Sem cobrança adicional.
                </p>
              </div>
            }
          </div>
          <div class="flex gap-3 mt-8">
            <button (click)="selectedPlan.set(null)"
              class="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button (click)="confirmChangePlan()"
              class="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors"
              [disabled]="isProcessing()">
              @if (isProcessing()) {
                <span class="flex items-center justify-center gap-2">
                  <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processando...
                </span>
              } @else {
                Confirmar
              }
            </button>
          </div>
        </div>
      </div>
    }

    @if (showInvoiceHistory()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="showInvoiceHistory.set(false)">
        <div class="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl" (click)="$event.stopPropagation()">
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
                  <div class="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center">
                    <mat-icon class="text-slate-500 text-lg">receipt_long</mat-icon>
                  </div>
                  <div>
                    <p class="font-semibold text-slate-900">{{ invoice.date }}</p>
                    <p class="text-sm text-slate-500">Fatura #{{ invoice.id }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-bold text-slate-900">{{ invoice.amount }}</p>
                  <span class="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-semibold">
                    <mat-icon class="text-base leading-none">check</mat-icon>
                    Pago
                  </span>
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
  isProcessing = signal(false);

  plansUI = computed(() => {
    const plansList = this.plans();
    const userSub = this.userSubscription();
    const userPlanId = userSub?.plan_id;
    const userPlanPrice = userSub?.plan_price ?? userSub?.plans?.price ? Number(userSub.plan_price || userSub.plans?.price) : 0;
    const userPlanSlug = userSub?.plans?.slug?.toLowerCase() || '';

    if (!plansList.length) return [];

    const orderedPlans = [...plansList].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    const userPlanIndex = orderedPlans.findIndex(p => p.slug?.toLowerCase() === userPlanSlug || p.id === userPlanId);
    const userPrice = userPlanIndex >= 0 ? Number(orderedPlans[userPlanIndex].price || 0) : 0;

    const planOrder = ['basic', 'pro', 'master', 'family'];
    const slugToHighlight: Record<string, string> = {
      '': 'pro',
      'basic': 'pro',
      'pro': 'master',
      'master': 'family',
      'family': ''
    };

    const highlightSlug = userPlanSlug in slugToHighlight ? slugToHighlight[userPlanSlug] : 'pro';

    return orderedPlans.map((plan) => {
      const planPrice = Number(plan.price) || 0;
      const planSlug = String(plan.slug || plan.name || '').toLowerCase();
      let action: 'current' | 'upgrade' | 'downgrade' = 'current';

      if (plan.id === userPlanId || planSlug === userPlanSlug) {
        action = 'current';
      } else if (userPlanId) {
        action = planPrice > userPrice ? 'upgrade' : 'downgrade';
      } else {
        action = planPrice > 0 ? 'upgrade' : 'current';
      }

      let recommended = false;
      let badge = '';
      let highlight: 'recommended' | 'popular' | 'premium' | null = null;
      let planColor = 'slate';

      if (planSlug === highlightSlug && action !== 'current') {
        recommended = true;
        badge = userPlanId ? 'Melhor escolha' : 'Recomendado';
        highlight = planSlug === 'family' || planSlug === 'master' ? 'premium' : 'recommended';
      }

      if (planSlug === 'pro' && !userPlanId) {
        recommended = true;
        badge = 'Recomendado';
        highlight = 'recommended';
      }

      if (planSlug === 'family') {
        planColor = 'family';
      } else if (planSlug === 'master') {
        planColor = 'master';
      }

      return {
        id: plan.id,
        name: plan.name,
        slug: planSlug,
        price: plan.price == 0 ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2).replace('.', ',')}`,
        priceValue: planPrice,
        action,
        features: plan.features || [],
        recommended,
        badge,
        highlight,
        planColor
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
    return 'Não definida';
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

  private readonly PLAN_FEATURES: Record<string, { text: string; included: boolean }[]> = {
    'basic': [
      { text: 'Até 2 contas bancárias', included: true },
      { text: '1 cartão de crédito', included: true },
      { text: 'Categorização básica', included: true },
      { text: 'Metas financeiras', included: false },
      { text: 'Transferências', included: false },
      { text: 'Empréstimos', included: false },
      { text: 'Contas compartilhadas', included: false },
      { text: 'Investimentos', included: false }
    ],
    'pro': [
      { text: 'Até 5 contas bancárias', included: true },
      { text: '3 cartões de crédito', included: true },
      { text: 'Categorização inteligente', included: true },
      { text: 'Metas financeiras', included: true },
      { text: 'Transferências ilimitadas', included: true },
      { text: 'Empréstimos', included: false },
      { text: 'Contas compartilhadas', included: false },
      { text: 'Investimentos', included: false }
    ],
    'master': [
      { text: 'Contas ilimitadas', included: true },
      { text: 'Cartões ilimitados', included: true },
      { text: 'Categorização inteligente', included: true },
      { text: 'Metas financeiras', included: true },
      { text: 'Transferências ilimitadas', included: true },
      { text: 'Gestão de empréstimos', included: true },
      { text: 'Contas compartilhadas', included: false },
      { text: 'Investimentos', included: false }
    ],
    'family': [
      { text: 'Contas ilimitadas', included: true },
      { text: 'Cartões ilimitados', included: true },
      { text: 'Categorização inteligente', included: true },
      { text: 'Metas familiares', included: true },
      { text: 'Transferências ilimitadas', included: true },
      { text: 'Gestão de empréstimos', included: true },
      { text: 'Contas compartilhadas', included: true },
      { text: 'Acompanhamento investimentos', included: true }
    ]
  };

  getDisplayFeatures(plan: PlanUI): { text: string; included: boolean }[] {
    const slug = plan.slug || plan.name?.toLowerCase() || '';
    const features = this.PLAN_FEATURES[slug];
    if (features) return features;

    return plan.features.map(f => ({ text: f, included: true }));
  }

  getCardClasses(plan: PlanUI): string {
    const base = 'bg-white';
    if (plan.highlight === 'recommended') {
      return `${base} border-2 border-emerald-500 shadow-xl shadow-emerald-100 scale-[1.02]`;
    }
    if (plan.highlight === 'premium') {
      return `${base} border-2 border-violet-500 shadow-xl shadow-violet-100 scale-[1.02]`;
    }
    if (plan.action === 'current') {
      return `${base} border-2 border-slate-300 ring-2 ring-slate-100`;
    }
    return `${base} border border-slate-200 hover:border-slate-300 hover:shadow-md`;
  }

  getBadgeClasses(highlight: string | null): string {
    if (highlight === 'premium') {
      return 'bg-gradient-to-r from-violet-600 to-purple-600 text-white';
    }
    return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white';
  }

  getBadgeGradient(highlight: string | null): string {
    if (highlight === 'premium') {
      return 'bg-gradient-to-r from-violet-600 to-purple-600';
    }
    return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
  }

  getIconBgClass(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('family')) return 'bg-violet-100';
    if (lower.includes('master')) return 'bg-amber-100';
    if (lower.includes('pro')) return 'bg-emerald-100';
    return 'bg-slate-100';
  }

  getIconClass(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('family')) return 'text-violet-600';
    if (lower.includes('master')) return 'text-amber-600';
    if (lower.includes('pro')) return 'text-emerald-600';
    return 'text-slate-500';
  }

  getPlanIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('family')) return 'group';
    if (lower.includes('master')) return 'workspace_premium';
    if (lower.includes('pro')) return 'bolt';
    return 'person';
  }

  getButtonClasses(plan: PlanUI): string {
    if (plan.action === 'current') {
      return 'bg-slate-100 text-slate-500 cursor-not-allowed opacity-80';
    }

    if (plan.action === 'upgrade') {
      const lower = plan.name.toLowerCase();
      if (lower.includes('family')) {
        return 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 focus:ring-violet-500';
      }
      if (lower.includes('master')) {
        return 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-200 focus:ring-amber-500';
      }
      return 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200 focus:ring-emerald-500';
    }

    return 'bg-slate-100 hover:bg-slate-200 text-slate-600 focus:ring-slate-400';
  }

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

  openChangePlanModal(plan: PlanUI) {
    this.selectedPlan.set(plan);
  }

  async cancelSubscription() {
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

    this.isProcessing.set(true);
    const isUpgrade = selected.action === 'upgrade';

    if (isUpgrade) {
      this.navService.selectedPlanId.set(selected.id);
      this.navService.navigateTo('subscription-checkout');
      this.selectedPlan.set(null);
      this.isProcessing.set(false);
      return;
    }

    try {
      const planSlug = String(selected.slug || selected.name || '').toLowerCase();
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

      const endDate = result.current_period_end
        ? new Date(result.current_period_end).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
        : undefined;

      this.navService.subscriptionStatusContext.set({
        action: 'cancel',
        status: 'success',
        title: 'Plano alterado com sucesso',
        message: endDate
          ? `Você continuará com o plano atual até ${endDate}. A partir dessa data, terá o plano ${selected.name}.`
          : `Plano alterado para ${selected.name}.`,
        planName: selected.name,
        endDate
      });

      this.navService.navigateTo('subscription-status');
      await this.loadData();
    } catch (err) {
      console.error('Error changing plan:', err);
      this.selectedPlan.set(null);
      this.navService.subscriptionStatusContext.set({
        action: 'cancel',
        status: 'error',
        title: 'Não foi possível alterar o plano',
        message: err instanceof Error ? err.message : 'Erro ao alterar plano',
        planName: this.currentPlanUI()?.name
      });
      this.navService.navigateTo('subscription-status');
    } finally {
      this.isProcessing.set(false);
    }
  }
}
