import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from '../core/services/navigation.service';
import { AdminService } from '../core/services/admin.service';
import { SupabaseService } from '../core/services/supabase.service';
import { TransactionViewService } from '../core/services/transaction-view.service';
import { Router } from '@angular/router';

interface NavItem {
  id: string;
  icon: string;
  label: string;
  resource?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MatIconModule, CommonModule],
  template: `
    <aside class="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-30">
      <!-- Logo -->
      <div class="p-2 pl-5 flex items-center gap-0 border-b border-slate-100">
        <img src="/assets/logo_clean_pq.png" alt="SmartKonta" class="w-13 h-13 object-contain" />
        <div>
          <h1 class="font-extrabold text-[1.35rem] leading-tight text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BD9] to-[#A21CAF]">{{ brandName() }}</h1>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ planName() }} Account</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto no-scrollbar">
        @for (item of filteredNavItems(); track item.id) {
          <a href="#" 
             (click)="onNavigate(item.id, $event)"
             class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
             [class.bg-[#F4EFFF]]="currentView() === item.id"
             [class.text-[#6C2BD9]]="currentView() === item.id"
             [class.text-slate-500]="currentView() !== item.id"
             [class.hover:bg-[#F8F5FF]]="currentView() !== item.id">
            <mat-icon class="text-xl" [class.text-[#6C2BD9]]="currentView() === item.id">{{ item.icon }}</mat-icon>
            {{ item.label }}
          </a>
        }
        
        @if (isAdmin()) {
          <div class="border-t border-gray-200 my-4 pt-4">
            <p class="px-4 text-xs font-bold text-slate-400 uppercase mb-2">Administração</p>
            @for (item of adminItems; track item.id) {
              <a href="#" 
                 (click)="onNavigate(item.id, $event)"
                 class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                 [class.bg-purple-50]="currentView() === item.id"
                 [class.text-purple-700]="currentView() === item.id"
                 [class.text-slate-500]="currentView() !== item.id"
                 [class.hover:bg-gray-100]="currentView() !== item.id">
                <mat-icon class="text-xl">{{ item.icon }}</mat-icon>
                {{ item.label }}
              </a>
            }
          </div>
        }
      </nav>

      <div class="px-4 py-6 text-center">
        <button 
          (click)="txViewSrv.open()"
          class="w-full py-3.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2 bg-gradient-to-r from-[#6C2BD9] via-[#9333EA] to-[#A21CAF] hover:brightness-105">
          <mat-icon class="text-lg">add_circle</mat-icon>
          Adicionar Transação
        </button>
      </div>
    </aside>
  `
})
export class SidebarComponent implements OnInit {
  private navSrv = inject(NavigationService);
  private adminService = inject(AdminService);
  private supabaseSrv = inject(SupabaseService);
  public txViewSrv = inject(TransactionViewService);
  private router = inject(Router);

  currentView = this.navSrv.currentView;
  isAdmin = signal(false);
  brandName = signal('SmartKonta');
  userSubscription = signal<any>(null);

  planName = computed(() => this.userSubscription()?.plan_name || 'Free');

  navItems: NavItem[] = [
    { id: 'dashboard', icon: 'dashboard', label: 'Painel' },
    { id: 'accounts', icon: 'account_balance_wallet', label: 'Contas' },
    { id: 'credit-cards', icon: 'credit_card', label: 'Cartões' },
    { id: 'transactions', icon: 'sync_alt', label: 'Transferências', resource: 'account_transfers' },
    { id: 'lancamentos', icon: 'receipt_long', label: 'Transações' },
    { id: 'categories', icon: 'category', label: 'Categorias' },
    { id: 'recurring', icon: 'event_repeat', label: 'Recorrente' },
    // { id: 'savings', icon: 'savings', label: 'Poupança' },
    { id: 'goals', icon: 'track_changes', label: 'Metas', resource: 'goals' },
    { id: 'shared-accounts', icon: 'group', label: 'Contas Compartilhadas', resource: 'shared_accounts' },
    { id: 'investments', icon: 'trending_up', label: 'Investimentos', resource: 'investments' },
    { id: 'data-management', icon: 'storage', label: 'Gerenciar Dados' },
    { id: 'loans', icon: 'account_balance', label: 'Empréstimos', resource: 'loans' },
    { id: 'notifications', icon: 'notifications', label: 'Notificações' },
    { id: 'contacts', icon: 'contacts', label: 'Contatos' },
    { id: 'importacao', icon: 'upload_file', label: 'Importar Arquivos', resource: 'bulk_import' },
    { id: 'subscription', icon: 'workspace_premium', label: 'Assinatura' },
    { id: 'settings', icon: 'settings', label: 'Configurações' },
  ];

