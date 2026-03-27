import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { Plan } from '../../../core/models/admin.models';

type PlanSlug = 'basic' | 'pro' | 'family';

interface PlanForm {
  slug: PlanSlug;
  name: string;
  description: string;
  price: number;
  restrictions: {
    max_accounts: number | null;
    max_cards: number | null;
  };
  resources: {
    account_transfers: boolean;
    goals: boolean;
    loans: boolean;
    investments: boolean;
    whatsapp_entries: boolean;
    shared_accounts: boolean;
  };
  is_active: boolean;
}

const PLAN_PRESETS: Record<PlanSlug, Omit<PlanForm, 'price' | 'is_active'>> = {
  basic: {
    slug: 'basic',
    name: 'Basic',
    description: 'Plano inicial com recursos essenciais',
    restrictions: {
      max_accounts: 2,
      max_cards: 1
    },
    resources: {
      account_transfers: true,
      goals: false,
      loans: false,
      investments: false,
      whatsapp_entries: false,
      shared_accounts: false
    }
  },
  pro: {
    slug: 'pro',
    name: 'Pro',
    description: 'Plano completo para uso individual',
    restrictions: {
      max_accounts: null,
      max_cards: null
    },
    resources: {
      account_transfers: false,
      goals: true,
      loans: true,
      investments: true,
      whatsapp_entries: true,
      shared_accounts: false
    }
  },
  family: {
    slug: 'family',
    name: 'Family',
    description: 'Plano completo para familias com uso compartilhado',
    restrictions: {
      max_accounts: null,
      max_cards: null
    },
    resources: {
      account_transfers: false,
      goals: true,
      loans: true,
      investments: true,
      whatsapp_entries: true,
      shared_accounts: true
    }
  }
};

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div class="flex items-center gap-4">
          <button (click)="navigateBack()" class="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
            <mat-icon class="text-slate-600">arrow_back</mat-icon>
          </button>
          <div>
            <h1 class="text-3xl font-bold text-slate-900">Gerenciar Planos</h1>
            <p class="text-slate-500 mt-1">Crie e edite os planos de assinatura</p>
          </div>
        </div>
        <button (click)="openCreateModal()"
                class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2">
          <mat-icon>add</mat-icon>
          Novo Plano
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @for (plan of plans(); track plan.id) {
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-bold text-slate-900">{{ plan.name }}</h3>
                <p class="text-3xl font-black text-emerald-600 mt-2">
                  R$ {{ plan.price.toFixed(2) }}
                  <span class="text-sm font-normal text-slate-400">/mes</span>
                </p>
              </div>
              <span [class]="plan.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                    class="px-3 py-1 rounded-full text-xs font-medium">
                {{ plan.is_active ? 'Ativo' : 'Inativo' }}
              </span>
            </div>

            <p class="text-sm text-slate-500 mb-4">{{ plan.description }}</p>

            <div class="space-y-2 mb-6">
              @for (feature of getPlanHighlights(plan); track feature) {
                <div class="flex items-center gap-2 text-sm text-slate-600">
                  <mat-icon class="text-emerald-500 text-sm">check_circle</mat-icon>
                  {{ feature }}
                </div>
              }
            </div>

            <div class="flex gap-2">
              <button (click)="editPlan(plan)"
                      class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                Editar
              </button>
              <button (click)="togglePlanStatus(plan)"
                      [class]="plan.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'"
                      class="px-4 py-2 border border-slate-200 rounded-lg transition-colors">
                {{ plan.is_active ? 'Desativar' : 'Ativar' }}
              </button>
            </div>
          </div>
        } @empty {
          <div class="col-span-3 text-center py-8 text-slate-400">
            Nenhum plano encontrado
          </div>
        }
      </div>

      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 class="text-xl font-bold text-slate-900 mb-4">
              {{ editingPlan()?.id ? 'Editar Plano' : 'Criar Plano' }}
            </h2>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Tipo do plano</label>
                <select
                  [(ngModel)]="planForm.slug"
                  (ngModelChange)="applyPreset($event)"
                  class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                >
                  @for (type of planTypes; track type.value) {
                    <option [value]="type.value">{{ type.label }}</option>
                  }
                </select>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input type="text" [(ngModel)]="planForm.name"
                        class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Preco (R$)</label>
                  <input type="number" [(ngModel)]="planForm.price" step="0.01"
                        class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Descricao</label>
                <textarea [(ngModel)]="planForm.description" rows="2"
                          class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"></textarea>
              </div>

              <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 class="text-sm font-semibold text-slate-800">Restricoes</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Limite de contas</label>
                    @if (planForm.restrictions.max_accounts === null) {
                      <div class="px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm">Ilimitadas</div>
                    } @else {
                      <input type="number" min="1" [(ngModel)]="planForm.restrictions.max_accounts"
                            class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                    }
                    <label class="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        [ngModel]="planForm.restrictions.max_accounts === null"
                        (ngModelChange)="toggleAccountsUnlimited($event)"
                        class="w-4 h-4 text-emerald-500 rounded"
                      >
                      Contas ilimitadas
                    </label>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Limite de cartoes</label>
                    @if (planForm.restrictions.max_cards === null) {
                      <div class="px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm">Ilimitados</div>
                    } @else {
                      <input type="number" min="1" [(ngModel)]="planForm.restrictions.max_cards"
                            class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                    }
                    <label class="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        [ngModel]="planForm.restrictions.max_cards === null"
                        (ngModelChange)="toggleCardsUnlimited($event)"
                        class="w-4 h-4 text-emerald-500 rounded"
                      >
                      Cartoes ilimitados
                    </label>
                  </div>
                </div>
              </div>

              <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 class="text-sm font-semibold text-slate-800">Recursos habilitados</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  @for (item of resourceOptions; track item.key) {
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        [ngModel]="planForm.resources[item.key]"
                        (ngModelChange)="setResource(item.key, $event)"
                        class="w-4 h-4 text-emerald-500 rounded"
                      >
                      {{ item.label }}
                    </label>
                  }
                </div>
              </div>

              <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="planForm.is_active" id="isActive"
                        class="w-4 h-4 text-emerald-500 rounded">
                <label for="isActive" class="text-sm text-slate-700">Plano ativo</label>
              </div>
            </div>

            <div class="flex gap-3 mt-6">
              <button (click)="closeModal()"
                      class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button (click)="savePlan()"
                      class="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                Salvar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminPlansComponent implements OnInit {
  private adminService = inject(AdminService);
  private navSrv = inject(NavigationService);

  plans = signal<Plan[]>([]);
  showModal = signal(false);
  editingPlan = signal<Plan | null>(null);

  planTypes: Array<{ value: PlanSlug; label: string }> = [
    { value: 'basic', label: 'Basic' },
    { value: 'pro', label: 'Pro' },
    { value: 'family', label: 'Family' }
  ];

  resourceOptions: Array<{ key: keyof PlanForm['resources']; label: string }> = [
    { key: 'account_transfers', label: 'Transferencias entre contas' },
    { key: 'goals', label: 'Cadastro de metas' },
    { key: 'loans', label: 'Controle de emprestimos' },
    { key: 'investments', label: 'Controle de investimentos' },
    { key: 'whatsapp_entries', label: 'Lancamentos por WhatsApp' },
    { key: 'shared_accounts', label: 'Contas compartilhadas' }
  ];

  planForm: PlanForm = this.createPlanForm('basic');

  async ngOnInit() {
    await this.loadPlans();
  }

  navigateBack() {
    this.navSrv.navigateTo('admin-dashboard' as any);
  }

  async loadPlans() {
    this.plans.set(await this.adminService.getPlans());
  }

  openCreateModal() {
    this.editingPlan.set(null);
    this.planForm = this.createPlanForm('basic');
    this.showModal.set(true);
  }

  editPlan(plan: Plan) {
    this.editingPlan.set(plan);

    const presetSlug = this.normalizeSlug(plan.slug || plan.name);
    const baseForm = this.createPlanForm(presetSlug);

    this.planForm = {
      ...baseForm,
      name: plan.name,
      description: plan.description || baseForm.description,
      price: Number(plan.price),
      restrictions: {
        max_accounts: plan.restrictions?.max_accounts ?? baseForm.restrictions.max_accounts,
        max_cards: plan.restrictions?.max_cards ?? baseForm.restrictions.max_cards
      },
      resources: {
        ...baseForm.resources,
        ...(plan.resources || {})
      },
      is_active: plan.is_active
    };

    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingPlan.set(null);
  }

  applyPreset(slug: PlanSlug) {
    const preset = this.createPlanForm(slug);
    this.planForm = {
      ...this.planForm,
      slug,
      name: preset.name,
      description: preset.description,
      restrictions: { ...preset.restrictions },
      resources: { ...preset.resources }
    };
  }

  toggleAccountsUnlimited(unlimited: boolean) {
    this.planForm = {
      ...this.planForm,
      restrictions: {
        ...this.planForm.restrictions,
        max_accounts: unlimited ? null : 2
      }
    };
  }

  toggleCardsUnlimited(unlimited: boolean) {
    this.planForm = {
      ...this.planForm,
      restrictions: {
        ...this.planForm.restrictions,
        max_cards: unlimited ? null : 1
      }
    };
  }

  setResource(key: keyof PlanForm['resources'], enabled: boolean) {
    this.planForm = {
      ...this.planForm,
      resources: {
        ...this.planForm.resources,
        [key]: enabled
      }
    };
  }

  getPlanHighlights(plan: Plan): string[] {
    if (plan.restrictions && plan.resources) {
      return this.buildHighlights(plan.restrictions, plan.resources);
    }

    return plan.features || [];
  }

  async savePlan() {
    const restrictions = {
      max_accounts: this.planForm.restrictions.max_accounts === null ? null : Number(this.planForm.restrictions.max_accounts),
      max_cards: this.planForm.restrictions.max_cards === null ? null : Number(this.planForm.restrictions.max_cards)
    };

    const features = this.buildHighlights(restrictions, this.planForm.resources);

    const planData: Partial<Plan> = {
      slug: this.planForm.slug,
      name: this.planForm.name,
      description: this.planForm.description,
      price: Number(this.planForm.price),
      restrictions,
      resources: { ...this.planForm.resources },
      features,
      is_active: this.planForm.is_active
    };

    let success: boolean;

    if (this.editingPlan()?.id) {
      success = await this.adminService.updatePlan(this.editingPlan()!.id, planData);
    } else {
      success = await this.adminService.createPlan(planData);
    }

    if (success) {
      await this.loadPlans();
      this.closeModal();
    }
  }

  async togglePlanStatus(plan: Plan) {
    const success = await this.adminService.updatePlan(plan.id, { is_active: !plan.is_active });
    if (success) {
      await this.loadPlans();
    }
  }

  private createPlanForm(slug: PlanSlug): PlanForm {
    const preset = PLAN_PRESETS[slug];
    return {
      slug,
      name: preset.name,
      description: preset.description,
      price: 0,
      restrictions: { ...preset.restrictions },
      resources: { ...preset.resources },
      is_active: true
    };
  }

  private normalizeSlug(value?: string | null): PlanSlug {
    const normalized = (value || '').toLowerCase();
    if (normalized.includes('family')) return 'family';
    if (normalized.includes('pro')) return 'pro';
    return 'basic';
  }

  private buildHighlights(
    restrictions: { max_accounts: number | null; max_cards: number | null },
    resources: PlanForm['resources']
  ): string[] {
    const highlights: string[] = [];

    highlights.push(
      restrictions.max_accounts === null ? 'Contas ilimitadas' : `${restrictions.max_accounts} contas`
    );
    highlights.push(
      restrictions.max_cards === null ? 'Cartoes ilimitados' : `${restrictions.max_cards} cartoes`
    );

    if (resources.account_transfers) highlights.push('Transferencias entre contas');
    if (resources.goals) highlights.push('Cadastro de metas');
    if (resources.loans) highlights.push('Controle de emprestimos');
    if (resources.investments) highlights.push('Controle de investimentos');
    if (resources.shared_accounts) highlights.push('Contas compartilhadas');
    if (resources.whatsapp_entries) highlights.push('Lancamentos por WhatsApp');

    return highlights;
  }
}
