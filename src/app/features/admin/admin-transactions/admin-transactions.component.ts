import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { GlobalTransaction } from '../../../core/models/admin.models';

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Transações Globais</h1>
          <p class="text-slate-500 mt-1">Visualize todas as transações do sistema</p>
        </div>
        <button (click)="loadTransactions()" 
                class="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
          <mat-icon>refresh</mat-icon>
          Atualizar
        </button>
      </div>
      
      <!-- Filtros -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
        <div class="flex gap-4">
          <div class="flex-1">
            <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="filterTransactions()"
                   placeholder="Buscar por descrição, usuário ou categoria..."
                   class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
          </div>
          <select [(ngModel)]="typeFilter" (ngModelChange)="filterTransactions()"
                  class="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
            <option value="all">Todos os Tipos</option>
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
            <option value="transfer">Transferência</option>
          </select>
          <select [(ngModel)]="statusFilter" (ngModelChange)="filterTransactions()"
                  class="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
            <option value="all">Todos os Status</option>
            <option value="confirmed">Confirmada</option>
            <option value="pending">Pendente</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
      </div>
      
      <!-- Lista de Transações -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table class="w-full">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Data</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Usuário</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Conta</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Descrição</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Categoria</th>
              <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Tipo</th>
              <th class="text-right px-6 py-4 text-xs font-bold text-slate-400 uppercase">Valor</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (tx of filteredTransactions(); track tx.id) {
              <tr class="hover:bg-slate-50">
                <td class="px-6 py-4 text-sm text-slate-500">
                  {{ formatDate(tx.date) }}
                </td>
                <td class="px-6 py-4 text-sm">
                  <div>
                    <p class="text-slate-900 font-medium">{{ tx.user_name || tx.user_email || tx.user_id }}</p>
                    <p class="text-slate-400 text-xs">{{ tx.user_email }}</p>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-600">
                  {{ tx.account_name || tx.account_id }}
                </td>
                <td class="px-6 py-4 text-sm text-slate-900">
                  {{ tx.description }}
                </td>
                <td class="px-6 py-4 text-sm text-slate-500">
                  {{ tx.category || '-' }}
                </td>
                <td class="px-6 py-4">
                  <span [class]="getTypeClass(tx.type)" class="px-3 py-1 rounded-full text-xs font-medium">
                    {{ getTypeLabel(tx.type) }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <span [class]="tx.type === 'income' ? 'text-emerald-600' : tx.type === 'expense' ? 'text-red-600' : 'text-blue-600'"
                        class="font-bold">
                    {{ tx.type === 'expense' ? '-' : '+' }}R$ {{ tx.amount.toFixed(2) }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="px-6 py-8 text-center text-slate-400">
                  Nenhuma transação encontrada
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class AdminTransactionsComponent implements OnInit {
  private adminService = inject(AdminService);
  
  transactions = signal<GlobalTransaction[]>([]);
  filteredTransactions = signal<GlobalTransaction[]>([]);
  
  searchQuery = '';
  typeFilter = 'all';
  statusFilter = 'all';
  
  async ngOnInit() {
    await this.loadTransactions();
  }
  
  async loadTransactions() {
    const txs = await this.adminService.getAllTransactions(200);
    this.transactions.set(txs);
    this.filterTransactions();
  }
  
  filterTransactions() {
    let result = this.transactions();
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(query) ||
        (t.user_name || '').toLowerCase().includes(query) ||
        (t.user_email || '').toLowerCase().includes(query) ||
        (t.category || '').toLowerCase().includes(query)
      );
    }
    
    if (this.typeFilter !== 'all') {
      result = result.filter(t => t.type === this.typeFilter);
    }
    
    if (this.statusFilter !== 'all') {
      result = result.filter(t => t.status === this.statusFilter);
    }
    
    this.filteredTransactions.set(result);
  }
  
  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'income': 'bg-emerald-100 text-emerald-700',
      'expense': 'bg-red-100 text-red-700',
      'transfer': 'bg-blue-100 text-blue-700'
    };
    return classes[type] || 'bg-slate-100 text-slate-700';
  }
  
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'income': 'Receita',
      'expense': 'Despesa',
      'transfer': 'Transferência'
    };
    return labels[type] || type;
  }
  
  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }
}
