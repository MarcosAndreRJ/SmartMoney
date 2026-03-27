import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PrivacyService } from '../../core/services/privacy.service';

@Component({
  selector: 'app-all-transfers',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Todas as Transações</h1>
          <p class="text-slate-500 mt-1">Histórico completo de movimentações financeiras.</p>
        </div>
        <button 
          (click)="back.emit()"
          class="px-6 py-3 border border-gray-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center gap-2">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div class="flex gap-2">
          @for (filter of filters; track filter) {
            <button 
              (click)="activeFilter.set(filter)"
              class="px-4 py-2 rounded-full text-sm font-bold transition-all"
              [class.bg-[#0B1120]]="activeFilter() === filter"
              [class.text-white]="activeFilter() === filter"
              [class.bg-slate-100]="activeFilter() !== filter"
              [class.text-slate-500]="activeFilter() !== filter">
              {{ filter }}
            </button>
          }
        </div>
        <div class="ml-auto flex gap-3">
          <input type="date" class="h-10 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-slate-400 transition-all">
          <input type="date" class="h-10 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:border-slate-400 transition-all">
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th class="px-6 py-4">Descrição</th>
                <th class="px-6 py-4">Categoria</th>
                <th class="px-6 py-4">Conta</th>
                <th class="px-6 py-4">Data</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              @for (tx of transactions; track tx.id) {
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center" [ngClass]="tx.iconBg">
                        <mat-icon class="text-lg" [ngClass]="tx.iconColor">{{ tx.icon }}</mat-icon>
                      </div>
                      <div>
                        <p class="font-bold text-slate-900 text-sm">{{ tx.description }}</p>
                        <p class="text-xs text-slate-400">{{ tx.recipient }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">{{ tx.category }}</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-500">{{ tx.account }}</td>
                  <td class="px-6 py-4 text-sm text-slate-500">{{ tx.date }}</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-medium"
                      [class.bg-emerald-50]="tx.status === 'Concluído'"
                      [class.text-emerald-600]="tx.status === 'Concluído'"
                      [class.bg-amber-50]="tx.status === 'Pendente'"
                      [class.text-amber-600]="tx.status === 'Pendente'">
                      {{ tx.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right font-bold"
                    [class.text-emerald-600]="tx.amount > 0"
                    [class.text-red-600]="tx.amount < 0">
                    @if (privacy.isPrivate()) {
                      R$ ****
                    } @else {
                      {{ (tx.amount > 0 ? '+' : '') + (tx.amount | currency:'BRL':'symbol':'1.2-2') }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AllTransfersComponent {
  privacy = inject(PrivacyService);
  back = output<void>();
  activeFilter = signal('Todas');

  filters = ['Todas', 'Receitas', 'Despesas', 'Transferências'];

  transactions = [
    { id: 1, description: 'Supermercado Extra', recipient: 'Alimentação', category: 'Alimentação', account: 'Conta Corrente', date: '24 Out, 2023', status: 'Concluído', amount: -450.20, icon: 'shopping_cart', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { id: 2, description: 'Salário', recipient: 'Empresa', category: 'Salário', account: 'Conta Corrente', date: '20 Out, 2023', status: 'Concluído', amount: 5400.00, icon: 'payments', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { id: 3, description: 'Netflix', recipient: 'Entretenimento', category: 'Lazer', account: 'Cartão Nubank', date: '18 Out, 2023', status: 'Pendente', amount: -45.90, icon: 'movie', iconBg: 'bg-red-50', iconColor: 'text-red-500' },
    { id: 4, description: 'Uber', recipient: 'Transporte', category: 'Transporte', account: 'Cartão Nubank', date: '17 Out, 2023', status: 'Concluído', amount: -24.50, icon: 'directions_car', iconBg: 'bg-blue-50', iconColor: 'text-blue-500' },
    { id: 5, description: 'Transferência PIX', recipient: 'João Silva', category: 'Transferência', account: 'Conta Corrente', date: '15 Out, 2023', status: 'Concluído', amount: -350.00, icon: 'send', iconBg: 'bg-slate-50', iconColor: 'text-slate-500' },
  ];
}
