import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService, SupabaseCardTransaction, SupabaseAccount } from '../../core/services/supabase.service';
import { NavigationService } from '../../core/services/navigation.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-all-card-transactions',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, DeleteConfirmModalComponent],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <!-- Header -->
      <div class="flex justify-between items-center bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <mat-icon class="text-2xl">receipt_long</mat-icon>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Histórico de Cartões</h1>
            <p class="text-slate-500 text-sm mt-1 font-medium">Todos os lançamentos de crédito registrados.</p>
          </div>
        </div>
        <button 
          (click)="back()"
          class="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:shadow-sm transition-all flex items-center gap-2">
          <mat-icon class="text-[18px]">arrow_back</mat-icon>
          Voltar para Cartões
        </button>
      </div>

      <!-- Filters Bar -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
        <!-- Row 1: Status & Quick Stats & Export -->
        <div class="flex flex-col md:flex-row gap-4 items-center justify-between pb-4 border-b border-slate-50">
          <div class="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60 overflow-x-auto w-full md:w-auto">
            @for (filter of availableFilters; track filter) {
              <button 
                (click)="activeFilter.set(filter)"
                class="px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                [class.bg-white]="activeFilter() === filter"
                [class.text-indigo-600]="activeFilter() === filter"
                [class.shadow-sm]="activeFilter() === filter"
                [class.text-slate-400]="activeFilter() !== filter"
                [class.hover:text-slate-600]="activeFilter() !== filter">
                {{ filter }}
              </button>
            }
          </div>

          <div class="flex items-center gap-6 w-full md:w-auto">
            <div class="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.15em]">
              <div class="flex items-center gap-2 text-slate-400">
                <mat-icon class="text-sm">tag</mat-icon>
                {{ filteredTransactions().length }} registros
              </div>
              <div class="w-px h-3 bg-slate-200"></div>
              <div class="flex items-center gap-2 text-rose-500">
                <mat-icon class="text-sm">payments</mat-icon>
                @if (privacy.isPrivate()) { R$ **** } @else { {{ filteredTotal() | currency:'BRL':'symbol':'1.2-2' }} }
              </div>
            </div>

            <button (click)="exportCsv()" class="h-10 px-4 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
              <mat-icon class="text-[18px] text-slate-400">download</mat-icon>
              Exportar
            </button>
          </div>
        </div>

        <!-- Row 2: Search & Select Filters -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div class="lg:col-span-6 relative">
            <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
            <input
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Buscar por descrição ou categoria..."
              class="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all">
          </div>

          <div class="lg:col-span-3 flex items-center gap-3">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Cartão:</span>
            <select [ngModel]="cardFilter()" (ngModelChange)="cardFilter.set($event)" 
              class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400 transition-all cursor-pointer">
              <option value="">Todos os Cartões</option>
              @for (card of cards(); track card.id) {
                <option [value]="card.id">{{ card.institution_name }} (•••• {{ (card.card_number || '').slice(-4) }})</option>
              }
            </select>
          </div>

          <div class="lg:col-span-3 flex items-center gap-3">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Cat:</span>
            <select [ngModel]="categoryFilter()" (ngModelChange)="categoryFilter.set($event)" 
              class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400 transition-all cursor-pointer">
              <option value="">Todas Categorias</option>
              @for (cat of categoryOptions; track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Row 3: Periods & Month Navigator -->
        <div class="flex flex-col sm:flex-row items-center gap-6 pt-2">
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Período:</span>
            <div class="flex gap-1">
              <button (click)="setDateRange(-1)" class="text-xs font-bold transition-all px-4 py-2 rounded-lg"
                [class.bg-indigo-600]="dateRange() === -1" [class.text-white]="dateRange() === -1"
                [class.text-slate-500]="dateRange() !== -1" [class.hover:bg-slate-100]="dateRange() !== -1">Todos</button>
              <button (click)="setDateRange(30)" class="text-xs font-bold transition-all px-4 py-2 rounded-lg"
                [class.bg-indigo-600]="dateRange() === 30" [class.text-white]="dateRange() === 30"
                [class.text-slate-500]="dateRange() !== 30" [class.hover:bg-slate-100]="dateRange() !== 30">30 dias</button>
              <button (click)="setDateRange(7)" class="text-xs font-bold transition-all px-4 py-2 rounded-lg"
                [class.bg-indigo-600]="dateRange() === 7" [class.text-white]="dateRange() === 7"
                [class.text-slate-500]="dateRange() !== 7" [class.hover:bg-slate-100]="dateRange() !== 7">7 dias</button>
              <button (click)="setDateRange(-2)" class="text-xs font-bold transition-all px-4 py-2 rounded-lg"
                [class.bg-indigo-600]="dateRange() === -2" [class.text-white]="dateRange() === -2"
                [class.text-slate-500]="dateRange() !== -2" [class.hover:bg-slate-100]="dateRange() !== -2">Por Fatura</button>
              <button (click)="showCustomFilterModal.set(true)" class="text-xs font-bold transition-all px-4 py-2 rounded-lg"
                [class.bg-indigo-600]="dateRange() === 0" [class.bg-indigo-600]="dateRange() === 0"
                [class.text-slate-500]="dateRange() !== 0" [class.hover:bg-slate-100]="dateRange() !== 0">Personalizado</button>
            </div>
          </div>

          @if (dateRange() === -2) {
            <div class="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200 animate-in slide-in-from-left duration-300">
              <button (click)="prevMonth()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all">
                <mat-icon class="text-lg">chevron_left</mat-icon>
              </button>
              <span class="text-xs font-black text-slate-700 uppercase tracking-widest min-w-[120px] text-center">
                {{ getMonthYearLabel() }}
              </span>
              <button (click)="nextMonth()" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all">
                <mat-icon class="text-lg">chevron_right</mat-icon>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Transactions List Details -->
      <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        


        <div class="overflow-x-auto">
          @if (isLoading()) {
            <div class="flex items-center justify-center py-20 text-slate-400">
              <mat-icon class="animate-spin text-3xl mr-3">refresh</mat-icon>
              <span class="font-bold">Carregando histórico...</span>
            </div>
          } @else if (filteredTransactions().length === 0) {
             <div class="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                <div class="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                  <mat-icon class="text-[48px] text-slate-200">search_off</mat-icon>
                </div>
                <p class="text-lg font-bold text-slate-500">Nenhum lançamento encontrado</p>
                <p class="text-sm font-medium max-w-sm text-center">Não localizamos transações que correspondam aos seus filtros ou termo de busca.</p>
              </div>
          } @else {
            <table class="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr class="bg-white border-b border-slate-100">
                  <th class="px-8 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/50">Descrição do Gasto</th>
                  <th class="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/50">Cartão</th>
                   <th class="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/50 cursor-pointer hover:bg-slate-100/80 transition-colors group/header" (click)="toggleSort()">
                    <div class="flex items-center gap-1">
                      Data
                      <mat-icon class="text-sm transition-transform duration-300" [class.rotate-180]="sortDirection() === 'asc'">expand_more</mat-icon>
                    </div>
                  </th>
                  <th class="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/50">Status</th>
                  <th class="px-8 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right">Valor Extrato</th>
                  <th class="px-6 py-5 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right w-16"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (tx of filteredTransactions(); track tx.id) {
                  <tr class="hover:bg-slate-50/60 transition-colors group">
                    <td class="px-8 py-4">
                      <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 bg-white shadow-sm text-slate-500 group-hover:scale-110 transition-transform">
                          <mat-icon class="text-[20px]">{{ getCategoryIcon(tx.category) }}</mat-icon>
                        </div>
                        <div>
                          <p class="font-black text-slate-800 text-sm">{{ tx.description }}</p>
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1 inline-block" [style.backgroundColor]="getCategoryColor(tx.category) + '15'" [style.color]="getCategoryColor(tx.category)">
                            {{ tx.category || 'Outros' }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-[16px] text-slate-300">credit_card</mat-icon>
                        <span class="text-sm font-bold text-slate-600">{{ getCardName(tx.card_id) }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm font-medium text-slate-500">{{ formatDate(tx.date) }}</span>
                    </td>
                    <td class="px-6 py-4">
                       <span class="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1.5"
                        [class.bg-emerald-50]="tx.status === 'confirmed'" [class.text-emerald-600]="tx.status === 'confirmed'" [class.border]="tx.status === 'confirmed'" [class.border-emerald-100]="tx.status === 'confirmed'"
                        [class.bg-amber-50]="tx.status === 'pending'" [class.text-amber-600]="tx.status === 'pending'" [class.border]="tx.status === 'pending'" [class.border-amber-100]="tx.status === 'pending'">
                        @if(tx.status === 'confirmed'){ <mat-icon class="text-[12px]">check_circle</mat-icon> }
                        @if(tx.status === 'pending'){ <mat-icon class="text-[12px]">schedule</mat-icon> }
                        {{ tx.status === 'confirmed' ? 'Confirmado' : 'Pendente' }}
                      </span>
                    </td>
                    <td class="px-8 py-4 text-right">
                       <p class="text-base font-black text-red-600 font-mono tracking-tight">
                        @if (privacy.isPrivate()) {
                          R$ ****
                        } @else {
                          {{ tx.amount | currency:'BRL':'symbol':'1.2-2' }}
                        }
                       </p>
                    </td>
                      <td class="px-6 py-4 text-right">
                       <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button (click)="editTransaction(tx)" title="Editar" class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                          <mat-icon class="text-[16px]">edit</mat-icon>
                        </button>
                        
                        @if (tx.installment_group_id) {
                          <button (click)="deleteTransaction(tx, 'single')" title="Excluir apenas esta parcela" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <mat-icon class="text-[16px]">delete</mat-icon>
                          </button>
                          <button (click)="deleteTransaction(tx, 'series')" title="Excluir todas (série)" class="w-8 h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <mat-icon class="text-[16px]">clear_all</mat-icon>
                          </button>
                        } @else {
                          <button (click)="deleteTransaction(tx, 'single')" title="Excluir" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <mat-icon class="text-[16px]">delete</mat-icon>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>

      @if (showEditDrawer()) {
        <!-- Overlay -->
        <div class="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" (click)="closeEditDrawer()"></div>
        
        <!-- Drawer Panel -->
        <div class="fixed top-0 right-0 z-[130] h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <!-- Drawer Header -->
          <div class="flex items-start justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 class="text-xl font-black text-slate-900">Editar Lançamento</h2>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Ref: {{ transactionToEdit()?.description }}
              </p>
            </div>
            <button (click)="closeEditDrawer()" class="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors">
              <mat-icon class="text-[20px]">close</mat-icon>
            </button>
          </div>

          <!-- Drawer Body -->
          <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <!-- Descrição -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Descrição</label>
              <input
                type="text"
                [(ngModel)]="editForm.description"
                placeholder="Ex: Supermercado..."
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all">
            </div>

            <!-- Valor -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Valor</label>
              <div class="relative flex items-center">
                <span class="absolute left-4 text-slate-500 font-bold text-sm">R$</span>
                <input
                  type="number"
                  [(ngModel)]="editForm.amount"
                  placeholder="0.00"
                  class="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all">
              </div>
            </div>

            <!-- Categoria e Data -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Categoria</label>
                <div class="relative">
                  <select
                    [(ngModel)]="editForm.category"
                    class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-400 transition-all appearance-none cursor-pointer">
                    <option value="">Selecionar</option>
                    @for (cat of categoryOptions; track cat) {
                      <option [value]="cat">{{ cat }}</option>
                    }
                  </select>
                  <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</mat-icon>
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Data</label>
                <input
                  type="date"
                  [(ngModel)]="editForm.date"
                  class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-400 transition-all">
              </div>
            </div>

            <!-- Status -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Status</label>
              <div class="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  (click)="editForm.status = 'confirmed'"
                  class="h-10 rounded-xl text-xs font-bold border transition-all"
                  [class.bg-emerald-500]="editForm.status === 'confirmed'"
                  [class.text-white]="editForm.status === 'confirmed'"
                  [class.border-emerald-500]="editForm.status === 'confirmed'"
                  [class.bg-white]="editForm.status !== 'confirmed'"
                  [class.text-slate-600]="editForm.status !== 'confirmed'"
                  [class.border-slate-200]="editForm.status !== 'confirmed'">
                  Confirmado
                </button>
                <button
                  type="button"
                  (click)="editForm.status = 'pending'"
                  class="h-10 rounded-xl text-xs font-bold border transition-all"
                  [class.bg-amber-500]="editForm.status === 'pending'"
                  [class.text-white]="editForm.status === 'pending'"
                  [class.border-amber-500]="editForm.status === 'pending'"
                  [class.bg-white]="editForm.status !== 'pending'"
                  [class.text-slate-600]="editForm.status !== 'pending'"
                  [class.border-slate-200]="editForm.status !== 'pending'">
                  Pendente
                </button>
              </div>
            </div>
            
            @if (transactionToEdit()?.installment_group_id) {
              <div class="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div class="flex gap-3">
                  <mat-icon class="text-indigo-500">info</mat-icon>
                  <div>
                    <p class="text-xs font-bold text-indigo-700">Este lançamento faz parte de uma série.</p>
                    <p class="text-[10px] text-indigo-500 mt-0.5">As alterações serão aplicadas apenas a esta parcela específica.</p>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Drawer Footer -->
          <div class="px-6 py-5 border-t border-slate-100 space-y-3">
            <button
              (click)="updateTransaction()"
              [disabled]="isSaving()"
              class="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors">
              @if (isSaving()) {
                <mat-icon class="animate-spin text-sm">refresh</mat-icon>
                Atualizando...
              } @else {
                Salvar Alterações
              }
            </button>
            <button
              (click)="closeEditDrawer()"
              class="w-full h-10 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      }

      @if (showCustomFilterModal()) {
        <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div class="bg-white rounded-[24px] w-full max-w-[400px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div class="p-6 pb-4 flex items-center justify-between">
              <h2 class="text-xl font-black text-slate-800">Período Customizado</h2>
              <button (click)="showCustomFilterModal.set(false)" class="text-slate-400 hover:text-slate-600 transition-colors">
                <mat-icon class="text-[20px]">close</mat-icon>
              </button>
            </div>
            <div class="px-6 py-4 space-y-4">
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Inicial</label>
                <input type="date" [(ngModel)]="customStartDate" 
                  class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400 transition-all">
              </div>
              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Final</label>
                <input type="date" [(ngModel)]="customEndDate" 
                  class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-400 transition-all">
              </div>
            </div>
            <div class="p-6 flex gap-3">
              <button (click)="showCustomFilterModal.set(false)" 
                class="flex-1 h-12 bg-slate-100 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors">
                Cancelar
              </button>
              <button (click)="dateRange.set(0); showCustomFilterModal.set(false)" 
                class="flex-1 h-12 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors">
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      }

      @if (showDeleteConfirm()) {
        <app-delete-confirm-modal
          [title]="deleteType() === 'series' ? 'Excluir Série' : 'Confirmar Exclusão'"
          [message]="deleteType() === 'series' 
            ? 'Tem certeza que deseja excluir TODAS as parcelas desta série? Esta ação não poderá ser desfeita.' 
            : 'Tem certeza que deseja excluir este lançamento? Esta ação não poderá ser desfeita.'"
          (confirm)="executeDelete()"
          (cancel)="cancelDelete()">
        </app-delete-confirm-modal>
      }
    </div>
  `
})
export class AllCardTransactionsComponent implements OnInit {
  private supabase = inject(SupabaseService);
  privacy = inject(PrivacyService);
  private navSrv = inject(NavigationService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  isSaving = signal(false);
  transactions = signal<SupabaseCardTransaction[]>([]);
  cards = signal<SupabaseAccount[]>([]);
  
  searchQuery = signal('');
  activeFilter = signal('Todos');
  availableFilters = ['Todos', 'Confirmados', 'Pendentes', 'Apenas Parcelados'];

  // Advanced Filters
  dateRange = signal<number>(-1); // -1 = 'Todos', 30, 7, 0 = 'Personalizado', -2 = 'Por Fatura'
  cardFilter = signal<string>('');
  categoryFilter = signal<string>('');
  
  // Custom & Monthly Nav
  showCustomFilterModal = signal(false);
  customStartDate = signal<string>('');
  customEndDate = signal<string>('');
  currentMonthNav = signal<Date>(new Date());
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Edit State
  showEditDrawer = signal(false);
  transactionToEdit = signal<SupabaseCardTransaction | null>(null);
  editForm = {
    description: '',
    amount: 0 as number | null,
    category: '',
    date: '',
    status: 'confirmed' as 'confirmed' | 'pending'
  };

  toggleSort() {
    this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
  }

  setDateRange(range: number) {
    this.dateRange.set(range);
    // When switching to "Por Fatura", auto-navigate to the current invoice month
    if (range === -2) {
      this.currentMonthNav.set(this.getDefaultInvoiceMonth());
    }
  }

  /** Returns the default invoice month based on the selected card's closing_date */
  private getDefaultInvoiceMonth(): Date {
    const now = new Date();
    const selectedCardId = this.cardFilter();
    
    if (selectedCardId) {
      // Check closing date for selected card
      const card = this.cards().find(c => c.id === selectedCardId);
      const closingDay = card?.closing_date ?? null;
      if (closingDay && closingDay > 0 && now.getDate() >= closingDay) {
        // Today >= closing day → we're in the NEXT invoice cycle
        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return next;
      }
    }
    // Default: current month
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  readonly categoryOptions = [
    'Alimentação', 'Transporte', 'Compras', 'Contas', 'Saúde',
    'Lazer', 'Serviços', 'Viagem', 'Educação', 'Outros'
  ];

  // Deletion state
  showDeleteConfirm = signal(false);
  transactionToDelete = signal<SupabaseCardTransaction | null>(null);
  deleteType = signal<'single' | 'series'>('single');

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      const [cardsRes, txsRes] = await Promise.all([
        this.supabase.getAccounts(),
        this.supabase.getCardTransactions()
      ]);
      
      const allCards = (cardsRes.data as SupabaseAccount[] || []).filter(a => a.account_type === 'credit_card');
      this.cards.set(allCards);
      
      if (txsRes.data) {
        // Sort using the new robust date parser
        const sorted = (txsRes.data as SupabaseCardTransaction[]).sort((a,b) => {
          return this.parseDate(b.date).getTime() - this.parseDate(a.date).getTime();
        });
        this.transactions.set(sorted);
      }
    } catch (e) {
      console.error(e);
      this.toast.show('error', 'Erro', 'Falha ao carregar o histórico de cartões');
    } finally {
      this.isLoading.set(false);
    }
  }

  filteredTransactions = computed(() => {
    let list = this.transactions();
    
    // Filter by type
    switch (this.activeFilter()) {
      case 'Confirmados':
        list = list.filter(tx => tx.status === 'confirmed');
        break;
      case 'Pendentes':
        list = list.filter(tx => tx.status === 'pending');
        break;
      case 'Apenas Parcelados':
        list = list.filter(tx => !!tx.installment_group_id);
        break;
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(tx => 
        tx.description.toLowerCase().includes(query) || 
        (tx.category || '').toLowerCase().includes(query)
      );
    }

    // Filter by card
    const cardId = this.cardFilter();
    if (cardId) {
      list = list.filter(tx => tx.card_id === cardId);
    }

    // Filter by category
    const cat = this.categoryFilter();
    if (cat) {
      list = list.filter(tx => (tx.category || '').toLowerCase() === cat.toLowerCase());
    }

    // Filter by date range (Using Parcel Date 'tx.date')
    const range = this.dateRange();
    
    if (range === -2) {
      // Filter by Invoice Month (Por Fatura) - considering card closing dates
      const nav = this.currentMonthNav();
      const targetMonth = nav.getMonth();
      const targetYear = nav.getFullYear();
      
      // Build closing date map from loaded cards
      const cardsList = this.cards();
      const cardClosingMap = new Map<string, number | null>();
      cardsList.forEach(c => {
        cardClosingMap.set(c.id, c.closing_date || null);
      });
      
      list = list.filter(tx => {
        const txDate = this.parseDate(tx.date);
        const closingDay = cardClosingMap.get(tx.card_id) ?? null;
        
        let invoiceMonth = txDate.getMonth();
        let invoiceYear = txDate.getFullYear();
        
        if (closingDay !== null && closingDay > 0) {
          if (txDate.getDate() >= closingDay) {
            invoiceMonth++;
            if (invoiceMonth > 11) {
              invoiceMonth = 0;
              invoiceYear++;
            }
          }
        }
        
        return invoiceMonth === targetMonth && invoiceYear === targetYear;
      });
    } else if (range === 0) {
      // Custom Range
      const start = this.customStartDate();
      const end = this.customEndDate();
      
      if (start || end) {
        const startDate = start ? this.parseDate(start) : new Date(0);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = end ? this.parseDate(end) : new Date('2099-12-31');
        endDate.setHours(23, 59, 59, 999);
        
        list = list.filter(tx => {
          const txDate = this.parseDate(tx.date);
          return txDate >= startDate && txDate <= endDate;
        });
      }
    } else if (range > 0) {
      // Period filter (Last 7 or 30 days)
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      const pastDate = new Date();
      pastDate.setDate(now.getDate() - range);
      pastDate.setHours(0, 0, 0, 0);
 
      list = list.filter(tx => {
        const txDate = this.parseDate(tx.date);
        return txDate >= pastDate && txDate <= now;
      });
    }
    // Else range === -1 (Todos): No date filtering applied
    
    // FINAL SORTING
    const dir = this.sortDirection();
    return [...list].sort((a, b) => {
      const dateA = this.parseDate(a.date).getTime();
      const dateB = this.parseDate(b.date).getTime();
      return dir === 'desc' ? dateB - dateA : dateA - dateB;
    });
  });

  filteredTotal = computed(() => {
    return this.filteredTransactions().reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
  });

  back() {
    (this.navSrv as any).navigateTo('credit-cards' as any);
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

  exportCsv() {
    const list = this.filteredTransactions();
    if (list.length === 0) return;

    const headers = ['Data', 'Descricao', 'Cartao', 'Categoria', 'Status', 'Valor'];
    const rows = list.map(tx => [
      tx.date,
      tx.description,
      this.getCardName(tx.card_id),
      tx.category || 'Outros',
      tx.status === 'confirmed' ? 'Confirmado' : 'Pendente',
      tx.amount
    ]);

    const csvContent = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_cartao_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getCardName(cardId: string): string {
    const card = this.cards().find(c => c.id === cardId);
    if (!card) return 'Cartão Excluído';
    const lastDigits = (card.card_number || (card as any).account_number || '0000').slice(-4);
    return `${card.institution_name} (•••• ${lastDigits})`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = this.parseDate(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch { 
      return dateStr; 
    }
  }

  getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      'alimentação': 'restaurant', 'alimentacao': 'restaurant',
      'transporte': 'directions_car',
      'compras': 'shopping_bag',
      'contas': 'receipt',
      'saúde': 'medical_services', 'saude': 'medical_services',
      'lazer': 'sports_esports',
      'serviços': 'handyman', 'servicos': 'handyman',
      'viagem': 'flight',
      'educação': 'school', 'educacao': 'school'
    };
    return map[(cat || '').toLowerCase()] || 'loyalty';
  }

  getCategoryColor(cat: string): string {
    const map: Record<string, string> = {
      'alimentação': '#f97316', 'alimentacao': '#f97316', // orange
      'transporte': '#3b82f6', // blue
      'compras': '#a855f7', // purple
      'contas': '#eab308', // yellow
      'saúde': '#ef4444', 'saude': '#ef4444', // red
      'lazer': '#06b6d4', // cyan
      'serviços': '#8b5cf6', 'servicos': '#8b5cf6', // violet
      'viagem': '#ec4899', // pink
      'educação': '#14b8a6', 'educacao': '#14b8a6' // teal
    };
    return map[(cat || '').toLowerCase()] || '#64748b'; // slate
  }

  deleteTransaction(tx: SupabaseCardTransaction, type: 'single' | 'series') {
    this.transactionToDelete.set(tx);
    this.deleteType.set(type);
    this.showDeleteConfirm.set(true);
  }

  async executeDelete() {
    const tx = this.transactionToDelete();
    const type = this.deleteType();
    
    if (!tx) return;

    this.isSaving.set(true);
    try {
      if (type === 'series' && tx.installment_group_id) {
        await this.supabase.deleteCardTransactionGroup(tx.installment_group_id as string);
        this.toast.show('success', 'Série excluída', 'Todas as parcelas foram removidas.');
      } else {
        await this.supabase.deleteCardTransaction(tx.id);
        this.toast.show('success', 'Excluído', 'Lançamento removido com sucesso.');
      }
      await this.loadData();
    } catch (err) {
      console.error(err);
      this.toast.show('error', 'Erro', 'Não foi possível excluir o lançamento.');
    } finally {
      this.isSaving.set(false);
      this.cancelDelete();
    }
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.transactionToEdit.set(null);
  }

  editTransaction(tx: SupabaseCardTransaction) {
    this.transactionToEdit.set(tx);
    this.editForm = {
      description: tx.description,
      amount: Number(tx.amount),
      category: tx.category || '',
      date: tx.date,
      status: tx.status as 'confirmed' | 'pending'
    };
    this.showEditDrawer.set(true);
  }

  closeEditDrawer() {
    this.showEditDrawer.set(false);
    this.transactionToEdit.set(null);
  }

  async updateTransaction() {
    const tx = this.transactionToEdit();
    const form = this.editForm;
    
    if (!tx || !form.description.trim() || !form.amount) {
      this.toast.show('error', 'Atenção', 'Preencha os campos obrigatórios!');
      return;
    }

    this.isSaving.set(true);
    try {
      const { error } = await this.supabase.client
        .from('credit_card_transactions')
        .update({
          description: form.description.trim(),
          amount: form.amount,
          category: form.category,
          date: form.date,
          status: form.status
        })
        .eq('id', tx.id);

      if (error) throw error;

      this.toast.show('success', 'Sucesso', 'Lançamento atualizado com sucesso!');
      await this.loadData();
      this.closeEditDrawer();
    } catch (err) {
      console.error(err);
      this.toast.show('error', 'Erro', 'Falha ao atualizar o lançamento.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    // Normaliza para YYYY-MM-DD isolando apenas a data se for ISO
    const cleanDate = dateStr.split('T')[0];
    const parts = cleanDate.split('-');
    
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      // Cria data local forçando meio-dia para ser imune a shifts de fuso horário
      return new Date(year, month - 1, day, 12, 0, 0);
    }
    
    // Fallback: se não estiver no formato esperado, tenta converter de forma limpa
    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }
}