  /* ================================================================
   * BLOQUEIO DE RECURSOS POR PLANO - DESABILITADO TEMPORARIAMENTE
   * 
   * Este computed filtra os itens do menu com base no plano do usuário,
   * mostrando/escondendo funcionalidades premium conforme a assinatura.
   * 
   * EXPLICACAO:
   * - Verifica se o usuario tem assinatura (sub)
   * - Se NAO tem: mostra apenas itens basicos (Dashboard, Contas, Cartoes,
   *   Lancamentos, Categorias, Assinatura, Configuracoes)
   * - Se TEM: mostra todos os itens que NAO tem recurso marcado,
   *   mais os itens que tem recurso E este recurso esta habilitado
   *   no plano do usuario (via sub.resources[recurso])
   * 
   * MOTIVO DO COMENTARIO:
   * - A tabela subscriptions no Supabase pode NAO ter o campo 'resources'
   *   popula com a estrutura correta (account_transfers, goals, loans, etc.)
   * - Alem disso, a verificacao de recursos depende de cada plano ter seus
   *   resources corretamente configurados na tabela plans
   * - Enquanto a estrutura de dados e RLS nao estiverem 100% funcionais,
   *   manter todos os itens do menu visiveis evita用户体验 problemas
   * 
   * PARA REATIVAR:
   * 1. Execute a migração plans_resources_restrictions_migration.sql
   * 2. Execute fix_admin_rls_policies.sql para garantir RLS correto
   * 3. Descomente este bloco
   * 4. Adicione campo 'resource' nos NavItem que precisam de controle
   *    (ex: { id: 'goals', icon: 'flag', label: 'Metas', resource: 'goals' })
   * ================================================================ */
  filteredNavItems = computed(() => {
    const sub = this.userSubscription();
    if (!sub || !sub.resources) {
      // Se nao tem assinatura, mostra apenas itens basicos
      const allowedIds = ['dashboard', 'accounts', 'credit-cards', 'lancamentos', 'categories', 'subscription', 'settings'];
      return this.navItems.filter(item => allowedIds.includes(item.id));
    }

    return this.navItems.filter(item => {
      if (!item.resource) return true;  // Itens sem resource sempre visiveis
      return !!sub.resources[item.resource];  // Verifica se recurso esta habilitado
    });
  });

  // TEMPORARIO: retorna todos os itens sem filtragem por plano
  // filteredNavItems = computed(() => this.navItems);

  adminItems: NavItem[] = [
    { id: 'admin-dashboard', icon: 'admin_panel_settings', label: 'Painel Admin' },
    { id: 'admin-plans', icon: 'card_membership', label: 'Planos' },
    { id: 'admin-subscriptions', icon: 'subscriptions', label: 'Assinaturas' },
    { id: 'admin-transactions', icon: 'search', label: 'Transações' },
  ];

  async ngOnInit() {
    const user = await this.supabaseSrv.getUser();
    if (user) {
      this.isAdmin.set(await this.adminService.isAdmin());
      this.userSubscription.set(await this.adminService.getUserSubscription(user.id));
    }
  }

  onNavigate(viewId: any, event: Event) {
    event.preventDefault();
    this.navSrv.navigateTo(viewId);
  }
}
