import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface Plan {
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
      <div>
        <h1 class="text-3xl font-bold text-slate-900">Sua Assinatura</h1>
        <p class="text-slate-500 mt-1">Gerencie seu plano e看到了 histórico de cobranças</p>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div class="flex items-center gap-6">
          <div class="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <mat-icon class="text-3xl text-emerald-600">workspace_premium</mat-icon>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">Plano Atual · Ativo</span>
            </div>
            <h2 class="text-xl font-bold text-slate-900">{{ currentPlan().name }}</h2>
            <p class="text-slate-500 text-sm mt-1">Próxima cobrança: {{ nextBillingDate }} · {{ currentPlan().price }}</p>
          </div>
        </div>
        <div class="flex gap-4 mt-6 pt-6 border-t border-slate-100">
          <button (click)="showInvoiceHistory.set(true)" class="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors">
            <mat-icon class="text-lg">receipt_long</mat-icon>
            <span class="text-sm font-medium">Histórico de Faturas</span>
          </button>
          <button (click)="showCancelModal.set(true)" class="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors ml-auto">
            <mat-icon class="text-lg">cancel</mat-icon>
            <span class="text-sm font-medium">Cancelar Assinatura</span>
          </button>
        </div>
      </div>

      <div>
        <h3 class="text-lg font-bold text-slate-900 mb-4">Compare os Planos</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          @for (plan of plans; track plan.id) {
            <div 
              class="bg-white rounded-2xl p-6 transition-all"
              [class.border-2]="plan.recommended"
              [class.border-emerald-500]="plan.recommended"
              [class.shadow-lg]="plan.recommended"
              [class.shadow-emerald-100]="plan.recommended"
              [class.border]="!plan.recommended"
              [class.border-slate-100]="!plan.recommended"
            >
              @if (plan.recommended) {
                <span class="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">Recomendado</span>
              }
              <h4 class="text-xl font-bold text-slate-900 mt-3">{{ plan.name }}</h4>
              <div class="mt-4">
                <span class="text-3xl font-bold text-slate-900">{{ plan.price }}</span>
              </div>
              <ul class="mt-6 space-y-3">
                @for (feature of plan.features; track feature) {
                  <li class="flex items-center gap-2 text-sm text-slate-600">
                    <mat-icon class="text-emerald-500 text-lg">check_circle</mat-icon>
                    {{ feature }}
                  </li>
                }
              </ul>
              <button 
                (click)="plan.action === 'current' ? null : openChangePlanModal(plan)"
                [disabled]="plan.action === 'current'"
                class="w-full mt-6 py-3 rounded-xl font-bold text-sm transition-all"
                [class.bg-slate-100]="plan.action === 'current'"
                [class.text-slate-400]="plan.action === 'current'"
                [class.cursor-not-allowed]="plan.action === 'current'"
                [class.bg-emerald-500]="plan.action === 'upgrade'"
                [class.text-white]="plan.action === 'upgrade'"
                [class.hover:bg-emerald-600]="plan.action === 'upgrade'"
                [class.bg-slate-900]="plan.action === 'downgrade'"
                [class.text-white]="plan.action === 'downgrade'"
                [class.hover:bg-slate-800]="plan.action === 'downgrade'"
              >
                {{ plan.action === 'current' ? 'Plano Atual' : (plan.action === 'upgrade' ? 'Upgrade' : 'Downgrade') }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>

    @if (showCancelModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showCancelModal.set(false)">
        <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl" (click)="$event.stopPropagation()">
          <div class="text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <mat-icon class="text-3xl text-red-500">warning</mat-icon>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mt-4">Cancelar Assinatura?</h3>
            <p class="text-slate-500 mt-2">Você está prestes a cancelar seu plano Pro. Após o cancelamento, você perderá acesso aos recursos premium em {{ nextBillingDate }}.</p>
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
              Você deseja mudar do plano <strong>{{ currentPlan().name }}</strong> para o plano <strong>{{ selectedPlan()?.name }}</strong>?
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
export class SubscriptionPageComponent {
  currentPlan = signal<Plan>({
    id: 'pro',
    name: 'Plano Pro',
    price: 'R$ 29,90/mês',
    priceValue: 29.90,
    action: 'current',
    features: [
      'Todas as funcionalidades',
      'Contas ilimitadas',
      'Metas e investimentos',
      'Exportação de dados',
      'Suporte prioritário'
    ],
    recommended: true
  });

  plans: Plan[] = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'Grátis',
      priceValue: 0,
      action: 'downgrade',
      features: [
        'até 3 contas',
        'Transações básicas',
        'Categorias simples',
        'Relatórios mensais'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 29,90/mês',
      priceValue: 29.90,
      action: 'current',
      features: [
        'Contas ilimitadas',
        'Todas as funcionalidades',
        'Metas e investimentos',
        'Exportação de dados',
        'Suporte prioritário'
      ],
      recommended: true
    },
    {
      id: 'family',
      name: 'Family',
      price: 'R$ 49,90/mês',
      priceValue: 49.90,
      action: 'upgrade',
      features: [
        'Tudo do Pro',
        'até 5 membros',
        'Contas compartilhadas',
        'Planejamento familiar',
        'Relatórios avançados'
      ]
    }
  ];

  invoices: Invoice[] = [
    { id: '001', date: '25/03/2026', amount: 'R$ 29,90', status: 'paid' },
    { id: '002', date: '25/02/2026', amount: 'R$ 29,90', status: 'paid' },
    { id: '003', date: '25/01/2026', amount: 'R$ 29,90', status: 'paid' },
    { id: '004', date: '25/12/2025', amount: 'R$ 29,90', status: 'paid' },
    { id: '005', date: '25/11/2025', amount: 'R$ 29,90', status: 'paid' }
  ];

  nextBillingDate = '25 de Abril de 2026';

  showCancelModal = signal(false);
  selectedPlan = signal<Plan | null>(null);
  showInvoiceHistory = signal(false);

  openChangePlanModal(plan: Plan) {
    this.selectedPlan.set(plan);
  }

  cancelSubscription() {
    this.showCancelModal.set(false);
    alert('Assinatura cancelada. Você terá acesso até ' + this.nextBillingDate);
  }

  confirmChangePlan() {
    const plan = this.selectedPlan();
    if (plan) {
      this.currentPlan.set({
        ...plan,
        action: 'current'
      });
      this.selectedPlan.set(null);
      alert('Plano alterado para ' + plan.name + '!');
    }
  }
}
