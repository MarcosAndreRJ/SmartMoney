import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService, SupabaseAccount, SupabaseTransaction, SupabaseCardTransaction } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';
import { NavigationService } from '../../core/services/navigation.service';
import * as XLSX from 'xlsx';

interface CardBill {
  card: SupabaseAccount;
  currentBill: number;
  nextBill: number; // Em formação
  limit: number;
  available: number;
  futureDebt: number; // Parcelas de meses futuros (além da próxima)
  lastDigits: string;
  color: string;
  transactions: SupabaseCardTransaction[];
}

interface CategorySummary {
  name: string;
  amount: number;
  icon: string;
  color: string;
  percent: number;
}

@Component({
  selector: 'app-credit-cards-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, DeleteConfirmModalComponent],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">

      <!-- Page Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Cartões</h1>
          <p class="text-slate-500 mt-1 font-medium">Gerencie suas faturas e lançamentos.</p>
        </div>
        <div class="flex gap-3">
          <button (click)="consolidateBills()" 
                  [disabled]="isSaving()"
                  class="px-5 py-3 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <mat-icon class="text-[20px]">sync</mat-icon>
            Sincronizar Faturas
          </button>
          <button (click)="openDrawer()" class="px-5 py-3 bg-[#0F172A] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
            <mat-icon class="text-lg">add_circle</mat-icon>
            Adicionar Lançamento
          </button>
        </div>
      </div>

      <!-- Loading / Empty State -->
      @if (isLoading()) {
        <div class="flex items-center justify-center h-40 text-slate-400">
          <mat-icon class="animate-spin mr-3 text-3xl">refresh</mat-icon>
          <span class="font-medium">Carregando cartões...</span>
        </div>
      } @else if (cardBills().length === 0) {
        <div class="flex flex-col items-center justify-center h-64 gap-4 text-slate-400 bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          <div class="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
            <mat-icon class="text-[48px] text-slate-200">receipt_long</mat-icon>
          </div>
          <div class="text-center">
            <p class="font-bold text-lg text-slate-600">Nenhum lançamento no período</p>
            <p class="text-sm text-slate-400 max-w-xs mx-auto mt-1">Sua fatura está limpa! Adicione um novo gasto usando o botão acima ou cadastre um cartão nas suas contas.</p>
          </div>
        </div>
      } @else {

        <!-- Card Selector Tabs -->
        <div class="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          @for (bill of cardBills(); track bill.card.id) {
            <button
              (click)="selectedCardId.set(bill.card.id)"
              class="flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border shrink-0"
              [class.text-white]="selectedCardId() === bill.card.id"
              [class.shadow-lg]="selectedCardId() === bill.card.id"
              [class.border-transparent]="selectedCardId() === bill.card.id"
              [class.bg-white]="selectedCardId() !== bill.card.id"
              [class.border-slate-200]="selectedCardId() !== bill.card.id"
              [class.text-slate-600]="selectedCardId() !== bill.card.id"
              [style.backgroundColor]="selectedCardId() === bill.card.id ? (bill.card.color || '#0F172A') : ''"
            >
              <mat-icon class="text-[20px]">credit_card</mat-icon>
              {{ bill.card.institution_name }}
              <span class="text-xs opacity-70">•••• {{ bill.lastDigits }}</span>
            </button>
          }
        </div>

        @if (selectedBill()) {
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Card Hero (Left) -->
            <div class="lg:col-span-2">
              <div class="rounded-3xl overflow-hidden shadow-xl h-full"
                   style="background: linear-gradient(160deg, #1a2e4a 0%, #0d1f35 60%, #0a3d3a 100%)">

                <!-- Top Row: Bill amount + Due date -->
                <div class="flex justify-between items-start px-8 pt-8 pb-6">
                  <div>
                    <p class="text-white/50 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2">Valor da Fatura Atual</p>
                    <p class="text-[42px] font-black text-white leading-none tracking-tight">
                      R$ {{ selectedBill()!.currentBill | number:'1.2-2' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-white/50 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-1">Vencimento</p>
                    <p class="text-[28px] font-black text-emerald-400 leading-tight">
                      {{ getDueDate() }}
                    </p>
                  </div>
                </div>

                <!-- Divider -->
                <div class="mx-8 border-t border-white/10"></div>

                <!-- Bottom Row: Limit info + Pay button -->
                <div class="flex items-center justify-between px-8 py-5">
                  <div class="flex items-center gap-6">
                    <div>
                      <p class="text-white/50 text-[11px] font-medium mb-0.5">Limite Disponível</p>
                      <p class="text-white font-extrabold text-base">R$ {{ selectedBill()!.available | number:'1.2-2' }}</p>
                    </div>
                    <div class="w-px h-8 bg-white/15"></div>
                    <div>
                      <p class="text-white/50 text-[11px] font-medium mb-0.5 whitespace-nowrap">Próxima Fatura</p>
                      <p class="text-amber-400 font-bold text-base italic">R$ {{ selectedBill()!.nextBill | number:'1.2-2' }}</p>
                    </div>
                    @if (selectedBill()!.futureDebt > 0) {
                      <div class="w-px h-8 bg-white/15"></div>
                      <div>
                        <p class="text-white/30 text-[11px] font-medium mb-0.5 whitespace-nowrap">Dívida Total</p>
                        <p class="text-rose-400/80 font-bold text-sm italic">R$ {{ selectedBill()!.futureDebt | number:'1.2-2' }}</p>
                      </div>
                    }
                    <div class="w-px h-8 bg-white/15"></div>
                    <div>
                      <p class="text-white/50 text-[11px] font-medium mb-0.5">Melhor dia de compra</p>
                      <p class="text-white font-extrabold text-base">
                        @if (selectedBill()!.card.closing_date) {
                          Dia {{ selectedBill()!.card.closing_date }}
                        } @else {
                          Não definido
                        }
                      </p>
                    </div>
                  </div>
                  <button 
                    (click)="payBill()"
                    [disabled]="!canPayBill() || isSaving()"
                    [class.opacity-50]="!canPayBill()"
                    [class.cursor-not-allowed]="!canPayBill()"
                    class="px-7 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-full shadow-lg shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95 whitespace-nowrap">
                    Pagar Fatura
                  </button>
                </div>
              </div>
            </div>

            <!-- Category Breakdown (Right) -->
            <div class="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col h-full">
              <div class="flex items-center justify-between mb-8">
                <h3 class="text-lg font-black text-slate-800">Resumo por Categoria</h3>
                <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                  <mat-icon class="text-slate-400">pie_chart</mat-icon>
                </div>
              </div>

              @if (categoryBreakdown().length === 0) {
                <div class="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <div class="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                    <mat-icon class="text-slate-300 text-[32px]">analytics</mat-icon>
                  </div>
                  <p class="text-slate-400 text-sm font-medium">Sem lançamentos para categorizar.</p>
                </div>
              } @else {
                <div class="space-y-7 flex-1">
                  @for (cat of categoryBreakdown(); track cat.name) {
                    <div class="group">
                      <div class="flex justify-between items-center mb-2.5">
                        <div class="flex items-center gap-3">
                          <div class="w-2.5 h-2.5 rounded-full shadow-sm" [style.backgroundColor]="cat.color"></div>
                          <span class="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{{ cat.name }}</span>
                        </div>
                        <span class="text-sm font-black text-slate-900">R$ {{ cat.amount | number:'1.2-2' }}</span>
                      </div>
                      <div class="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-1000 ease-out" [style.width]="cat.percent + '%'" [style.backgroundColor]="cat.color"></div>
                      </div>
                    </div>
                  }
                </div>

                <div class="mt-8 pt-6 border-t border-slate-50 text-center">
                  <button class="text-sm font-black text-slate-500 hover:text-slate-900 transition-all hover:tracking-wide">
                    Ver relatório completo
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Info Alert -->
          @if (isBestPeriodToBuy()) {
            <div class="flex items-center gap-3 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 shadow-sm animate-in slide-in-from-top-2 duration-500">
              <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <mat-icon class="text-emerald-600">info</mat-icon>
              </div>
              <p class="text-sm font-bold">Fatura fechada! Este é o melhor período de compra para seu cartão.</p>
            </div>
          }

          <!-- Summary Row -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
              <div class="flex justify-between items-start mb-4">
                <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Fatura Atual</p>
                <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <mat-icon class="text-[20px]">receipt_long</mat-icon>
                </div>
              </div>
              <p class="text-2xl font-black text-red-600">R$ {{ selectedBill()!.currentBill | number:'1.2-2' }}</p>
              <p class="text-[12px] font-bold text-slate-400 mt-1">vence em {{ getDueDate() }}</p>
            </div>
            
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
              <div class="flex justify-between items-start mb-4">
                <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Limite Disponível</p>
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <mat-icon class="text-[20px]">wallet</mat-icon>
                </div>
              </div>
              <p class="text-2xl font-black text-emerald-600">R$ {{ selectedBill()!.available | number:'1.2-2' }}</p>
              <p class="text-[12px] font-bold text-slate-400 mt-1">de R$ {{ selectedBill()!.limit | number:'1.2-2' }} total</p>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
              <div class="flex justify-between items-start mb-4">
                <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Próx. Fatura</p>
                <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <mat-icon class="text-[20px]">calendar_month</mat-icon>
                </div>
              </div>
              <p class="text-2xl font-black text-slate-900">R$ {{ selectedBill()!.nextBill | number:'1.2-2' }}</p>
              <p class="text-[12px] font-bold text-slate-400 mt-1">gastos após o fechamento</p>
            </div>
          </div>

          <!-- Transaction List -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="flex items-center justify-between p-8 border-b border-slate-50">
              <h3 class="text-lg font-black text-slate-800">Lançamentos Recentes</h3>
              <div class="flex gap-4 items-center">
                <button (click)="navigateTo('all-card-transactions')" class="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Ver Todos</button>
                <button (click)="showExportModal.set(true)" class="px-4 h-10 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <mat-icon class="text-[18px]">download</mat-icon>
                  Exportar
                </button>
              </div>
            </div>
            
            <!-- Search -->
            <div class="px-8 pt-6 pb-2">
              <div class="relative">
                <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</mat-icon>
                <input
                  type="text"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  placeholder="Buscar lançamentos..."
                  class="w-full h-12 pl-12 pr-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all">
              </div>
            </div>

            @if (filteredTransactions().length === 0) {
              <div class="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                <div class="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
                  <mat-icon class="text-[48px] text-slate-200">receipt_long</mat-icon>
                </div>
                <p class="text-base font-bold text-slate-500">Nenhum lançamento encontrado</p>
              </div>
            } @else {
              <div class="divide-y divide-slate-50">
                @for (tx of filteredTransactions(); track tx.id) {
                  <div class="flex items-center justify-between px-8 py-5 hover:bg-slate-50 transition-colors group">
                    <div class="flex items-center gap-5">
                      <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" [ngClass]="getTxIcon(tx).bg">
                        <mat-icon class="text-[22px]" [ngClass]="getTxIcon(tx).color">{{ getTxIcon(tx).icon }}</mat-icon>
                      </div>
                      <div>
                        <p class="text-base font-black text-slate-900">{{ tx.description }}</p>
                        <div class="flex items-center gap-3 mt-1">
                          <span class="text-[11px] font-extrabold px-3 py-1 rounded-lg" [style.backgroundColor]="getCatColor(tx.category) + '15'" [style.color]="getCatColor(tx.category)">
                            {{ tx.category || 'Outros' }}
                          </span>
                          <span class="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                            <mat-icon class="text-[14px]">calendar_today</mat-icon>
                            {{ formatDate(tx.date) }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-2">
                      <div>
                        <p class="text-lg font-black text-red-600">R$ {{ tx.amount | number:'1.2-2' }}</p>
                        <p class="text-[11px] font-bold uppercase tracking-wider mt-0.5" [class.text-slate-400]="tx.status !== 'pending'" [class.text-amber-500]="tx.status === 'pending'">
                          {{ tx.status === 'pending' ? 'Pendente' : 'Confirmado' }}
                        </p>
                      </div>
                      
                      <!-- Delete Actions -->
                      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        @if (tx.installment_group_id) {
                          <button (click)="deleteTransaction(tx, 'single')" title="Excluir apenas esta parcela" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <mat-icon class="text-[16px]">delete</mat-icon>
                          </button>
                          <button (click)="deleteTransaction(tx, 'series')" title="Excluir todas as parcelas (Série)" class="w-8 h-8 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <mat-icon class="text-[16px]">clear_all</mat-icon>
                          </button>
                        } @else {
                          <button (click)="deleteTransaction(tx, 'single')" title="Excluir lançamento" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
                            <mat-icon class="text-[16px]">delete</mat-icon>
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- Drawer Backdrop -->
    @if (showDrawer()) {
      <div class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
           (click)="closeDrawer()"
           style="animation: fadeIn 200ms ease">
      </div>

      <!-- Drawer Panel -->
      <div class="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col"
           style="animation: slideIn 250ms cubic-bezier(0.4,0,0.2,1)">

        <!-- Drawer Header -->
        <div class="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 class="text-xl font-black text-slate-900">Novo Gasto</h2>
            <div class="flex items-center gap-2 mt-1">
              <span class="w-2 h-2 rounded-full" [style.backgroundColor]="selectedBill()?.card?.color || '#cbd5e1'"></span>
              <p class="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                {{ selectedBill()?.card?.institution_name || 'Cartão não selecionado' }}
              </p>
            </div>
          </div>
          <button (click)="closeDrawer()" class="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors mt-0.5">
            <mat-icon class="text-[20px]">close</mat-icon>
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          <!-- Info Contextual -->
          <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" [style.backgroundColor]="selectedBill()?.card?.color || '#0F172A'">
                <mat-icon class="text-lg">credit_card</mat-icon>
              </div>
              <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cartão Selecionado</p>
                <p class="text-sm font-bold text-slate-700">{{ selectedBill()?.card?.institution_name }} (•••• {{ selectedBill()?.lastDigits }})</p>
              </div>
            </div>
          </div>

          <!-- Descrição -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Descrição</label>
            <input
              type="text"
              [(ngModel)]="launchForm.description"
              placeholder="Ex: Supermercado, Cinema..."
              class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all">
          </div>

          <!-- Valor -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Valor</label>
            <div class="relative flex items-center">
              <span class="absolute left-4 text-slate-500 font-bold text-sm">R$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                [ngModel]="launchForm.amount"
                (ngModelChange)="onAmountChange($event)"
                placeholder="0.00"
                class="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all">
            </div>
          </div>

          <!-- Categoria e Data -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Categoria</label>
              <div class="relative">
                <select
                  [(ngModel)]="launchForm.category"
                  class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer">
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
                [(ngModel)]="launchForm.date"
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all">
            </div>
          </div>

          <!-- Compra Parcelada Toggle -->
          <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <mat-icon class="text-violet-500 text-[18px]">Layers</mat-icon>
              </div>
              <div>
                <p class="text-sm font-bold text-slate-800">Compra Parcelada?</p>
                <p class="text-[10px] font-medium text-slate-400">Dividir valor em meses futuros</p>
              </div>
            </div>
            <button
              type="button"
              (click)="launchForm.isInstallment = !launchForm.isInstallment"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
              [class.bg-violet-500]="launchForm.isInstallment"
              [class.bg-slate-300]="!launchForm.isInstallment"
              role="switch">
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out"
                [class.translate-x-5]="launchForm.isInstallment"
                [class.translate-x-0.5]="!launchForm.isInstallment">
              </span>
            </button>
          </div>

          <!-- Campos de Parcelamento -->
          @if (launchForm.isInstallment) {
            <div class="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
              <div class="space-y-1.5">
                <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Parcelas</label>
                <div class="relative flex items-center">
                  <input
                    type="number"
                    min="2"
                    max="96"
                    [ngModel]="launchForm.installmentsCount"
                    (ngModelChange)="onInstallmentsCountChange($event)"
                    class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all">
                  <span class="absolute right-4 text-[10px] font-bold text-slate-400 uppercase">x</span>
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Valor p/ Parcela</label>
                <div class="relative flex items-center">
                  <span class="absolute left-4 text-slate-400 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    [ngModel]="launchForm.installmentValue"
                    (ngModelChange)="onInstallmentValueChange($event)"
                    placeholder="0.00"
                    class="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 transition-all">
                </div>
              </div>
            </div>
          }

          <!-- Gasto Recorrente Toggle (Substituído ou Oculto se parcelado) -->
          @if (!launchForm.isInstallment) {
            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <mat-icon class="text-blue-500 text-[18px]">event_repeat</mat-icon>
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-800">Gasto Recorrente</p>
                  <p class="text-[10px] font-medium text-slate-400">Repetir todo mês</p>
                </div>
              </div>
              <!-- Toggle Switch -->
              <button
                type="button"
                (click)="launchForm.recurring = !launchForm.recurring"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                [class.bg-emerald-500]="launchForm.recurring"
                [class.bg-slate-300]="!launchForm.recurring"
                role="switch"
                [attr.aria-checked]="launchForm.recurring">
                <span
                  class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out"
                  [class.translate-x-5]="launchForm.recurring"
                  [class.translate-x-0.5]="!launchForm.recurring">
                </span>
              </button>
            </div>
          }

          <!-- Status -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Status</label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                (click)="launchForm.status = 'confirmed'"
                class="h-10 rounded-xl text-xs font-bold border transition-all"
                [class.bg-emerald-500]="launchForm.status === 'confirmed'"
                [class.text-white]="launchForm.status === 'confirmed'"
                [class.border-emerald-500]="launchForm.status === 'confirmed'"
                [class.bg-white]="launchForm.status !== 'confirmed'"
                [class.text-slate-600]="launchForm.status !== 'confirmed'"
                [class.border-slate-200]="launchForm.status !== 'confirmed'">
                Confirmado
              </button>
              <button
                type="button"
                (click)="launchForm.status = 'pending'"
                class="h-10 rounded-xl text-xs font-bold border transition-all"
                [class.bg-amber-500]="launchForm.status === 'pending'"
                [class.text-white]="launchForm.status === 'pending'"
                [class.border-amber-500]="launchForm.status === 'pending'"
                [class.bg-white]="launchForm.status !== 'pending'"
                [class.text-slate-600]="launchForm.status !== 'pending'"
                [class.border-slate-200]="launchForm.status !== 'pending'">
                Pendente
              </button>
            </div>
          </div>

        </div>

        <!-- Drawer Footer -->
        <div class="px-6 py-5 border-t border-slate-100 space-y-3">
          <button
            (click)="saveTransaction()"
            [disabled]="isSaving()"
            class="w-full h-12 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors">
            @if (isSaving()) {
              <mat-icon class="animate-spin text-sm">refresh</mat-icon>
              Salvando...
            } @else {
              Salvar Lançamento
            }
          </button>
          <button
            (click)="closeDrawer()"
            class="w-full h-10 text-slate-500 font-bold text-sm hover:text-slate-700 transition-colors">
            Cancelar
          </button>
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

      <!-- Export Modal -->
      @if (showExportModal()) {
        <div class="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div class="bg-white rounded-[24px] w-full max-w-[400px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <!-- Modal Header -->
            <div class="p-6 pb-4 relative">
              <h2 class="text-xl font-black text-slate-800">Exportar Fatura</h2>
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
                  [class.border-indigo-500]="exportFormat() === 'csv'"
                  [class.bg-indigo-50]="exportFormat() === 'csv'"
                  class="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 transition-all text-left group">
                  <div class="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <mat-icon>description</mat-icon>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-bold text-slate-800">CSV (Padrão)</p>
                    <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Separado por ponto e vírgula</p>
                  </div>
                  @if (exportFormat() === 'csv') {
                    <mat-icon class="text-indigo-500">check_circle</mat-icon>
                  }
                </button>

                <button 
                  (click)="exportFormat.set('xlsx')"
                  [class.border-indigo-500]="exportFormat() === 'xlsx'"
                  [class.bg-indigo-50]="exportFormat() === 'xlsx'"
                  class="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 transition-all text-left group">
                  <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <mat-icon>table_view</mat-icon>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-bold text-slate-800">Excel (XLSX)</p>
                    <p class="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Planilha formatada para Excel</p>
                  </div>
                  @if (exportFormat() === 'xlsx') {
                    <mat-icon class="text-indigo-500">check_circle</mat-icon>
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
  `
})
export class CreditCardsPageComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  isLoading = signal(true);
  isSaving = signal(false);
  showDrawer = signal(false);
  allAccounts = signal<SupabaseAccount[]>([]);
  allTransactions = signal<SupabaseTransaction[]>([]);
  allCardTransactions = signal<SupabaseCardTransaction[]>([]);
  selectedCardId = signal<string>('');
  searchQuery = signal('');

  // Export Modal State
  showExportModal = signal(false);
  exportFormat = signal<'csv' | 'xlsx'>('csv');
  
  // Deletion state
  showDeleteConfirm = signal(false);
  transactionToDelete = signal<SupabaseCardTransaction | null>(null);
  deleteType = signal<'single' | 'series'>('single');

  launchForm: {
    description: string;
    amount: number | null;
    category: string;
    date: string;
    cardId: string;
    recurring: boolean;
    status: 'confirmed' | 'pending';
    isInstallment: boolean;
    installmentsCount: number;
    installmentValue: number | null;
    installmentInputMode: 'total' | 'per_installment';
  } = {
    description: '',
    amount: null,
    category: '',
    date: new Date().toLocaleDateString('en-CA'),
    cardId: '',
    recurring: false,
    status: 'confirmed',
    isInstallment: false,
    installmentsCount: 2,
    installmentValue: null,
    installmentInputMode: 'total'
  };

  private navSrv = inject(NavigationService);

  navigateTo(view: string) {
    (this.navSrv as any).navigateTo(view as any);
  }

  readonly categoryOptions = [
    'Alimentação', 'Transporte', 'Compras', 'Contas', 'Saúde',
    'Lazer', 'Serviços', 'Viagem', 'Educação', 'Outros'
  ];

  cardBills = computed<CardBill[]>(() => {
    const cards = this.allAccounts().filter(a => a.account_type === 'credit_card');
    const cardTransactions = this.allCardTransactions();

    return cards.map(card => {
      const cardTxs = cardTransactions.filter(tx => tx.card_id === card.id);
      
      const now = new Date();
      const todayDay = now.getDate();
      const todayMonth = now.getMonth();
      const todayYear = now.getFullYear();
      
      const closeDay = Number(card.closing_date || 10);
      const dueDay = Number(card.due_date || 17);

      // 1. Mês Absoluto Hoje
      const nowAbs = todayYear * 12 + todayMonth;

      // 2. Fatura Vigente: continua sendo a atual enquanto o dia de HOJE não ultrapassar o vencimento.
      let activeAbsMonth = nowAbs;
      if (todayDay > dueDay) {
        activeAbsMonth++;
      }
      
      const nextAbsMonth = activeAbsMonth + 1;

      // 3. Engine de Competência Bancária Desacoplada
      const getTxAbsCompetence = (dateStr: string) => {
        if (!dateStr) return 0;
        
        // Garante leitura de data local correta sem interferência de fuso horário (T00:00Z)
        const dStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        const parts = dStr.split('-');
        if (parts.length < 3) return 0;

        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // Array de meses 0-11
        const d = parseInt(parts[2], 10);
        
        let txMonth = m;
        let txYear = y;

        // Se comprou no dia do fechamento ou após, cai no fechamento do mês seguinte
        if (d >= closeDay) {
          txMonth++;
          if (txMonth > 11) {
            txMonth = 0;
            txYear++;
          }
        }

        let dueMonth = txMonth;
        let dueYear = txYear;
        
        // Se a data de fechamento for numericamente maior que o vencimento
        // (ex: fecha 25, mas vence só 05 do OUTRO mês)
        // promovemos a fatura para o mês devido corretamente.
        if (closeDay > dueDay) {
          dueMonth++;
          if (dueMonth > 11) {
             dueMonth = 0;
             dueYear++;
          }
        }

        return dueYear * 12 + dueMonth;
      };

      // 4. Distribuição Estrita
      const currentTransactions = cardTxs.filter(tx => 
        tx.status === 'confirmed' && getTxAbsCompetence(tx.date) === activeAbsMonth
      );

      const nextTransactions = cardTxs.filter(tx => 
        tx.status === 'confirmed' && getTxAbsCompetence(tx.date) === nextAbsMonth
      );

      const currentBill = currentTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
      const nextBill = nextTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);

      // Limite e Compromissos a longo prazo
      const totalCommitted = cardTxs
        .filter(tx => tx.status === 'confirmed' || tx.status === 'pending')
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const limit = Number(card.credit_limit || 0);
      const available = Math.max(0, limit - totalCommitted);
      const futureDebt = Math.max(0, totalCommitted - currentBill - nextBill);

      return {
        card,
        currentBill,
        nextBill,
        limit,
        available,
        futureDebt,
        lastDigits: (card.card_number || (card as any).account_number || '0000').slice(-4),
        color: card.color || '#0F172A',
        transactions: cardTxs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      };
    });
  });

  selectedBill = computed<CardBill | null>(() => {
    const list = this.cardBills();
    const selId = this.selectedCardId();
    return list.find(b => b.card.id === selId) ?? list[0] ?? null;
  });

  filteredTransactions = computed(() => {
    const bill = this.selectedBill();
    if (!bill) return [];
    
    const query = this.searchQuery().toLowerCase().trim();
    
    // Repete a lógica de engine isolada para garantir a fonte de verdade na lista visual
    const closeDay = Number(bill.card.closing_date || 10);
    const dueDay = Number(bill.card.due_date || 17);
    const now = new Date();
    let activeAbsMonth = now.getFullYear() * 12 + now.getMonth();
    if (now.getDate() > dueDay) {
      activeAbsMonth++;
    }

    const getTxAbsCompetence = (dateStr: string) => {
      if (!dateStr) return 0;
      const dStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = dStr.split('-');
      if (parts.length < 3) return 0;

      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      
      let txMonth = m;
      let txYear = y;

      if (d > closeDay) {
        txMonth++;
        if (txMonth > 11) { txMonth = 0; txYear++; }
      }

      let dueMonth = txMonth;
      let dueYear = txYear;
      if (closeDay > dueDay) {
        dueMonth++;
        if (dueMonth > 11) { dueMonth = 0; dueYear++; }
      }

      return dueYear * 12 + dueMonth;
    };

    return bill.transactions.filter(tx => {
      const matchesQuery = !query || tx.description.toLowerCase().includes(query) || (tx.category || '').toLowerCase().includes(query);
      // REGRAS SÊNIOR: Mostrar APENAS as que pertencem de fato à fatura no painel
      const belongsToBill = getTxAbsCompetence(tx.date) === activeAbsMonth;
      return matchesQuery && belongsToBill;
    });
  });

  categoryBreakdown = computed<CategorySummary[]>(() => {
    const bill = this.selectedBill();
    if (!bill || bill.currentBill <= 0) return [];

    const catMap = new Map<string, number>();
    
    // REGRAS SÊNIOR: O gráfico deve refletir APENAS a fatura atual
    this.filteredTransactions()
      .filter(tx => tx.status === 'confirmed')
      .forEach(tx => {
        const cat = tx.category || 'Outros';
        catMap.set(cat, (catMap.get(cat) || 0) + Number(tx.amount));
      });

    const catColors: Record<string, string> = {
      alimentacao: '#f97316', alimentação: '#f97316', food: '#f97316',
      transporte: '#3b82f6', transport: '#3b82f6',
      compras: '#a855f7', shopping: '#a855f7',
      contas: '#eab308', utilities: '#eab308',
      saude: '#ef4444', health: '#ef4444', saúde: '#ef4444',
      lazer: '#06b6d4', entertainment: '#06b6d4',
      outros: '#64748b', other: '#64748b',
    };

    const currentTotal = bill.currentBill;

    return Array.from(catMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        icon: 'label',
        color: catColors[name.toLowerCase()] || '#64748b',
        percent: currentTotal > 0 ? (amount / currentTotal) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  });

  async ngOnInit() {
    await this.reloadData();
  }

  private async reloadData() {
    this.isLoading.set(true);
    try {
      const [accRes, txRes, cardTxRes] = await Promise.all([
        this.supabase.getAccounts(),
        this.supabase.getTransactions(),
        this.supabase.getCardTransactions()
      ]);

      if (accRes.data) {
        this.allAccounts.set(accRes.data as SupabaseAccount[]);
      }
      if (txRes.data) {
        this.allTransactions.set(txRes.data as SupabaseTransaction[]);
      }
      if (cardTxRes.data) {
        this.allCardTransactions.set(cardTxRes.data as SupabaseCardTransaction[]);
      }

      // Manter o cartão atual selecionado ou selecionar o primeiro se não houver seleção válida
      const currentSelectedId = this.selectedCardId();
      const bills = this.cardBills();
      const billToSelect = bills.find(b => b.card.id === currentSelectedId) || bills[0];
      
      if (billToSelect) {
        this.selectedCardId.set(billToSelect.card.id);
        this.launchForm.cardId = billToSelect.card.id;
      }
    } finally {
      this.isLoading.set(false);
    }
  }


  canPayBill = computed(() => {
    const bill = this.selectedBill();
    if (!bill || bill.currentBill <= 0) return false;
    if (!this.isBestPeriodToBuy()) return false;

    // Check if there's already a CONFIRMED payment this month
    const hasConfirmedPayment = this.allTransactions().some(tx =>
      tx.description.includes('Pagamento Fatura') &&
      tx.description.includes(bill.card.institution_name) &&
      tx.status === 'confirmed' &&
      new Date(tx.date).getMonth() === new Date().getMonth()
    );

    return !hasConfirmedPayment;
  });

  async payBill() {
    const bill = this.selectedBill();
    if (!bill || !this.canPayBill()) return;

    this.isSaving.set(true);
    try {
      const paymentAccount = this.getBillPaymentAccount();
      if (!paymentAccount) {
        this.toast.show('error', 'Conta não encontrada', 'Cadastre uma conta corrente para pagar a fatura.');
        return;
      }

      // Find if there's a pending payment
      const pendingPayment = this.allTransactions().find(tx =>
        tx.description.includes('Pagamento Fatura') &&
        tx.description.includes(bill.card.institution_name) &&
        tx.status === 'pending' &&
        new Date(tx.date).getMonth() === new Date().getMonth()
      );

      if (pendingPayment) {
        // Update to confirmed
        const { error } = await this.supabase.client
          .from('transactions')
          .update({ status: 'confirmed' })
          .eq('id', pendingPayment.id);
        if (error) throw error;
      } else {
        // Create new confirmed payment
        const now = new Date();
        const monthYear = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        const newTx: Partial<SupabaseTransaction> = {
          account_id: paymentAccount.id,
          description: `Pagamento Fatura - ${bill.card.institution_name} - ${monthYear}`,
          amount: bill.currentBill,
          date: now.toLocaleDateString('en-CA'),
          category: 'Pagamento',
          type: 'expense',
          status: 'confirmed'
        };
        const { error } = await this.supabase.createTransaction(newTx);
        if (error) throw error;
      }

      this.toast.show('success', 'Sucesso', 'Fatura atualizada como paga!');
      
      await this.reloadData();

    } catch (err) {
      console.error(err);
      this.toast.show('error', 'Erro', 'Erro ao pagar fatura.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async consolidateBills() {
    this.isSaving.set(true);
    try {
      this.toast.show('success', 'Sincronizando', 'Consolidando faturas e gerando lançamentos de previsão...');
      await this.supabase.syncAllCardsBills();
      this.toast.show('success', 'Sucesso', 'Faturas sincronizadas com sucesso!');
      await this.reloadData();
    } catch (err) {
      console.error(err);
      this.toast.show('error', 'Erro', 'Falha ao sincronizar faturas.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async openDrawer() {
    // Pre-fill cardId to currently selected card
    const current = this.selectedBill();
    if (current) this.launchForm.cardId = current.card.id;
    this.launchForm.date = new Date().toLocaleDateString('en-CA');
    this.showDrawer.set(true);
  }

  private generateGroupId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback simples caso randomUUID não esteja disponível
    return 'group-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
  }

  closeDrawer() {
    this.showDrawer.set(false);
  }

  // Handlers para cálculo bidirecional de parcelas
  onAmountChange(value: number | null) {
    this.launchForm.amount = value;
    this.launchForm.installmentInputMode = 'total';
    if (value && this.launchForm.installmentsCount > 0) {
      this.launchForm.installmentValue = Number((value / this.launchForm.installmentsCount).toFixed(2));
    } else {
      this.launchForm.installmentValue = null;
    }
  }

  onInstallmentValueChange(value: number | null) {
    this.launchForm.installmentValue = value;
    this.launchForm.installmentInputMode = 'per_installment';
    if (value && this.launchForm.installmentsCount > 0) {
      this.launchForm.amount = Number((value * this.launchForm.installmentsCount).toFixed(2));
    } else {
      this.launchForm.amount = null;
    }
  }

  onInstallmentsCountChange(count: number) {
    this.launchForm.installmentsCount = count;
    if (this.launchForm.installmentInputMode === 'total' && this.launchForm.amount) {
      this.launchForm.installmentValue = Number((this.launchForm.amount / count).toFixed(2));
    } else if (this.launchForm.installmentInputMode === 'per_installment' && this.launchForm.installmentValue) {
      this.launchForm.amount = Number((this.launchForm.installmentValue * count).toFixed(2));
    }
  }

  async saveTransaction() {
    if (!this.launchForm.description.trim() || !this.launchForm.amount || this.launchForm.amount <= 0) {
      this.toast.show('error', 'Atenção', 'Preencha descrição e valor!');
      return;
    }
    if (!this.launchForm.cardId) {
      this.toast.show('error', 'Atenção', 'Selecione um cartão!');
      return;
    }

    this.isSaving.set(true);
    console.log('[CreditCards] Iniciando salvamento de transação...', this.launchForm);
    try {
      if (this.launchForm.isInstallment && this.launchForm.installmentsCount > 1) {
        // Lógica de Parcelamento
        const totalAmount = this.launchForm.amount || 0;
        const count = this.launchForm.installmentsCount;
        const installmentValue = Number((totalAmount / count).toFixed(2));
        const groupId = this.generateGroupId();
        const baseDate = new Date(this.launchForm.date);
        
        const txs: Partial<SupabaseCardTransaction>[] = [];
        
        for (let i = 0; i < count; i++) {
          const date = new Date(baseDate);
          date.setMonth(baseDate.getMonth() + i);
          
          txs.push({
            card_id: this.launchForm.cardId,
            description: `${this.launchForm.description.trim()} (${i + 1}/${count})`,
            amount: installmentValue,
            date: date.toLocaleDateString('en-CA'),
            category: this.launchForm.category || 'Outros',
            status: this.launchForm.status,
            installment_number: i + 1,
            total_installments: count,
            installment_group_id: groupId
          });
        }

        console.log('[CreditCards] Preparando para inserir pacote de parcelas:', txs.length);
        const { error } = await this.supabase.createCardTransactions(txs);
        if (error) throw error;
        console.log('[CreditCards] Pacote inserido com sucesso.');

      } else {
        // Lançamento Simples
        console.log('[CreditCards] Inserindo lançamento simples.');
        const { error } = await this.supabase.createCardTransaction({
          card_id: this.launchForm.cardId,
          description: this.launchForm.description.trim(),
          amount: this.launchForm.amount || 0,
          date: this.launchForm.date,
          category: this.launchForm.category || 'Outros',
          status: this.launchForm.status
        });
        if (error) throw error;
        console.log('[CreditCards] Inserção de simples concluída.');
      }

      this.toast.show('success', 'Sucesso!', 'Lançamento(s) adicionado(s) com sucesso!');
      
      // Liberar UI e fechar ANTES do recarregamento de tela pesado
      this.isSaving.set(false);
      this.closeDrawer();

      // Reset form
      const savedCardId = this.launchForm.cardId;
      this.launchForm = {
        description: '',
        amount: null,
        category: '',
        date: new Date().toLocaleDateString('en-CA'),
        cardId: savedCardId,
        recurring: false,
        status: 'confirmed',
        isInstallment: false,
        installmentsCount: 2,
        installmentValue: null,
        installmentInputMode: 'total'
      };

      // Recarregar em background
      console.log('[CreditCards] Iniciando recarga de dados...');
      await this.reloadData();
      console.log('[CreditCards] Recarga concluída.');

    } catch (err) {
      console.error('[CreditCards] Erro FATAL ao salvar lançamento:', err);
      this.toast.show('error', 'Erro', 'Erro ao salvar lançamento. Verifique o console ou tente novamente.');
    } finally {
      // Garantia dupla de desbloqueio da interface
      if (this.isSaving()) {
        this.isSaving.set(false);
      }
    }
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
      await this.reloadData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      this.toast.show('error', 'Erro', 'Não foi possível excluir o lançamento.');
    } finally {
      this.isSaving.set(false);
      this.cancelDelete();
    }
  }

  cancelDelete() {
    this.showDeleteConfirm.set(false);
    this.transactionToDelete.set(null);
  }

  getBillStatus(): 'open' | 'closed' {
    const card = this.selectedBill()?.card;
    if (!card?.closing_date) return 'open';
    const today = new Date().getDate();
    return today <= (card.closing_date as number) ? 'open' : 'closed';
  }

  isBestPeriodToBuy(): boolean {
    const card = this.selectedBill()?.card;
    if (!card?.closing_date || !card?.due_date) return false;
    
    const today = new Date().getDate();
    const close = card.closing_date as number;
    const due = card.due_date as number;

    // Se o fechamento for antes do vencimento (mesmo mês)
    if (close < due) {
      return today >= close && today <= due;
    } 
    // Se o fechamento for depois do vencimento (virada de mês)
    else {
      return today >= close || today <= due;
    }
  }

  getDueDate(): string {
    const card = this.selectedBill()?.card;
    if (!card?.due_date) return '—';
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const now = new Date();
    
    // Se hoje passou do vencimento, o próximo vencimento é mês que vem
    let targetMonth = now.getMonth();
    if (now.getDate() > card.due_date) {
      targetMonth++;
      if (targetMonth > 11) targetMonth = 0;
    }

    return `${card.due_date} ${months[targetMonth]}`;
  }

  getUsagePercent(): number {
    const bill = this.selectedBill();
    if (!bill || bill.limit <= 0) return 0;
    return Math.min(100, (bill.currentBill / bill.limit) * 100);
  }

  darkenColor(hex: string): string {
    // Darken a hex color by ~20% for gradient
    try {
      const h = hex.replace('#', '');
      const r = Math.max(0, parseInt(h.substring(0, 2), 16) - 40);
      const g = Math.max(0, parseInt(h.substring(2, 4), 16) - 40);
      const b = Math.max(0, parseInt(h.substring(4, 6), 16) - 40);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch { return '#000000'; }
  }

  getCatColor(category?: string): string {
    const catColors: Record<string, string> = {
      alimentacao: '#f97316', alimentação: '#f97316', food: '#f97316',
      transporte: '#3b82f6', transport: '#3b82f6',
      compras: '#a855f7', shopping: '#a855f7',
      contas: '#eab308', utilities: '#eab308',
      saude: '#ef4444', health: '#ef4444', saúde: '#ef4444',
      lazer: '#06b6d4', entertainment: '#06b6d4',
      outros: '#64748b',
    };
    return catColors[(category || '').toLowerCase()] || '#64748b';
  }

  private getBillPaymentAccount(): SupabaseAccount | null {
    const nonCardAccounts = this.allAccounts().filter(a => a.account_type !== 'credit_card');
    if (nonCardAccounts.length === 0) return null;

    const mainChecking = nonCardAccounts.find(a => a.account_type === 'checking' && a.is_main_account);
    if (mainChecking) return mainChecking;

    const firstChecking = nonCardAccounts.find(a => a.account_type === 'checking');
    if (firstChecking) return firstChecking;

    const mainAny = nonCardAccounts.find(a => a.is_main_account);
    if (mainAny) return mainAny;

    return nonCardAccounts[0] ?? null;
  }

  getTxIcon(tx: SupabaseCardTransaction): { icon: string; bg: string; color: string } {
    const categoryMap: Record<string, { icon: string; bg: string; color: string }> = {
      alimentacao: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
      alimentação: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
      food: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
      transporte: { icon: 'directions_car', bg: 'bg-blue-50', color: 'text-blue-500' },
      transport: { icon: 'directions_car', bg: 'bg-blue-50', color: 'text-blue-500' },
      compras: { icon: 'shopping_bag', bg: 'bg-purple-50', color: 'text-purple-500' },
      shopping: { icon: 'shopping_bag', bg: 'bg-purple-50', color: 'text-purple-500' },
      contas: { icon: 'bolt', bg: 'bg-yellow-50', color: 'text-yellow-500' },
      utilities: { icon: 'bolt', bg: 'bg-yellow-50', color: 'text-yellow-500' },
      saude: { icon: 'local_hospital', bg: 'bg-red-50', color: 'text-red-500' },
      health: { icon: 'local_hospital', bg: 'bg-red-50', color: 'text-red-500' },
      lazer: { icon: 'sports_esports', bg: 'bg-cyan-50', color: 'text-cyan-500' },
      servicos: { icon: 'subscriptions', bg: 'bg-indigo-50', color: 'text-indigo-500' },
      serviços: { icon: 'subscriptions', bg: 'bg-indigo-50', color: 'text-indigo-500' },
    };
    const cat = (tx.category || '').toLowerCase();
    return categoryMap[cat] || { icon: 'receipt', bg: 'bg-slate-100', color: 'text-slate-500' };
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      // REGRAS SÊNIOR: Extrair apenas a data YYYY-MM-DD para evitar shifts de timezone (ex: 18/04 00:00 UTC vira 17/04 21:00 Local)
      const cleanDate = dateStr.split('T')[0];
      const parts = cleanDate.split('-');
      
      let d: Date;
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        d = new Date(y, m, day, 12, 0, 0);
      } else {
        d = new Date(dateStr);
      }

      if (isNaN(d.getTime())) return 'Data Inválida';
      
      const today = new Date();
      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
      
      if (sameDay(d, today)) return 'Hoje';
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      // Se a string original tinha 'T', tentamos mostrar a hora local mas baseada no shift original se necessário
      // No entanto, para cartões, a precisão do DIA é prioritária.
      const timeStr = dateStr.includes('T') ? new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      
      return `${d.getDate()} ${months[d.getMonth()]} ${timeStr}`.trim();
    } catch {
      return dateStr;
    }
  }

  executeExport() {
    const format = this.exportFormat();
    const list = this.filteredTransactions();
    if (list.length === 0) return;

    if (format === 'csv') {
      this.downloadCsv(list);
    } else {
      this.downloadXlsx(list);
    }
    this.showExportModal.set(false);
  }

  private downloadCsv(list: SupabaseCardTransaction[]) {
    const headers = ['Data', 'Descricao', 'Categoria', 'Valor (BRL)', 'Status'];
    const rows = list.map(tx => [
      new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR'),
      `"${tx.description}"`,
      tx.category || 'Outros',
      Number(tx.amount).toFixed(2).replace('.', ','),
      tx.status || 'confirmed'
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fatura_cartao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private downloadXlsx(list: SupabaseCardTransaction[]) {
    const data = list.map(tx => ({
      'Data': new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR'),
      'Descrição': tx.description,
      'Categoria': tx.category || 'Outros',
      'Valor (BRL)': tx.amount,
      'Status': tx.status || 'confirmed'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fatura');
    XLSX.writeFile(wb, `fatura_cartao_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
