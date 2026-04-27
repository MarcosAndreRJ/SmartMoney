import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService, SupabaseTransaction, SupabaseAccount } from '../../core/services/supabase.service';
import { TransactionFormComponent } from './transaction-form.component';
import * as XLSX from 'xlsx';

interface TransactionGroup {
  label: string;
  shortDate: string;
  transactions: SupabaseTransaction[];
  total: number;
}

type TxTypeFilter = 'all' | 'income' | 'expense' | 'transfer';

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, TransactionFormComponent],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 pb-20">

      <!-- Page Header -->
      <div class="flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Transações</h1>
          <p class="text-slate-500 mt-1 font-medium">Histórico completo de movimentações financeiras.</p>
        </div>
        <button 
          (click)="showTransactionForm.set(true)"
          class="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
          <mat-icon class="text-lg">add</mat-icon>
          Nova Transação
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
        <!-- Inflow -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-3">
            <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Receitas</p>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <mat-icon class="text-[18px]">trending_up</mat-icon>
            </div>
          </div>
          <p class="text-xl font-black text-emerald-600">R$ {{ totalIncome() | number:'1.2-2' }}</p>
          <p class="text-[10px] font-medium text-slate-400 mt-1">{{ incomeCount() }} entr. no período</p>
        </div>
        <!-- Outflow -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-3">
            <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Despesas</p>
            <div class="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
              <mat-icon class="text-[18px]">trending_down</mat-icon>
            </div>
          </div>
          <p class="text-xl font-black text-red-600">R$ {{ totalExpenses() | number:'1.2-2' }}</p>
          <p class="text-[10px] font-medium text-slate-400 mt-1">{{ expenseCount() }} saídas no período</p>
        </div>
        <!-- Transfers -->
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-3">
            <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Transferências</p>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
              <mat-icon class="text-[18px]">sync_alt</mat-icon>
            </div>
          </div>
          <p class="text-xl font-black text-blue-600">R$ {{ totalTransfers() | number:'1.2-2' }}</p>
          <p class="text-[10px] font-medium text-slate-400 mt-1">{{ transferCount() }} transferências</p>
        </div>
        <!-- Balance -->
        <div class="bg-[#0F172A] rounded-2xl p-5 shadow-xl shadow-slate-200">
          <div class="flex justify-between items-start mb-3">
            <p class="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Saldo Líquido</p>
            <div class="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center">
              <mat-icon class="text-[18px]">account_balance_wallet</mat-icon>
            </div>
          </div>
          <p class="text-xl font-black" [class.text-white]="netBalance() >= 0" [class.text-red-400]="netBalance() < 0">
            R$ {{ netBalance() | number:'1.2-2' }}
          </p>
          <div class="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
            <div class="h-full rounded-full bg-emerald-400 transition-all" [style.width]="netBarWidth() + '%'"></div>
          </div>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-4">
        
        <!-- Top Row: Search, Status, Export -->
        <div class="flex flex-col md:flex-row gap-3 items-center w-full">
          <!-- Search -->
          <div class="relative flex-1 w-full md:max-w-md">
            <mat-icon class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
            <input 
              type="text" 
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Buscar por descrição ou categoria..."
              class="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all">
          </div>

          <!-- Status Filters (Pills) -->
          @if (dateRange() !== 0) {
            <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto">
              <button (click)="setStatus('all')" class="h-8 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
                [class.bg-white]="statusFilter() === 'all'" [class.shadow-sm]="statusFilter() === 'all'" [class.text-slate-800]="statusFilter() === 'all'" [class.border]="statusFilter() === 'all'" [class.border-slate-200]="statusFilter() === 'all'"
                [class.text-slate-500]="statusFilter() !== 'all'" [class.hover:text-slate-700]="statusFilter() !== 'all'">Todos</button>
              <button (click)="setStatus('confirmed')" class="h-8 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
                [class.bg-white]="statusFilter() === 'confirmed'" [class.shadow-sm]="statusFilter() === 'confirmed'" [class.text-slate-800]="statusFilter() === 'confirmed'" [class.border]="statusFilter() === 'confirmed'" [class.border-slate-200]="statusFilter() === 'confirmed'"
                [class.text-slate-500]="statusFilter() !== 'confirmed'" [class.hover:text-slate-700]="statusFilter() !== 'confirmed'">Confirmado</button>
              <button (click)="setStatus('pending')" class="h-8 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
                [class.bg-white]="statusFilter() === 'pending'" [class.shadow-sm]="statusFilter() === 'pending'" [class.text-slate-800]="statusFilter() === 'pending'" [class.border]="statusFilter() === 'pending'" [class.border-slate-200]="statusFilter() === 'pending'"
                [class.text-slate-500]="statusFilter() !== 'pending'" [class.hover:text-slate-700]="statusFilter() !== 'pending'">Pendente</button>
              <button (click)="setStatus('cancelled')" class="h-8 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
                [class.bg-white]="statusFilter() === 'cancelled'" [class.shadow-sm]="statusFilter() === 'cancelled'" [class.text-slate-800]="statusFilter() === 'cancelled'" [class.border]="statusFilter() === 'cancelled'" [class.border-slate-200]="statusFilter() === 'cancelled'"
                [class.text-slate-500]="statusFilter() !== 'cancelled'" [class.hover:text-slate-700]="statusFilter() !== 'cancelled'">Cancelado</button>
            </div>
          } @else {
            <!-- Custom Filter Summary -->
            <div class="flex flex-wrap items-center gap-2">
              @for (badge of customFilterBadges(); track badge) {
                <div class="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2 group">
                  <span class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{{ badge }}</span>
                </div>
              }
              <button (click)="clearCustomFilters()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>
          }

          <div class="flex-1 hidden md:block"></div>

          <!-- Export -->
          <button (click)="showExportModal.set(true)" class="h-11 px-4 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap w-full md:w-auto justify-center">
            <mat-icon class="text-[18px] text-slate-400">download</mat-icon>
            Exportar
          </button>
        </div>

        <!-- Bottom Row: Period, Type, Count -->
        <div class="flex flex-col md:flex-row items-center justify-between pt-3 border-t border-slate-100 gap-4">
          <div class="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <!-- Period Filters -->
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Período:</span>
              <button (click)="setRange(-1)" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="dateRange() === -1" [class.bg-slate-100]="dateRange() === -1" [class.px-3]="dateRange() === -1" [class.py-1.5]="dateRange() === -1" [class.rounded-lg]="dateRange() === -1"
                [class.text-slate-500]="dateRange() !== -1" [class.hover:text-slate-800]="dateRange() !== -1">Todos</button>
              <button (click)="setRange(30)" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="dateRange() === 30" [class.bg-slate-100]="dateRange() === 30" [class.px-3]="dateRange() === 30" [class.py-1.5]="dateRange() === 30" [class.rounded-lg]="dateRange() === 30"
                [class.text-slate-500]="dateRange() !== 30" [class.hover:text-slate-800]="dateRange() !== 30">30 dias</button>
              <button (click)="setRange(7)" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="dateRange() === 7" [class.bg-slate-100]="dateRange() === 7" [class.px-3]="dateRange() === 7" [class.py-1.5]="dateRange() === 7" [class.rounded-lg]="dateRange() === 7"
                [class.text-slate-500]="dateRange() !== 7" [class.hover:text-slate-800]="dateRange() !== 7">7 dias</button>
              <button (click)="setRange(-2)" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="dateRange() === -2" [class.bg-slate-100]="dateRange() === -2" [class.px-3]="dateRange() === -2" [class.py-1.5]="dateRange() === -2" [class.rounded-lg]="dateRange() === -2"
                [class.text-slate-500]="dateRange() !== -2" [class.hover:text-slate-800]="dateRange() !== -2">Por Mês</button>
              <button (click)="openCustomFilterModal()" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="dateRange() === 0" [class.bg-slate-100]="dateRange() === 0" [class.px-3]="dateRange() === 0" [class.py-1.5]="dateRange() === 0" [class.rounded-lg]="dateRange() === 0"
                [class.text-slate-500]="dateRange() !== 0" [class.hover:text-slate-800]="dateRange() !== 0">Personalizado</button>
            </div>

            @if (dateRange() === -2) {
              <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 animate-in slide-in-from-left duration-300">
                <button (click)="prevMonth()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all">
                  <mat-icon class="text-lg">chevron_left</mat-icon>
                </button>
                <span class="text-[10px] font-black text-slate-700 uppercase tracking-widest min-w-[100px] text-center">
                  {{ getMonthYearLabel() }}
                </span>
                <button (click)="nextMonth()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all">
                  <mat-icon class="text-lg">chevron_right</mat-icon>
                </button>
              </div>
            }

            <div class="hidden md:block w-px h-4 bg-slate-200"></div>

            <!-- Type Filters -->
            @if (dateRange() !== 0) {
              <div class="flex items-center gap-3">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Tipo:</span>
                <button (click)="setType('all')" class="text-xs font-bold transition-colors"
                  [class.text-slate-800]="typeFilter() === 'all'" [class.bg-slate-100]="typeFilter() === 'all'" [class.px-3]="typeFilter() === 'all'" [class.py-1.5]="typeFilter() === 'all'" [class.rounded-lg]="typeFilter() === 'all'"
                  [class.text-slate-500]="typeFilter() !== 'all'" [class.hover:text-slate-800]="typeFilter() !== 'all'">Todos</button>
                <button (click)="setType('income')" class="text-xs font-bold transition-colors"
                  [class.text-slate-800]="typeFilter() === 'income'" [class.bg-slate-100]="typeFilter() === 'income'" [class.px-3]="typeFilter() === 'income'" [class.py-1.5]="typeFilter() === 'income'" [class.rounded-lg]="typeFilter() === 'income'"
                  [class.text-slate-500]="typeFilter() !== 'income'" [class.hover:text-slate-800]="typeFilter() !== 'income'">Receitas</button>
                <button (click)="setType('expense')" class="text-xs font-bold transition-colors"
                  [class.text-slate-800]="typeFilter() === 'expense'" [class.bg-slate-100]="typeFilter() === 'expense'" [class.px-3]="typeFilter() === 'expense'" [class.py-1.5]="typeFilter() === 'expense'" [class.rounded-lg]="typeFilter() === 'expense'"
                  [class.text-slate-500]="typeFilter() !== 'expense'" [class.hover:text-slate-800]="typeFilter() !== 'expense'">Despesas</button>
              </div>
            }
          </div>

          <!-- Results count and Sort -->
          <div class="flex items-center gap-4">
            <button (click)="toggleSort()" class="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 text-slate-500 transition-all border border-transparent hover:border-slate-200 group">
              <mat-icon class="text-[16px] transition-transform" [class.rotate-180]="sortOrder() === 'asc'">sort</mat-icon>
              <span class="text-[10px] font-black uppercase tracking-widest">{{ sortOrder() === 'desc' ? 'Mais Recentes' : 'Mais Antigas' }}</span>
            </button>
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ filteredTransactions().length }} resultado{{ filteredTransactions().length !== 1 ? 's' : '' }} encontrado{{ filteredTransactions().length !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="flex items-center justify-center h-48 text-slate-400">
          <mat-icon class="animate-spin mr-3 text-3xl">refresh</mat-icon>
          <span class="font-medium">Carregando transações...</span>
        </div>
      } @else if (groupedTransactions().length === 0) {
        <div class="flex flex-col items-center justify-center h-56 gap-3 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <mat-icon class="text-[56px]">receipt_long</mat-icon>
          <p class="font-bold text-lg">Nenhuma transação encontrada</p>
          <p class="text-sm">Tente ajustar os filtros ou adicione uma nova transação.</p>
        </div>
      } @else {
        <div class="space-y-8">
          @for (group of groupedTransactions(); track group.label) {
            <div>
              <div class="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
                <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{{ group.label }}</h3>
                <span class="text-[11px] font-bold"
                  [class.text-emerald-600]="group.total > 0"
                  [class.text-red-600]="group.total < 0"
                  [class.text-slate-400]="group.total === 0">
                  Total: {{ group.total > 0 ? '+' : '' }}R$ {{ (group.total < 0 ? -group.total : group.total) | number:'1.2-2' }}
                </span>
              </div>
              <div class="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-gray-50">
                @for (tx of group.transactions; track tx.id) {
                  <div class="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div class="flex items-center gap-4">
                      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" [ngClass]="getTxIcon(tx).bg">
                        <mat-icon [ngClass]="getTxIcon(tx).color">{{ getTxIcon(tx).icon }}</mat-icon>
                      </div>
                      <div>
                        <p class="text-sm font-bold text-slate-900">{{ tx.description }}</p>
                        <p class="text-xs text-slate-500 mt-0.5 font-medium">
                          {{ tx.category || tx.type }}
                          @if (getAccountName(tx.account_id)) {
                            <span class="text-slate-300 mx-1">•</span>{{ getAccountName(tx.account_id) }}
                          }
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-4">
                      <div class="text-right flex flex-col items-end">
                        <p class="text-sm font-bold"
                          [class.text-red-600]="tx.type === 'expense'"
                          [class.text-emerald-600]="tx.type === 'income'"
                          [class.text-blue-600]="tx.type === 'transfer'">
                          {{ tx.type === 'expense' ? '- ' : '+ ' }}R$ {{ tx.amount | number:'1.2-2' }}
                        </p>
                        @if (tx.status === 'pending') {
                          <button (click)="openPaymentModal(tx); $event.stopPropagation()" class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5 inline-block bg-amber-50 text-amber-500 hover:bg-amber-100 transition-colors border-none cursor-pointer text-left">
                            Pendente - Confirmar Pagamento
                          </button>
                        } @else if (tx.status === 'cancelled') {
                          <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5 inline-block bg-slate-100 text-slate-500">
                            Cancelado
                          </span>
                        } @else {
                          <span class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5 inline-block bg-emerald-50 text-emerald-500">
                            Confirmado
                          </span>
                        }
                      </div>

                      <!-- Ellipsis Menu Button -->
                      <button (click)="openActionModal(tx); $event.stopPropagation()" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
                        <mat-icon class="text-[20px]">more_vert</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Payment Modal (Editar Lançamento) -->
      @if (showPaymentModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div class="bg-white rounded-[24px] w-full max-w-[420px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <!-- Modal Header -->
            <div class="p-6 pb-4 relative">
              <h2 class="text-xl font-black text-slate-800">Editar Lançamento</h2>
              <p class="text-xs font-medium text-slate-500 mt-1">Atualize os detalhes da sua transação</p>
              
              <button (click)="closePaymentModal()" class="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
                <mat-icon class="text-[20px]">close</mat-icon>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="px-6 py-2 space-y-5">
              <!-- Value Field -->
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor (R$)</label>
                <div class="relative group bg-slate-50 rounded-2xl p-4 flex items-center">
                  <span class="text-slate-400 font-bold text-sm mr-2">R$</span>
                  <input type="number" [(ngModel)]="paymentData.amount"
                    class="w-full bg-transparent text-2xl font-black focus:outline-none"
                    [class.text-red-500]="selectedTx()?.type === 'expense'"
                    [class.text-emerald-500]="selectedTx()?.type === 'income'"
                    [class.text-blue-500]="selectedTx()?.type === 'transfer'">
                </div>
              </div>

              <!-- Date and Account Fields -->
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data do Pagamento</label>
                  <div class="relative">
                    <input type="date" [(ngModel)]="paymentData.date"
                      class="w-full h-11 px-4 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 transition-all">
                  </div>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta</label>
                  <select [(ngModel)]="paymentData.account_id"
                    class="w-full h-11 px-4 bg-slate-50 border-0 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 transition-all appearance-none cursor-pointer">
                    @for (acc of accounts(); track acc.id) {
                      <option [value]="acc.id">{{ acc.institution_name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Category -->
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                <div class="flex items-center justify-between w-full h-12 px-4 bg-slate-50 rounded-xl">
                  <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-md flex items-center justify-center" [ngClass]="getTxIcon(selectedTx()!).bg">
                      <mat-icon class="text-[14px]" [ngClass]="getTxIcon(selectedTx()!).color">{{ getTxIcon(selectedTx()!).icon }}</mat-icon>
                    </div>
                    <span class="text-sm font-bold text-slate-700 capitalize">
                      {{ selectedTx()?.category || selectedTx()?.type }}
                    </span>
                  </div>
                  <mat-icon class="text-[16px] text-slate-400">edit</mat-icon>
                </div>
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="p-6 flex items-center gap-3 mt-2">
              <button (click)="closePaymentModal()" 
                class="flex-1 h-12 bg-slate-100/80 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button (click)="confirmPayment()" 
                [disabled]="isSaving()"
                class="flex-[1.5] h-12 bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-200 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                @if (isSaving()) {
                  <mat-icon class="animate-spin text-sm">refresh</mat-icon>
                } @else {
                  Salvar Alterações
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Action Modal -->
      @if (showActionModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <!-- Modal Header -->
            <div class="p-6 pb-4 border-b border-slate-50 relative flex items-center justify-between">
              <h2 class="text-lg font-black text-slate-800">Ações da Transação</h2>
              <button (click)="closeActionModal()" class="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center">
                <mat-icon class="text-lg">close</mat-icon>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="p-6 space-y-6">

              <!-- Excluir Action -->
              <button (click)="openDeleteModal(actionModalTx()!)" class="w-full text-left group flex items-start gap-4">
                <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                  <mat-icon class="text-[20px]">delete_outline</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-red-600">Excluir Transação</h3>
                  <p class="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-0.5">Esta ação não pode ser desfeita</p>
                </div>
              </button>

              <div class="w-full h-px bg-slate-100"></div>

              <!-- Alterar Status -->
              <div>
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <mat-icon class="text-[14px]">sync</mat-icon>
                  Alterar Status
                </h3>
                <div class="space-y-3">
                  <button (click)="updateTransactionStatus('pending')" class="w-full flex items-center gap-3 text-left">
                    <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
                      <mat-icon class="text-[16px]">schedule</mat-icon>
                    </div>
                    <span class="text-sm font-bold text-slate-700">Pendente</span>
                  </button>

                  <button (click)="updateTransactionStatus('cancelled')" class="w-full flex items-center gap-3 text-left">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200">
                      <mat-icon class="text-[16px]">cancel</mat-icon>
                    </div>
                    <span class="text-sm font-bold text-slate-700">Cancelado</span>
                  </button>

                  <button (click)="updateTransactionStatus('confirmed')" class="w-full flex items-center gap-3 text-left">
                    <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100">
                      <mat-icon class="text-[16px]">check_circle</mat-icon>
                    </div>
                    <span class="text-sm font-bold text-slate-700">Confirmado</span>
                  </button>
                </div>
              </div>

            </div>
            
            <div class="p-4 pt-0">
              <button (click)="closeActionModal()" class="w-full h-12 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">
                VOLTAR
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 p-8 text-center relative">
            
            <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <mat-icon class="text-3xl">warning_amber</mat-icon>
            </div>
            
            <h2 class="text-xl font-black text-slate-800 mb-3">Confirmar Exclusão</h2>
            <p class="text-sm font-medium text-slate-500 leading-relaxed mb-8">
              Você tem certeza que deseja prosseguir? Esta ação é <strong class="text-red-500 font-bold">irreversível</strong> e todos os dados selecionados serão perdidos permanentemente de nossos servidores.
            </p>

            <div class="flex items-center gap-3">
              <button (click)="closeDeleteModal()" class="flex-1 h-11 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button (click)="confirmDelete()" [disabled]="isSaving()" class="flex-1 h-11 bg-[#E11D48] hover:bg-red-700 disabled:bg-slate-200 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors">
                @if (isSaving()) {
                  <mat-icon class="animate-spin text-sm">refresh</mat-icon>
                } @else {
                  Sim, Excluir
                }
              </button>
            </div>

          </div>
        </div>
      }

      <!-- Custom Filter Modal -->
      @if (showCustomFilterModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div class="bg-white rounded-[24px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div class="flex items-center gap-3">
                 <mat-icon class="text-emerald-500">filter_list</mat-icon>
                 <h2 class="text-lg font-black text-slate-800">Filtro Personalizado</h2>
              </div>
              <button (click)="closeCustomFilterModal()" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <mat-icon class="text-xl">close</mat-icon>
              </button>
            </div>
            
            <!-- Body -->
            <div class="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
               
               <!-- Date Range -->
               <div class="space-y-3">
                 <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Intervalo de Datas</h3>
                 <div class="grid grid-cols-2 gap-4">
                   <div>
                      <label class="block text-[11px] font-semibold text-slate-500 mb-1.5">Data de Início</label>
                      <div class="relative">
                        <input type="date" [ngModel]="customStartDate()" (ngModelChange)="customStartDate.set($event)"
                         class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 ring-emerald-500/10 transition-all [&::-webkit-calendar-picker-indicator]:opacity-50">
                      </div>
                   </div>
                   <div>
                      <label class="block text-[11px] font-semibold text-slate-500 mb-1.5">Data de Término</label>
                      <div class="relative">
                        <input type="date" [ngModel]="customEndDate()" (ngModelChange)="customEndDate.set($event)"
                         class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 ring-emerald-500/10 transition-all [&::-webkit-calendar-picker-indicator]:opacity-50">
                      </div>
                   </div>
                 </div>
               </div>

               <!-- Tx Types (Checkboxes) -->
               <div class="space-y-3">
                 <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Tipo de Transação</h3>
                 <div class="grid grid-cols-2 gap-3">
                     <label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                       <span class="text-sm font-medium text-slate-700">Receitas</span>
                       <input type="checkbox" [checked]="customTypes().income" (change)="toggleCustomType('income')" class="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500">
                     </label>
                     <label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                       <span class="text-sm font-medium text-slate-700">Despesas</span>
                       <input type="checkbox" [checked]="customTypes().expense" (change)="toggleCustomType('expense')" class="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500">
                     </label>
                     <label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                       <span class="text-sm font-medium text-slate-700">Transferências</span>
                       <input type="checkbox" [checked]="customTypes().transfer" (change)="toggleCustomType('transfer')" class="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500">
                     </label>
                     <label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                       <span class="text-sm font-medium text-slate-700">Aporte de Metas</span>
                       <input type="checkbox" [checked]="customTypes().goal" (change)="toggleCustomType('goal')" class="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500">
                     </label>
                     <label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors col-span-2 sm:col-span-1">
                       <span class="text-sm font-medium text-slate-700">Investimentos</span>
                       <input type="checkbox" [checked]="customTypes().investment" (change)="toggleCustomType('investment')" class="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500">
                     </label>
                 </div>
               </div>

               <!-- Stats Pills -->
               <div class="space-y-3">
                 <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Filtro por Status</h3>
                 <div class="flex gap-2">
                   <button (click)="toggleCustomStatus('confirmed')" 
                     class="flex-1 h-10 rounded-xl text-xs font-bold border transition-all"
                     [ngClass]="customStatuses().confirmed ? 'border-orange-500 text-orange-600 bg-orange-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'">
                     Confirmado
                   </button>
                   <button (click)="toggleCustomStatus('pending')" 
                     class="flex-1 h-10 rounded-xl text-xs font-bold border transition-all"
                     [ngClass]="customStatuses().pending ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'">
                     Pendente
                   </button>
                   <button (click)="toggleCustomStatus('cancelled')" 
                     class="flex-1 h-10 rounded-xl text-xs font-bold border transition-all"
                     [ngClass]="customStatuses().cancelled ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'">
                     Cancelado
                   </button>
                 </div>
               </div>
               
            </div>

            <!-- Footer -->
            <div class="p-6 border-t border-slate-100 shrink-0 grid grid-cols-2 gap-4">
              <button (click)="clearCustomFilters()" class="h-12 w-full bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">
                Limpar Filtros
              </button>
              <button (click)="applyCustomFilters()" class="h-12 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors">
                <mat-icon class="text-sm">check_circle</mat-icon> Aplicar Filtro
              </button>
            </div>
            
          </div>
        </div>
      }

      <!-- Export Modal -->
      @if (showExportModal()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div class="bg-white rounded-[24px] w-full max-w-[400px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <!-- Modal Header -->
            <div class="p-6 pb-4 relative">
              <h2 class="text-xl font-black text-slate-800">Exportar Transações</h2>
              <p class="text-xs font-medium text-slate-500 mt-1">Escolha o formato do arquivo para download</p>
              
              <button (click)="showExportModal.set(false)" class="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
                <mat-icon class="text-[20px]">close</mat-icon>
              </button>
            </div>

            <!-- Modal Content -->
            <div class="px-6 py-4 space-y-4">
              <!-- Format Selection -->
              <div class="grid grid-cols-1 gap-3">
                <button 
                  (click)="exportFormat.set('csv')"
                  [class.border-emerald-500]="exportFormat() === 'csv'"
                  [class.bg-emerald-50]="exportFormat() === 'csv'"
                  class="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 transition-all text-left group">
                  <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <mat-icon>description</mat-icon>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-bold text-slate-800">CSV (Padrão)</p>
                    <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Separado por ponto e vírgula</p>
                  </div>
                  @if (exportFormat() === 'csv') {
                    <mat-icon class="text-emerald-500">check_circle</mat-icon>
                  }
                </button>

                <button 
                  (click)="exportFormat.set('xlsx')"
                  [class.border-emerald-500]="exportFormat() === 'xlsx'"
                  [class.bg-emerald-50]="exportFormat() === 'xlsx'"
                  class="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 transition-all text-left group">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <mat-icon>table_view</mat-icon>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-bold text-slate-800">Excel (XLSX)</p>
                    <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Planilha formatada para Excel</p>
                  </div>
                  @if (exportFormat() === 'xlsx') {
                    <mat-icon class="text-emerald-500">check_circle</mat-icon>
                  }
                </button>
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="p-6 flex items-center gap-3">
              <button (click)="showExportModal.set(false)" 
                class="flex-1 h-12 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button (click)="executeExport()" 
                class="flex-[1.5] h-12 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
                <mat-icon class="text-lg">download</mat-icon>
                Baixar Arquivo
              </button>
            </div>
          </div>
        </div>
      }

      <!-- New Transaction Form Sidebar -->
      @if (showTransactionForm()) {
        <app-transaction-form 
          (formClose)="showTransactionForm.set(false)"
          (formSave)="onTransactionSaved()">
        </app-transaction-form>
      }
    </div>
  `
})
export class TransactionsPageComponent implements OnInit {
  private supabase = inject(SupabaseService);

  isLoading = signal(true);
  allTransactions = signal<SupabaseTransaction[]>([]);
  accounts = signal<SupabaseAccount[]>([]);

  // All filters as Signals for proper computed reactivity
  searchQuery = signal('');
  dateRange = signal<number>(-1); // -1 = 'Todos', 30, 7, 0 = 'Personalizado'
  typeFilter = signal<TxTypeFilter>('all');
  statusFilter = signal<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  currentMonthNav = signal<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Modal State
  showCustomFilterModal = signal(false);
  showTransactionForm = signal(false);
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');
  customTypes = signal({ income: false, expense: false, transfer: false, goal: false, investment: false });
  customStatuses = signal({ confirmed: false, pending: false, cancelled: false });
  appliedCustomFilters = signal<any>(null);

  // Export Modal State
  showExportModal = signal(false);
  exportFormat = signal<'csv' | 'xlsx'>('csv');

  customFilterBadges = computed(() => {
    const custom = this.appliedCustomFilters();
    if (!custom) return [];
    
    const badges: string[] = [];
    if (custom.startDate || custom.endDate) {
      const txToLocal = (dStr: string) => {
        const parts = dStr.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      };
      if (custom.startDate && custom.endDate) badges.push(`${txToLocal(custom.startDate)} - ${txToLocal(custom.endDate)}`);
      else if (custom.startDate) badges.push(`Desde ${txToLocal(custom.startDate)}`);
      else if (custom.endDate) badges.push(`Até ${txToLocal(custom.endDate)}`);
    }

    const types = [];
    if (custom.types.income) types.push('Receitas');
    if (custom.types.expense) types.push('Despesas');
    if (custom.types.transfer) types.push('Transf.');
    if (custom.types.goal) types.push('Metas');
    if (custom.types.investment) types.push('Invest.');
    if (types.length > 0) badges.push(types.join(', '));

    const statuses = [];
    if (custom.statuses.confirmed) statuses.push('Confirmado');
    if (custom.statuses.pending) statuses.push('Pendente');
    if (custom.statuses.cancelled) statuses.push('Cancelado');
    if (statuses.length > 0) badges.push(statuses.join(', '));

    return badges;
  });

  filteredTransactions = computed(() => {
    const all = this.allTransactions();
    const query = this.searchQuery().toLowerCase().trim();
    const range = this.dateRange();
    const type = this.typeFilter();
    const status = this.statusFilter();
    const custom = this.appliedCustomFilters();

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let cutoff: Date | null = null;
    let endCutoff: Date | null = today; // Default to today to prevent showing future stuff by default

    if (range > 0) {
      // range = 7 -> Today + 6 previous days
      cutoff = new Date(today.getTime() - (range - 1) * 24 * 60 * 60 * 1000);
      cutoff.setHours(0, 0, 0, 0);
    } else if (range === -1) {
      // 'Todos' - no limits
      cutoff = null;
      endCutoff = null;
    } else if (range === -2) {
      // 'Por Mês' - filter by selected month/year
      const nav = this.currentMonthNav();
      const targetMonth = nav.getMonth();
      const targetYear = nav.getFullYear();
      
      return all.filter(tx => {
        // Search
        const matchesQuery = !query
          || tx.description.toLowerCase().includes(query)
          || (tx.category || '').toLowerCase().includes(query);
        if (!matchesQuery) return false;

        const txDateStr = (tx.date || '').split('T')[0];
        const txDate = new Date(txDateStr + 'T12:00:00');
        
        const matchesMonth = txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear;
        const matchesType = type === 'all' || tx.type === type;
        const matchesStatus = status === 'all' || tx.status === status;
        
        return matchesMonth && matchesType && matchesStatus;
      });
    }

    return all.filter(tx => {
      // Search
      const matchesQuery = !query
        || tx.description.toLowerCase().includes(query)
        || (tx.category || '').toLowerCase().includes(query);
      if (!matchesQuery) return false;

      const txDateStr = (tx.date || '').split('T')[0];
      const txDate = new Date(txDateStr + 'T12:00:00');

      if (range === 0 && custom) {
        // Custom logic
        if (custom.startDate) {
          const sd = new Date(custom.startDate + 'T00:00:00');
          if (txDate < sd) return false;
        }
        if (custom.endDate) {
          const ed = new Date(custom.endDate + 'T23:59:59');
          if (txDate > ed) return false;
        }

        const hsObj = custom.statuses;
        const hasCustomStatus = hsObj.confirmed || hsObj.pending || hsObj.cancelled;
        if (hasCustomStatus) {
           if (!hsObj[tx.status]) return false;
        }

        const htObj = custom.types;
        const hasCustomTypes = htObj.income || htObj.expense || htObj.transfer || htObj.goal || htObj.investment;
        if (hasCustomTypes) {
           const t = tx.type;
           const cat = (tx.category || '').toLowerCase();
           let matchesType = false;
           if (t === 'income' && htObj.income) matchesType = true;
           if (t === 'expense' && htObj.expense) matchesType = true;
           if (t === 'transfer' && htObj.transfer) matchesType = true;
           if (cat.includes('meta') && htObj.goal) matchesType = true;
           if (cat.includes('invest') && htObj.investment) matchesType = true;
           
           if (!matchesType) return false;
        }

        return true;
      } else {
        // Standard quick filters logic
        const matchesLower = !cutoff || txDate >= cutoff;
        const matchesUpper = !endCutoff || txDate <= endCutoff;
        const matchesType = type === 'all' || tx.type === type;
        const matchesStatus = status === 'all' || tx.status === status;
        
        return matchesLower && matchesUpper && matchesType && matchesStatus;
      }
    });
  });

  groupedTransactions = computed<TransactionGroup[]>(() => {
    const txs = this.filteredTransactions();
    const groups = new Map<string, SupabaseTransaction[]>();
    for (const tx of txs) {
      const key = (tx.date || '').split('T')[0];
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }
    
    const sort = this.sortOrder();
    
    return Array.from(groups.entries())
      .sort((a, b) => sort === 'desc' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]))
      .map(([key, txList]) => {
        const date = new Date(key + 'T12:00:00');
        const total = txList.reduce((sum, t) => t.type === 'expense' ? sum - t.amount : sum + t.amount, 0);
        return { label: this.formatDateLabel(date), shortDate: key, transactions: txList, total };
      });
  });

  totalIncome = computed(() => this.filteredTransactions().filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0));
  totalExpenses = computed(() => this.filteredTransactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0));
  totalTransfers = computed(() => this.filteredTransactions().filter(t => t.type === 'transfer').reduce((s, t) => s + t.amount, 0));
  netBalance = computed(() => this.totalIncome() - this.totalExpenses());
  netBarWidth = computed(() => {
    const inc = this.totalIncome();
    return inc <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((this.netBalance() / inc) * 100)));
  });
  incomeCount = computed(() => this.filteredTransactions().filter(t => t.type === 'income').length);
  expenseCount = computed(() => this.filteredTransactions().filter(t => t.type === 'expense').length);
  transferCount = computed(() => this.filteredTransactions().filter(t => t.type === 'transfer').length);

  private accountMap = computed(() => {
    const map = new Map<string, string>();
    for (const acc of this.accounts()) map.set(acc.id, acc.institution_name);
    return map;
  });

  async ngOnInit() {
    await Promise.all([this.loadTransactions(), this.loadAccounts()]);
  }

  private async loadTransactions() {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.getTransactions();
      if (data && !error) this.allTransactions.set(data as SupabaseTransaction[]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadAccounts() {
    const { data } = await this.supabase.getAccounts();
    if (data) this.accounts.set(data as SupabaseAccount[]);
  }

  async onTransactionSaved() {
    await this.loadTransactions();
    // Also refresh accounts in case balance changed
    await this.loadAccounts();
  }

  // ── Payment Modal Logic ───────────────────────────────────────────────────

  showPaymentModal = signal(false);
  isSaving = signal(false);
  selectedTx = signal<SupabaseTransaction | null>(null);
  paymentData = {
    amount: 0,
    date: '',
    account_id: ''
  };

  openPaymentModal(tx: SupabaseTransaction) {
    this.selectedTx.set(tx);
    this.paymentData = {
      amount: tx.amount,
      date: (tx.date || '').split('T')[0],
      account_id: tx.account_id
    };
    this.showPaymentModal.set(true);
  }

  closePaymentModal() {
    this.showPaymentModal.set(false);
    this.selectedTx.set(null);
  }

  async confirmPayment() {
    const tx = this.selectedTx();
    if (!tx || this.isSaving()) return;

    this.isSaving.set(true);
    try {
      // 1. Calculate balance impact
      // Since it's moving from pending/cancelled to confirmed, we apply the impact
      const delta = tx.type === 'income' ? this.paymentData.amount : -this.paymentData.amount;
      await this.updateAccountBalanceExplicitly(this.paymentData.account_id, delta);

      // 2. Update transaction status and data
      const { error: updateError } = await this.supabase.client
        .from('transactions')
        .update({
          status: 'confirmed',
          amount: this.paymentData.amount,
          date: this.paymentData.date,
          account_id: this.paymentData.account_id
        })
        .eq('id', tx.id);

      if (updateError) throw updateError;

      // 3. SE a transação estiver vinculada a um empréstimo, atualiza o contrato
      if (tx.loan_id) {
        await this.syncLoanData(tx.loan_id);
      }

      // 4. Refresh data
      await this.loadTransactions();
      this.closePaymentModal();
    } catch (err) {
      console.error('Error confirming payment:', err);
      alert('Erro ao confirmar pagamento. Tente novamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async updateAccountBalanceExplicitly(accountId: string, delta: number) {
    const account = this.accounts().find(a => a.id === accountId);
    if (!account) return;
    
    const newBalance = parseFloat((account.initial_balance + delta).toFixed(2));
    await this.supabase.updateAccount(accountId, { initial_balance: newBalance });
    await this.loadAccounts(); // Refresh local accounts signal
  }

  // ── Action Modal Logic ────────────────────────────────────────────────────

  showActionModal = signal(false);
  actionModalTx = signal<SupabaseTransaction | null>(null);

  openActionModal(tx: SupabaseTransaction) {
    this.actionModalTx.set(tx);
    this.showActionModal.set(true);
  }

  closeActionModal() {
    this.showActionModal.set(false);
    this.actionModalTx.set(null);
  }

  async updateTransactionStatus(newStatus: 'confirmed' | 'pending' | 'cancelled') {
    const tx = this.actionModalTx();
    if (!tx || this.isSaving()) return;

    this.isSaving.set(true);
    try {
      // 1. Handle Balance Impact Transitions
      if (tx.status === 'confirmed' && newStatus !== 'confirmed') {
        // Revert impact: confirmed -> pending/cancelled
        const delta = tx.type === 'income' ? -tx.amount : tx.amount;
        await this.updateAccountBalanceExplicitly(tx.account_id, delta);
      } else if (tx.status !== 'confirmed' && newStatus === 'confirmed') {
        // Apply impact: pending/cancelled -> confirmed
        const delta = tx.type === 'income' ? tx.amount : -tx.amount;
        await this.updateAccountBalanceExplicitly(tx.account_id, delta);
      }

      // 2. Update Status
      const { error: updateError } = await this.supabase.client
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', tx.id);

      if (updateError) throw updateError;

      // 3. Sincronizar com Empréstimo se houver vínculo
      if (tx.loan_id) {
        await this.syncLoanData(tx.loan_id);
      }

      await this.loadTransactions();
      this.closeActionModal();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Erro ao atualizar o status da transação. Tente novamente.');
    } finally {
      this.isSaving.set(false);
    }
  }

  // ── Delete Confirmation Modal Logic ───────────────────────────────────────

  showDeleteModal = signal(false);
  deleteModalTx = signal<SupabaseTransaction | null>(null);

  openDeleteModal(tx: SupabaseTransaction) {
    this.deleteModalTx.set({ ...tx });
    // If it was called from action modal, let's close it
    this.showActionModal.set(false);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deleteModalTx.set(null);
  }

  async confirmDelete() {
    const tx = this.deleteModalTx();
    if (!tx || this.isSaving()) return;

    this.isSaving.set(true);
    try {
      // 1. Revert Balance Impact if it was confirmed
      if (tx.status === 'confirmed') {
        const delta = tx.type === 'income' ? -tx.amount : tx.amount;
        await this.updateAccountBalanceExplicitly(tx.account_id, delta);
      }

      // 2. Delete Transaction
      const { error } = await this.supabase.client
        .from('transactions')
        .delete()
        .eq('id', tx.id);

      if (error) throw error;

      // 3. Sincronizar com Empréstimo se houver vínculo
      if (tx.loan_id) {
        await this.syncLoanData(tx.loan_id);
      }

      // 4. Refresh and Close
      await this.loadTransactions();
      this.closeDeleteModal();
      this.closeActionModal();
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Erro ao excluir lançamento.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private async syncLoanData(loanId: string) {
    await this.supabase.syncLoanData(loanId);
  }

  setRange(r: number) { 
    this.dateRange.set(r); 
    if (r === -2) {
      this.currentMonthNav.set(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    }
  }

  prevMonth() {
    const d = new Date(this.currentMonthNav());
    d.setMonth(d.getMonth() - 1);
    this.currentMonthNav.set(d);
  }

  nextMonth() {
    const d = new Date(this.currentMonthNav());
    d.setMonth(d.getMonth() + 1);
    this.currentMonthNav.set(d);
  }

  getMonthYearLabel(): string {
    const nav = this.currentMonthNav();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[nav.getMonth()]} ${nav.getFullYear()}`;
  }
  setType(t: TxTypeFilter) { this.typeFilter.set(t); }
  setStatus(s: 'all' | 'confirmed' | 'pending' | 'cancelled') { this.statusFilter.set(s); }
  toggleSort() { this.sortOrder.update(s => s === 'desc' ? 'asc' : 'desc'); }

  openCustomFilterModal() {
    this.showCustomFilterModal.set(true);
  }
  closeCustomFilterModal() {
    this.showCustomFilterModal.set(false);
  }
  toggleCustomType(type: 'income'|'expense'|'transfer'|'goal'|'investment') {
    const curr = { ...this.customTypes() };
    curr[type] = !curr[type];
    this.customTypes.set(curr);
  }
  toggleCustomStatus(status: 'confirmed'|'pending'|'cancelled') {
    const curr = { ...this.customStatuses() };
    curr[status] = !curr[status];
    this.customStatuses.set(curr);
  }
  clearCustomFilters() {
    this.customStartDate.set('');
    this.customEndDate.set('');
    this.customTypes.set({ income: false, expense: false, transfer: false, goal: false, investment: false });
    this.customStatuses.set({ confirmed: false, pending: false, cancelled: false });
    this.appliedCustomFilters.set(null);
    this.dateRange.set(-1);
    this.closeCustomFilterModal();
  }
  applyCustomFilters() {
    this.appliedCustomFilters.set({
      startDate: this.customStartDate(),
      endDate: this.customEndDate(),
      types: this.customTypes(),
      statuses: this.customStatuses()
    });
    this.dateRange.set(0); // 0 means custom is active
    this.closeCustomFilterModal();
  }

  getAccountName(accountId: string): string {
    return this.accountMap().get(accountId) || '';
  }

  executeExport() {
    const format = this.exportFormat();
    const txs = this.filteredTransactions();
    if (!txs.length) return;

    if (format === 'csv') {
      this.downloadCsv(txs);
    } else {
      this.downloadXlsx(txs);
    }
    this.showExportModal.set(false);
  }

  private downloadCsv(txs: any[]) {
    const headers = ['Data', 'Descricao', 'Categoria', 'Conta', 'Tipo', 'Valor (BRL)'];
    const rows = txs.map(tx => [
      (tx.date || '').split('T')[0],
      `"${tx.description}"`,
      tx.category || tx.type,
      this.getAccountName(tx.account_id) || '',
      tx.type === 'expense' ? 'Despesa' : tx.type === 'income' ? 'Receita' : 'Transferência',
      (tx.type === 'expense' ? -tx.amount : tx.amount).toFixed(2).replace('.', ',')
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private downloadXlsx(txs: any[]) {
    const data = txs.map(tx => ({
      'Data': (tx.date || '').split('T')[0],
      'Descrição': tx.description,
      'Categoria': tx.category || tx.type,
      'Conta': this.getAccountName(tx.account_id) || '',
      'Tipo': tx.type === 'expense' ? 'Despesa' : tx.type === 'income' ? 'Receita' : 'Transferência',
      'Valor (BRL)': tx.type === 'expense' ? -tx.amount : tx.amount
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transações');
    XLSX.writeFile(wb, `transacoes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  private formatDateLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    if (sameDay(date, today)) return 'Hoje';
    if (sameDay(date, yesterday)) return 'Ontem';
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  getTxIcon(tx: SupabaseTransaction): { icon: string; bg: string; color: string } {
    const map: Record<string, { icon: string; bg: string; color: string }> = {
      food: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
      alimentacao: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
      transport: { icon: 'directions_car', bg: 'bg-blue-50', color: 'text-blue-500' },
      transporte: { icon: 'directions_car', bg: 'bg-blue-50', color: 'text-blue-500' },
      income: { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      salary: { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      salario: { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      shopping: { icon: 'shopping_bag', bg: 'bg-purple-50', color: 'text-purple-500' },
      compras: { icon: 'shopping_bag', bg: 'bg-purple-50', color: 'text-purple-500' },
      utilities: { icon: 'bolt', bg: 'bg-yellow-50', color: 'text-yellow-500' },
      contas: { icon: 'bolt', bg: 'bg-yellow-50', color: 'text-yellow-500' },
      saude: { icon: 'local_hospital', bg: 'bg-red-50', color: 'text-red-400' },
      health: { icon: 'local_hospital', bg: 'bg-red-50', color: 'text-red-400' },
      transfer: { icon: 'sync_alt', bg: 'bg-blue-50', color: 'text-blue-500' },
      transferencia: { icon: 'sync_alt', bg: 'bg-blue-50', color: 'text-blue-500' },
      lazer: { icon: 'sports_esports', bg: 'bg-violet-50', color: 'text-violet-500' },
      entertainment: { icon: 'sports_esports', bg: 'bg-violet-50', color: 'text-violet-500' },
      meta: { icon: 'flag', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      metas: { icon: 'flag', bg: 'bg-emerald-50', color: 'text-emerald-500' },
    };
    const cat = (tx.category || tx.type || '').toLowerCase();
    return map[cat] || { icon: 'receipt', bg: 'bg-slate-100', color: 'text-slate-500' };
  }
}
