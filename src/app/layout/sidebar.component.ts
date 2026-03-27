import { Component, inject, signal, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from '../core/services/navigation.service';
import { AdminService } from '../core/services/admin.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <aside class="w-64 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-30">
      <!-- Logo -->
      <div class="p-6 flex items-center gap-3 border-b border-slate-100">
        <img src="/assets/logo-smartkonta.png" alt="SmartKonta" class="w-9 h-9 object-contain" />
        <div>
          <h1 class="font-extrabold text-[1.35rem] leading-tight text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#A21CAF]">SmartKonta</h1>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Premium Account</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto no-scrollbar">
        @for (item of navItems; track item.id) {
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

      <!-- Add Transaction Button -->
      <div class="px-4 py-6 text-center">
        <button class="w-full py-3.5 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-200 flex items-center justify-center gap-2 bg-gradient-to-r from-[#6C2BD9] via-[#9333EA] to-[#A21CAF] hover:brightness-105">
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
  currentView = this.navSrv.currentView;
  isAdmin = signal(false);

  navItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Painel' },
    { id: 'accounts', icon: 'account_balance_wallet', label: 'Contas' },
    { id: 'credit-cards', icon: 'credit_card', label: 'Cartões' },
    { id: 'transactions', icon: 'sync_alt', label: 'Transferências' },
    { id: 'lancamentos', icon: 'receipt_long', label: 'Transações' },
    { id: 'categories', icon: 'category', label: 'Categorias' },
    { id: 'recurring', icon: 'event_repeat', label: 'Recorrente' },
    // { id: 'savings', icon: 'savings', label: 'Poupança' },
    { id: 'goals', icon: 'track_changes', label: 'Metas' },
    { id: 'shared-accounts', icon: 'group', label: 'Contas Compartilhadas' },
    { id: 'investments', icon: 'trending_up', label: 'Investimentos' },
    { id: 'data-management', icon: 'storage', label: 'Gerenciar Dados' },
    { id: 'loans', icon: 'account_balance', label: 'Empréstimos' },
    { id: 'notifications', icon: 'notifications', label: 'Notificações' },
    { id: 'contacts', icon: 'contacts', label: 'Contatos' },
    { id: 'subscription', icon: 'workspace_premium', label: 'Assinatura' },
    { id: 'settings', icon: 'settings', label: 'Configurações' },
  ];

  adminItems = [
    { id: 'admin-dashboard', icon: 'admin_panel_settings', label: 'Painel Admin' },
  ];

  async ngOnInit() {
    this.isAdmin.set(await this.adminService.isAdmin());
  }

  onNavigate(viewId: any, event: Event) {
    event.preventDefault();
    this.navSrv.navigateTo(viewId);
  }
}
