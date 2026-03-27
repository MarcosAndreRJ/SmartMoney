import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { Plan, Subscription, UserProfile } from '../../../core/models/admin.models';

type SubscriptionTab = 'all' | 'active' | 'trial' | 'cancelled';

interface CreateSubscriptionForm {
  user_id: string;
  plan_id: string;
  start_date: string;
}

interface EditSubscriptionForm {
  plan_id: string;
  status: Subscription['status'];
  end_date: string;
}

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Gerenciar Assinaturas</h1>
          <p class="text-slate-500 mt-1">Controle o ciclo de vida dos usuarios e faturamento do sistema.</p>
        </div>
        <button
          (click)="openCreateModal()"
          class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
        >
          <mat-icon>add</mat-icon>
          Nova Assinatura
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs uppercase tracking-wide text-slate-400 font-semibold">Faturamento Mensal (MRR)</p>
            <mat-icon class="text-emerald-500">payments</mat-icon>
          </div>
          <p class="text-3xl font-black text-slate-900">R$ {{ mrr().toFixed(2) }}</p>
        </div>

        <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs uppercase tracking-wide text-slate-400 font-semibold">Assinaturas Ativas</p>
            <mat-icon class="text-blue-500">group</mat-icon>
          </div>
          <p class="text-3xl font-black text-slate-900">{{ activeCount() }}</p>
        </div>

        <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs uppercase tracking-wide text-slate-400 font-semibold">Taxa de Churn</p>
            <mat-icon class="text-red-500">trending_down</mat-icon>
          </div>
          <p class="text-3xl font-black text-slate-900">{{ churnRate().toFixed(1) }}%</p>
        </div>
      </div>

      <div class="bg-slate-100 rounded-2xl p-2 mb-4 flex flex-wrap gap-2">
        @for (tab of tabs; track tab.value) {
          <button
            (click)="activeTab.set(tab.value)"
            class="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            [class.bg-white]="activeTab() === tab.value"
            [class.text-slate-900]="activeTab() === tab.value"
            [class.text-slate-500]="activeTab() !== tab.value"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
        <div class="relative">
          <mat-icon class="absolute left-3 top-2.5 text-slate-400 text-lg">search</mat-icon>
          <input
            [ngModel]="searchInput()"
            (ngModelChange)="searchInput.set($event)"
            placeholder="Filtrar por nome ou email..."
            class="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
          >
        </div>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[960px]">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Avatar</th>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Usuario</th>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Plano</th>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Data Inicio</th>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Proxima Cobranca</th>
                <th class="text-right px-6 py-4 text-xs font-bold text-slate-400 uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (sub of pagedSubscriptions(); track sub.id) {
                <tr class="hover:bg-slate-50">
                  <td class="px-6 py-4">
                    <div class="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold uppercase">
                      {{ getUserInitials(sub) }}
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <p class="font-medium text-slate-900">{{ getUserName(sub) }}</p>
                    <p class="text-sm text-slate-500">{{ sub.user_email || '-' }}</p>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
                          [class]="getPlanBadgeClass(sub.plan_name)">
                      {{ sub.plan_name || 'Sem plano' }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
                          [class]="getStatusChipClass(sub.status)">
                      <span class="w-1.5 h-1.5 rounded-full" [class]="getStatusDotClass(sub.status)"></span>
                      {{ getStatusLabel(sub.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-500">{{ formatDate(sub.start_date) }}</td>
                  <td class="px-6 py-4 text-sm text-slate-500">{{ formatDate(sub.end_date) }}</td>
                  <td class="px-6 py-4 text-right relative">
                    <button
                      (click)="toggleActionMenu(sub.id)"
                      class="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100"
                    >
                      <mat-icon class="text-slate-500 text-lg">more_horiz</mat-icon>
                    </button>

                    @if (actionMenuId() === sub.id) {
                      <div class="absolute right-6 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-20 text-left overflow-hidden">
                        <button (click)="openEditModal(sub)" class="w-full px-4 py-2.5 text-sm hover:bg-slate-50">Editar</button>
                        <button (click)="extendSubscription(sub)" class="w-full px-4 py-2.5 text-sm hover:bg-slate-50">Estender 30 dias</button>
                        <button (click)="cancelSubscription(sub)" class="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">Cancelar</button>
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="px-6 py-10 text-center text-slate-400">
                    Nenhuma assinatura encontrada
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p class="text-sm text-slate-500">Mostrando {{ pageStart() }}-{{ pageEnd() }} de {{ totalFiltered() }} assinaturas</p>
          <div class="flex items-center gap-2">
            <button (click)="goToPreviousPage()" [disabled]="page() === 1"
                    class="w-8 h-8 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
              <mat-icon class="text-base">chevron_left</mat-icon>
            </button>
            @for (p of visiblePages(); track p) {
              <button (click)="page.set(p)"
                      class="w-8 h-8 rounded-lg border text-sm font-semibold"
                      [class.bg-emerald-500]="p === page()"
                      [class.text-white]="p === page()"
                      [class.border-emerald-500]="p === page()"
                      [class.border-slate-200]="p !== page()"
                      [class.text-slate-700]="p !== page()">
                {{ p }}
              </button>
            }
            <button (click)="goToNextPage()" [disabled]="page() === totalPages()"
                    class="w-8 h-8 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">
              <mat-icon class="text-base">chevron_right</mat-icon>
            </button>
          </div>
        </div>
      </div>

      @if (showCreateModal()) {
        <div class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/50" (click)="closeCreateModal()"></div>
          <div class="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-slate-900">Nova Assinatura</h2>
                <button (click)="closeCreateModal()" class="p-2 hover:bg-slate-100 rounded-lg">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Buscar usuario por email</label>
                  <input
                    [ngModel]="userSearchInput()"
                    (ngModelChange)="userSearchInput.set($event)"
                    placeholder="Digite parte do email"
                    class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                  >
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                  <select
                    [ngModel]="createForm.user_id"
                    (ngModelChange)="createForm.user_id = $event"
                    class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                  >
                    <option value="">Selecione um usuario</option>
                    @for (u of filteredUsersForModal(); track u.id) {
                      <option [value]="u.id">{{ u.email }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Plano</label>
                  <select
                    [ngModel]="createForm.plan_id"
                    (ngModelChange)="createForm.plan_id = $event"
                    class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                  >
                    <option value="">Selecione um plano</option>
                    @for (plan of activePlans(); track plan.id) {
                      <option [value]="plan.id">{{ plan.name }} - R$ {{ plan.price.toFixed(2) }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Data de inicio</label>
                  <input
                    type="date"
                    [ngModel]="createForm.start_date"
                    (ngModelChange)="createForm.start_date = $event"
                    class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                  >
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <button (click)="closeCreateModal()"
                        class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button (click)="createSubscription()" [disabled]="saving()"
                        class="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      @if (showEditModal() && editingSubscription()) {
        <div class="fixed inset-0 z-50 flex justify-end">
          <div class="absolute inset-0 bg-black/50" (click)="closeEditModal()"></div>
          <div class="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-slate-900">Editar Assinatura</h2>
                <button (click)="closeEditModal()" class="p-2 hover:bg-slate-100 rounded-lg">
                  <mat-icon>close</mat-icon>
                </button>
              </div>

              <div class="bg-slate-50 rounded-xl p-4 mb-6">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-lg font-bold uppercase">
                    {{ getUserInitials(editingSubscription()!) }}
                  </div>
                  <div>
                    <p class="font-medium text-slate-900">{{ getUserName(editingSubscription()!) }}</p>
                    <p class="text-sm text-slate-500">{{ editingSubscription()!.user_email }}</p>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Plano</label>
                  <select
                    [ngModel]="editForm.plan_id"
                    (ngModelChange)="editForm.plan_id = $event"
                    class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                  >
                    @for (plan of activePlans(); track plan.id) {
                      <option [value]="plan.id">{{ plan.name }} - R$ {{ plan.price.toFixed(2) }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    [ngModel]="editForm.status"
                    (ngModelChange)="editForm.status = $event"
                    class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 bg-white"
                  >
                    <option value="active">Ativa</option>
                    <option value="trial">Pendente</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="expired">Expirada</option>
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Proxima cobranca</label>
                  <input
                    type="date"
                    [ngModel]="editForm.end_date"
                    (ngModelChange)="editForm.end_date = $event"
                    class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                  >
                </div>
              </div>

              <div class="flex gap-3 mt-6">
                <button (click)="closeEditModal()"
                        class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button (click)="saveEditSubscription()" [disabled]="saving()"
                        class="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminSubscriptionsComponent implements OnInit {
  private adminService = inject(AdminService);

  readonly pageSize = 10;

  subscriptions = signal<Subscription[]>([]);
  plans = signal<Plan[]>([]);
  users = signal<UserProfile[]>([]);

  activeTab = signal<SubscriptionTab>('all');
  searchInput = signal('');
  search = signal('');
  page = signal(1);

  showCreateModal = signal(false);
  showEditModal = signal(false);
  actionMenuId = signal<string | null>(null);
  saving = signal(false);

  editingSubscription = signal<Subscription | null>(null);
  userSearchInput = signal('');

  createForm: CreateSubscriptionForm = {
    user_id: '',
    plan_id: '',
    start_date: this.todayISO()
  };

  editForm: EditSubscriptionForm = {
    plan_id: '',
    status: 'active',
    end_date: this.todayISO()
  };

  tabs: Array<{ value: SubscriptionTab; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Ativos' },
    { value: 'trial', label: 'Pendentes' },
    { value: 'cancelled', label: 'Cancelados' }
  ];

  activePlans = computed(() => this.plans().filter(plan => plan.is_active));

  private filteredAll = computed(() => {
    const term = this.search().trim().toLowerCase();
    let result = this.subscriptions();

    if (this.activeTab() !== 'all') {
      result = result.filter(sub => sub.status === this.activeTab());
    }

    if (term) {
      result = result.filter(sub => {
        const userName = this.getUserName(sub).toLowerCase();
        const userEmail = (sub.user_email || '').toLowerCase();
        return userName.includes(term) || userEmail.includes(term);
      });
    }

    return result;
  });

  totalFiltered = computed(() => this.filteredAll().length);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalFiltered() / this.pageSize)));

  pageStart = computed(() => {
    if (this.totalFiltered() === 0) return 0;
    return (this.page() - 1) * this.pageSize + 1;
  });

  pageEnd = computed(() => Math.min(this.page() * this.pageSize, this.totalFiltered()));

  pagedSubscriptions = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredAll().slice(start, start + this.pageSize);
  });

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const start = Math.max(1, current - 1);
    const end = Math.min(total, start + 2);
    const begin = Math.max(1, end - 2);

    const pages: number[] = [];
    for (let i = begin; i <= end; i += 1) pages.push(i);
    return pages;
  });

  mrr = computed(() => {
    const pricesByPlan = new Map(this.plans().map(plan => [plan.id, Number(plan.price) || 0]));
    return this.subscriptions()
      .filter(sub => sub.status === 'active')
      .reduce((sum, sub) => sum + (sub.plan_price ?? pricesByPlan.get(sub.plan_id) ?? 0), 0);
  });

  activeCount = computed(() => this.subscriptions().filter(sub => sub.status === 'active').length);

  churnRate = computed(() => {
    const total = this.subscriptions().length;
    if (!total) return 0;
    const cancelled = this.subscriptions().filter(sub => sub.status === 'cancelled').length;
    return (cancelled / total) * 100;
  });

  filteredUsersForModal = computed(() => {
    const term = this.userSearchInput().trim().toLowerCase();
    if (!term) return this.users();
    return this.users().filter(u => (u.email || '').toLowerCase().includes(term));
  });

  constructor() {
    effect((onCleanup) => {
      const value = this.searchInput();
      const timer = setTimeout(() => {
        this.search.set(value);
      }, 300);
      onCleanup(() => clearTimeout(timer));
    });

    effect(() => {
      this.activeTab();
      this.search();
      this.page.set(1);
    });

    effect(() => {
      const maxPage = this.totalPages();
      if (this.page() > maxPage) {
        this.page.set(maxPage);
      }
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    const [subs, plans, users] = await Promise.all([
      this.adminService.getAllSubscriptions(),
      this.adminService.getPlans(),
      this.adminService.getAllUsers()
    ]);

    this.subscriptions.set(subs);
    this.plans.set(plans);
    this.users.set(users);
  }

  openCreateModal() {
    this.createForm = {
      user_id: '',
      plan_id: this.activePlans()[0]?.id || '',
      start_date: this.todayISO()
    };
    this.userSearchInput.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  async createSubscription() {
    if (!this.createForm.user_id || !this.createForm.plan_id || !this.createForm.start_date) {
      return;
    }

    this.saving.set(true);
    const startDate = new Date(this.createForm.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);

    const success = await this.adminService.createSubscription({
      user_id: this.createForm.user_id,
      plan_id: this.createForm.plan_id,
      status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      payment_gateway: 'manual'
    });

    this.saving.set(false);
    if (success) {
      await this.loadData();
      this.closeCreateModal();
    }
  }

  toggleActionMenu(id: string) {
    this.actionMenuId.set(this.actionMenuId() === id ? null : id);
  }

  openEditModal(sub: Subscription) {
    this.actionMenuId.set(null);
    this.editingSubscription.set(sub);
    this.editForm = {
      plan_id: sub.plan_id,
      status: sub.status,
      end_date: sub.end_date ? this.toDateInput(sub.end_date) : this.todayISO()
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingSubscription.set(null);
  }

  async saveEditSubscription() {
    const sub = this.editingSubscription();
    if (!sub) return;

    this.saving.set(true);
    const success = await this.adminService.updateSubscription(sub.id, {
      plan_id: this.editForm.plan_id,
      status: this.editForm.status,
      end_date: this.editForm.end_date ? new Date(this.editForm.end_date).toISOString() : undefined
    });
    this.saving.set(false);

    if (success) {
      await this.loadData();
      this.closeEditModal();
    }
  }

  async extendSubscription(sub: Subscription) {
    this.actionMenuId.set(null);
    const success = await this.adminService.extendSubscription(sub.id, 30);
    if (success) {
      await this.loadData();
    }
  }

  async cancelSubscription(sub: Subscription) {
    this.actionMenuId.set(null);
    const success = await this.adminService.cancelSubscription(sub.id);
    if (success) {
      await this.loadData();
    }
  }

  goToPreviousPage() {
    if (this.page() > 1) this.page.update(p => p - 1);
  }

  goToNextPage() {
    if (this.page() < this.totalPages()) this.page.update(p => p + 1);
  }

  getUserName(sub: Subscription): string {
    if (sub.user_name) return sub.user_name;
    if (sub.user_email) return sub.user_email.split('@')[0];
    return sub.user_id.slice(0, 8);
  }

  getUserInitials(sub: Subscription): string {
    const name = this.getUserName(sub).trim();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0]}${parts[1][0]}`;
  }

  getStatusLabel(status: Subscription['status']): string {
    const labels: Record<Subscription['status'], string> = {
      active: 'Ativa',
      trial: 'Pendente',
      cancelled: 'Cancelada',
      expired: 'Expirada'
    };
    return labels[status] || status;
  }

  getStatusChipClass(status: Subscription['status']): string {
    const classes: Record<Subscription['status'], string> = {
      active: 'bg-emerald-50 text-emerald-700',
      trial: 'bg-amber-50 text-amber-700',
      cancelled: 'bg-red-50 text-red-700',
      expired: 'bg-slate-100 text-slate-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  }

  getStatusDotClass(status: Subscription['status']): string {
    const classes: Record<Subscription['status'], string> = {
      active: 'bg-emerald-500',
      trial: 'bg-amber-500',
      cancelled: 'bg-red-500',
      expired: 'bg-slate-500'
    };
    return classes[status] || 'bg-slate-500';
  }

  getPlanBadgeClass(planName?: string): string {
    const lower = (planName || '').toLowerCase();
    if (lower.includes('family')) return 'bg-cyan-50 text-cyan-700';
    if (lower.includes('pro')) return 'bg-violet-50 text-violet-700';
    return 'bg-slate-100 text-slate-700';
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  private todayISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  private toDateInput(value: string): string {
    return new Date(value).toISOString().split('T')[0];
  }
}
