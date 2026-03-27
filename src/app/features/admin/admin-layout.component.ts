import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../core/services/admin.service';
import { NavigationService } from '../../core/services/navigation.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flex min-h-screen bg-slate-50">
      <!-- Sidebar Admin -->
      <aside class="w-64 bg-slate-900 text-white flex flex-col">
        <div class="p-6 border-b border-slate-800">
          <button (click)="navigateTo('admin-dashboard')" class="text-left w-full">
            <h1 class="text-xl font-bold flex items-center gap-2">
              <mat-icon class="text-emerald-400">admin_panel_settings</mat-icon>
              SmartKonta Admin
            </h1>
            <p class="text-xs text-slate-400 mt-1">Painel de Administração</p>
          </button>
        </div>
        
        <nav class="flex-1 p-4 space-y-1">
          <button (click)="navigateTo('admin-dashboard')" 
                  [class.bg-slate-800]="currentView() === 'admin-dashboard'"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
            <mat-icon>dashboard</mat-icon>
            Dashboard
          </button>
          <button (click)="navigateTo('admin-users')"
                  [class.bg-slate-800]="currentView() === 'admin-users'"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
            <mat-icon>people</mat-icon>
            Usuários
          </button>
          <button (click)="navigateTo('admin-plans')"
                  [class.bg-slate-800]="currentView() === 'admin-plans'"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
            <mat-icon>card_membership</mat-icon>
            Planos
          </button>
          <button (click)="navigateTo('admin-subscriptions')"
                  [class.bg-slate-800]="currentView() === 'admin-subscriptions'"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
            <mat-icon>subscriptions</mat-icon>
            Assinaturas
          </button>
          <button (click)="navigateTo('admin-transactions')"
                  [class.bg-slate-800]="currentView() === 'admin-transactions'"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
            <mat-icon>receipt_long</mat-icon>
            Transações
          </button>
          <button (click)="navigateTo('admin-notifications')"
                  [class.bg-slate-800]="currentView() === 'admin-notifications'"
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
            <mat-icon>notifications</mat-icon>
            Notificações
          </button>
        </nav>
        
        <div class="p-4 border-t border-slate-800">
          <button (click)="navigateTo('dashboard')" 
                  class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left">
            <mat-icon>arrow_back</mat-icon>
            Voltar ao App
          </button>
        </div>
      </aside>
      
      <!-- Main Content (renderizado pelo app.ts) -->
      <main class="flex-1 overflow-y-auto">
        <!-- O conteúdo é renderizado pelo app.ts baseado em currentView -->
      </main>
    </div>
  `
})
export class AdminLayoutComponent implements OnInit {
  private adminService = inject(AdminService);
  private navSrv = inject(NavigationService);
  
  isAdmin = signal(false);
  currentView = this.navSrv.currentView;
  
  async ngOnInit() {
    this.isAdmin.set(await this.adminService.isAdmin());
  }
  
  navigateTo(view: string) {
    this.navSrv.navigateTo(view as any);
  }
}
