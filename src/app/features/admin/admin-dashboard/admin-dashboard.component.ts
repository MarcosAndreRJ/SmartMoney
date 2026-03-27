import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { AdminMetrics } from '../../../core/models/admin.models';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-900">Dashboard Admin</h1>
        <p class="text-slate-500 mt-1">Visão geral do sistema SmartKonta</p>
      </div>
      
      @if (loading()) {
        <div class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      } @else {
        <!-- Métricas Principais -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Total Usuários -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <mat-icon>people</mat-icon>
              </div>
              <span class="text-xs font-medium text-green-500 bg-green-50 px-2 py-1 rounded-full">
                +{{ metrics()?.new_users_today || 0 }} hoje
              </span>
            </div>
            <p class="text-3xl font-black text-slate-900">{{ metrics()?.total_users || 0 }}</p>
            <p class="text-sm text-slate-500 mt-1">Total de Usuários</p>
          </div>
          
          <!-- Usuários Ativos -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <mat-icon>person_check</mat-icon>
              </div>
            </div>
            <p class="text-3xl font-black text-slate-900">{{ metrics()?.active_users || 0 }}</p>
            <p class="text-sm text-slate-500 mt-1">Usuários Ativos</p>
          </div>
          
          <!-- Total Transações -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                <mat-icon>receipt_long</mat-icon>
              </div>
            </div>
            <p class="text-3xl font-black text-slate-900">{{ metrics()?.total_transactions || 0 }}</p>
            <p class="text-sm text-slate-500 mt-1">Total de Transações</p>
          </div>
          
          <!-- Saldo Total -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <mat-icon>account_balance_wallet</mat-icon>
              </div>
            </div>
            <p class="text-3xl font-black text-slate-900">R$ {{ formatCurrency(metrics()?.total_balance || 0) }}</p>
            <p class="text-sm text-slate-500 mt-1">Saldo Total no Sistema</p>
          </div>
        </div>
        
        <!-- Segunda Linha -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <!-- Assinaturas Ativas -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                <mat-icon>subscriptions</mat-icon>
              </div>
            </div>
            <p class="text-3xl font-black text-slate-900">{{ metrics()?.active_subscriptions || 0 }}</p>
            <p class="text-sm text-slate-500 mt-1">Assinaturas Ativas</p>
          </div>
          
          <!-- Receita Mensal -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                <mat-icon>payments</mat-icon>
              </div>
            </div>
            <p class="text-3xl font-black text-slate-900">R$ {{ formatCurrency(metrics()?.revenue_month || 0) }}</p>
            <p class="text-sm text-slate-500 mt-1">Receita Mensal</p>
          </div>
          
          <!-- Planos por Assinatura -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <div class="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-500 flex items-center justify-center">
                <mat-icon>pie_chart</mat-icon>
              </div>
            </div>
            <div class="space-y-2">
              @for (plan of metrics()?.subscriptions_by_plan || []; track plan.plan) {
                <div class="flex justify-between text-sm">
                  <span class="text-slate-600">{{ plan.plan }}</span>
                  <span class="font-bold text-slate-900">{{ plan.count }}</span>
                </div>
              }
              @empty {
                <p class="text-sm text-slate-500">Nenhuma assinatura</p>
              }
            </div>
          </div>
        </div>
        
        <!-- Links Rápidos -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 class="text-lg font-bold text-slate-900 mb-4">Ações Rápidas</h2>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button (click)="navigateTo('admin-users')" class="flex flex-col items-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <mat-icon class="text-blue-500 mb-2">person_add</mat-icon>
              <span class="text-sm font-medium text-slate-700">Gerenciar Usuários</span>
            </button>
            <button (click)="navigateTo('admin-plans')" class="flex flex-col items-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <mat-icon class="text-purple-500 mb-2">card_membership</mat-icon>
              <span class="text-sm font-medium text-slate-700">Gerenciar Planos</span>
            </button>
            <button (click)="navigateTo('admin-subscriptions')" class="flex flex-col items-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <mat-icon class="text-emerald-500 mb-2">subscriptions</mat-icon>
              <span class="text-sm font-medium text-slate-700">Gerenciar Assinaturas</span>
            </button>
            <button (click)="navigateTo('admin-transactions')" class="flex flex-col items-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <mat-icon class="text-amber-500 mb-2">search</mat-icon>
              <span class="text-sm font-medium text-slate-700">Ver Transações</span>
            </button>
            <button (click)="navigateTo('admin-notifications')" class="flex flex-col items-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <mat-icon class="text-red-500 mb-2">send</mat-icon>
              <span class="text-sm font-medium text-slate-700">Enviar Notificação</span>
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private navSrv = inject(NavigationService);
  
  metrics = signal<AdminMetrics | null>(null);
  loading = signal(true);
  
  async ngOnInit() {
    await this.loadMetrics();
  }
  
  async loadMetrics() {
    this.loading.set(true);
    this.metrics.set(await this.adminService.getMetrics());
    this.loading.set(false);
  }
  
  navigateTo(view: string) {
    this.navSrv.navigateTo(view as any);
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
