import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { Subscription } from '../../../core/models/admin.models';

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Assinaturas</h1>
          <p class="text-slate-500 mt-1">Gerencie as assinaturas dos usuários</p>
        </div>
        <button (click)="loadSubscriptions()" 
                class="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
          <mat-icon>refresh</mat-icon>
          Atualizar
        </button>
      </div>
      
      <!-- Filtros -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
        <div class="flex gap-4">
          <select [(ngModel)]="statusFilter" (ngModelChange)="filterSubscriptions()"
                  class="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
            <option value="all">Todos os Status</option>
            <option value="active">Ativas</option>
            <option value="trial">Trial</option>
            <option value="cancelled">Canceladas</option>
            <option value="expired">Expiradas</option>
          </select>
        </div>
      </div>
      
      <!-- Lista de Assinaturas -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table class="w-full">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Usuário</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Plano</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Início</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Fim</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (sub of filteredSubscriptions(); track sub.id) {
              <tr class="hover:bg-slate-50">
                <td class="px-6 py-4 text-sm text-slate-900">
                  {{ sub.user_email || sub.user_id }}
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                  {{ sub.plan_name || 'Plano não definido' }}
                </td>
                <td class="px-6 py-4">
                  <span [class]="getStatusClass(sub.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                    {{ getStatusLabel(sub.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-slate-500">
                  {{ formatDate(sub.start_date) }}
                </td>
                <td class="px-6 py-4 text-sm text-slate-500">
                  {{ formatDate(sub.end_date) }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    @if (sub.status === 'active') {
                      <button (click)="extendSubscription(sub)" title="Estender 30 dias"
                              class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <mat-icon>event</mat-icon>
                      </button>
                      <button (click)="cancelSubscription(sub)" title="Cancelar"
                              class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <mat-icon>cancel</mat-icon>
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                  Nenhuma assinatura encontrada
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AdminSubscriptionsComponent implements OnInit {
  private adminService = inject(AdminService);
  
  subscriptions = signal<Subscription[]>([]);
  filteredSubscriptions = signal<Subscription[]>([]);
  statusFilter = 'all';
  
  async ngOnInit() {
    await this.loadSubscriptions();
  }
  
  async loadSubscriptions() {
    const subs = await this.adminService.getAllSubscriptions();
    this.subscriptions.set(subs);
    this.filterSubscriptions();
  }
  
  filterSubscriptions() {
    let result = this.subscriptions();
    
    if (this.statusFilter !== 'all') {
      result = result.filter(s => s.status === this.statusFilter);
    }
    
    this.filteredSubscriptions.set(result);
  }
  
  async extendSubscription(sub: Subscription) {
    if (confirm('Deseja estender a assinatura por mais 30 dias?')) {
      const success = await this.adminService.extendSubscription(sub.id, 30);
      if (success) {
        await this.loadSubscriptions();
      }
    }
  }
  
  async cancelSubscription(sub: Subscription) {
    if (confirm('Tem certeza que deseja cancelar esta assinatura?')) {
      const success = await this.adminService.cancelSubscription(sub.id);
      if (success) {
        await this.loadSubscriptions();
      }
    }
  }
  
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'active': 'bg-green-100 text-green-700',
      'trial': 'bg-blue-100 text-blue-700',
      'cancelled': 'bg-red-100 text-red-700',
      'expired': 'bg-gray-100 text-gray-700'
    };
    return classes[status] || 'bg-slate-100 text-slate-700';
  }
  
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': 'Ativa',
      'trial': 'Trial',
      'cancelled': 'Cancelada',
      'expired': 'Expirada'
    };
    return labels[status] || status;
  }
  
  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }
}
