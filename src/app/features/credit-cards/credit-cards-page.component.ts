import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService, SupabaseAccount, SupabaseTransaction, SupabaseCardTransaction } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';
import { NavigationService } from '../../core/services/navigation.service';

interface CardBill {
  card: SupabaseAccount;
  currentBill: number;
  limit: number;
  available: number;
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
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">

      <!-- Page Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Cartões</h1>
          <p class="text-slate-500 mt-1 font-medium">Gerencie suas faturas e lançamentos.</p>
        </div>
        <div class="flex gap-3">
          <button (click)="launchFullBill()" 
                  [disabled]="!canLaunchBill() || isSaving()"
                  [class.opacity-50]="!canLaunchBill()"
                  [class.cursor-not-allowed]="!canLaunchBill()"
                  class="px-5 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <mat-icon class="text-[20px]">receipt_long</mat-icon>
            Lançar Fatura
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
        <div class="flex flex-col items-center justify-center h-64 gap-4 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <mat-icon class="text-[64px]">credit_card_off</mat-icon>
          <p class="font-bold text-lg text-slate-600">Nenhum cartão cadastrado</p>
          <p class="text-sm text-center max-w-xs">Adicione um cartão de crédito nas suas contas para visualizar a fatura aqui.</p>
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
                <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Total Gasto</p>
                <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <mat-icon class="text-[20px]">trending_down</mat-icon>
                </div>
              </div>
              <p class="text-2xl font-black text-red-600">R$ {{ selectedBill()!.currentBill | number:'1.2-2' }}</p>
              <p class="text-[12px] font-bold text-slate-400 mt-1">{{ selectedBill()!.transactions.length }} lançamentos</p>
            </div>
            
            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
              <div class="flex justify-between items-start mb-4">
                <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Disponível</p>
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <mat-icon class="text-[20px]">wallet</mat-icon>
                </div>
              </div>
              <p class="text-2xl font-black text-emerald-600">R$ {{ selectedBill()!.available | number:'1.2-2' }}</p>
              <p class="text-[12px] font-bold text-slate-400 mt-1">de R$ {{ selectedBill()!.limit | number:'1.2-2' }} de limite</p>
            </div>

            <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-slate-200 transition-colors group">
              <div class="flex justify-between items-start mb-4">
                <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Lançamentos</p>
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <mat-icon class="text-[20px]">receipt_long</mat-icon>
                </div>
              </div>
              <p class="text-2xl font-black text-slate-900">{{ selectedBill()!.transactions.length }}</p>
              <p class="text-[12px] font-bold text-slate-400 mt-1">nesta fatura</p>
            </div>
          </div>

          <!-- Transaction List -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="flex items-center justify-between p-8 border-b border-slate-50">
              <h3 class="text-lg font-black text-slate-800">Lançamentos Recentes</h3>
              <div class="flex gap-4 items-center">
                <button (click)="navigateTo('lancamentos')" class="text-[10px] font-bold text-indigo-600 uppercase hover:underline">Ver Todos</button>
                <button (click)="exportCsv()" class="px-4 h-10 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
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
                    <div class="text-right">
                      <p class="text-lg font-black text-red-600">R$ {{ tx.amount | number:'1.2-2' }}</p>
                      <p class="text-[11px] font-bold uppercase tracking-wider mt-0.5" [class.text-slate-400]="tx.status !== 'pending'" [class.text-amber-500]="tx.status === 'pending'">
                        {{ tx.status === 'pending' ? 'Pendente' : 'Confirmado' }}
                      </p>
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
            <p class="text-[12px] font-medium text-slate-400 mt-0.5">Adicione uma nova despesa no cartão</p>
          </div>
          <button (click)="closeDrawer()" class="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors mt-0.5">
            <mat-icon class="text-[20px]">close</mat-icon>
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          <!-- Descrição -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Descrição</label>
            <input
              type="text"
              [ngModel]="launchForm.description"
              (ngModelChange)="launchForm.description = $event"
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
                (ngModelChange)="launchForm.amount = $event"
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
                  [ngModel]="launchForm.category"
                  (ngModelChange)="launchForm.category = $event"
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
                [ngModel]="launchForm.date"
                (ngModelChange)="launchForm.date = $event"
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all">
            </div>
          </div>

          <!-- Selecionar Cartão -->
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Selecionar Cartão</label>
            <div class="relative">
              <select
                [ngModel]="launchForm.cardId"
                (ngModelChange)="launchForm.cardId = $event"
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer">
                @for (bill of cardBills(); track bill.card.id) {
                  <option [value]="bill.card.id">{{ bill.card.institution_name }} (•••• {{ bill.lastDigits }})</option>
                }
              </select>
              <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</mat-icon>
            </div>
          </div>

          <!-- Gasto Recorrente Toggle -->
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
            (click)="saveLaunch()"
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

  launchForm: {
    description: string;
    amount: number | null;
    category: string;
    date: string;
    cardId: string;
    recurring: boolean;
    status: 'confirmed' | 'pending';
  } = {
    description: '',
    amount: null,
    category: '',
    date: new Date().toLocaleDateString('en-CA'),
    cardId: '',
    recurring: false,
    status: 'confirmed'
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
      const currentBill = Math.max(0, cardTxs
        .filter(tx => tx.status === 'confirmed')
        .reduce((s, t) => s + Number(t.amount), 0));
      const limit = Number(card.credit_limit || 0);
      const available = Math.max(0, limit - currentBill);

      return {
        card,
        currentBill,
        limit,
        available,
        lastDigits: (card as any).account_number?.slice(-4) || '0000',
        color: card.color || '#0F172A',
        transactions: cardTxs.sort((a, b) => b.date.localeCompare(a.date))
      };
    });
  });

  selectedBill = computed<CardBill | null>(() => {
    return this.cardBills().find(b => b.card.id === this.selectedCardId()) ?? this.cardBills()[0] ?? null;
  });

  filteredTransactions = computed(() => {
    const bill = this.selectedBill();
    if (!bill) return [];
    const query = this.searchQuery().toLowerCase().trim();
    return bill.transactions.filter(tx =>
      !query || tx.description.toLowerCase().includes(query) || (tx.category || '').toLowerCase().includes(query)
    );
  });

  categoryBreakdown = computed<CategorySummary[]>(() => {
    const bill = this.selectedBill();
    if (!bill) return [];
    const total = bill.currentBill;
    if (total === 0) return [];

    const catMap = new Map<string, number>();
    bill.transactions
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

    return Array.from(catMap.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        icon: 'label',
        color: catColors[name.toLowerCase()] || '#64748b',
        percent: total > 0 ? (amount / total) * 100 : 0
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

      // Auto-select first card
      const first = this.cardBills()[0];
      if (first) {
        this.selectedCardId.set(first.card.id);
        this.launchForm.cardId = first.card.id;
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  canLaunchBill = computed(() => {
    const bill = this.selectedBill();
    if (!bill || bill.currentBill <= 0) return false;
    if (!this.isBestPeriodToBuy()) return false;

    // Verificar se já existe um lançamento de pagamento este mês/ciclo
    const hasPayment = this.allTransactions().some(tx =>
      tx.description.includes('Pagamento Fatura') &&
      tx.description.includes(bill.card.institution_name) &&
      new Date(tx.date).getMonth() === new Date().getMonth()
    );

    return !hasPayment;
  });

  async launchFullBill() {
    const bill = this.selectedBill();
    if (!bill || !this.canLaunchBill()) return;

    this.isSaving.set(true);
    try {
      const paymentAccount = this.getBillPaymentAccount();
      if (!paymentAccount) {
        this.toast.show('error', 'Conta não encontrada', 'Cadastre uma conta corrente para lançar o pagamento da fatura.');
        return;
      }

      const now = new Date();
      const monthYear = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

      const newTx: Partial<SupabaseTransaction> = {
        account_id: paymentAccount.id,
        description: `Pagamento Fatura - ${bill.card.institution_name} - ${monthYear}`,
        amount: bill.currentBill,
        date: now.toLocaleDateString('en-CA'),
        category: 'Pagamento',
        type: 'expense',
        status: 'pending'
      };

      const { error } = await this.supabase.createTransaction(newTx);

      if (error) throw error;

      this.toast.show('success', 'Sucesso', 'Fatura lançada com sucesso!');

      await this.reloadData();

    } catch (err) {
      console.error(err);
      this.toast.show('error', 'Erro', 'Erro ao lançar fatura.');
    } finally {
      this.isSaving.set(false);
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

  openDrawer() {
    // Pre-fill cardId to currently selected card
    const current = this.selectedBill();
    if (current) this.launchForm.cardId = current.card.id;
    this.launchForm.date = new Date().toLocaleDateString('en-CA');
    this.showDrawer.set(true);
  }

  closeDrawer() {
    this.showDrawer.set(false);
  }

  async saveLaunch() {
    if (!this.launchForm.description.trim() || !this.launchForm.amount || this.launchForm.amount <= 0) {
      this.toast.show('error', 'Atenção', 'Preencha descrição e valor!');
      return;
    }
    if (!this.launchForm.cardId) {
      this.toast.show('error', 'Atenção', 'Selecione um cartão!');
      return;
    }

    this.isSaving.set(true);
    try {
      const { error } = await this.supabase.createCardTransaction({
        card_id: this.launchForm.cardId,
        description: this.launchForm.description.trim(),
        amount: this.launchForm.amount,
        date: this.launchForm.date,
        category: this.launchForm.category || 'Outros',
        status: this.launchForm.status
      });

      if (error) throw error;

      this.toast.show('success', 'Sucesso!', 'Lançamento adicionado com sucesso!');
      this.closeDrawer();

      // Reset form
      this.launchForm = {
        description: '',
        amount: null,
        category: '',
        date: new Date().toLocaleDateString('en-CA'),
        cardId: this.launchForm.cardId,
        recurring: false,
        status: 'confirmed'
      };

      await this.reloadData();

    } catch {
      this.toast.show('error', 'Erro', 'Erro ao salvar lançamento.');
    } finally {
      this.isSaving.set(false);
    }
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
    return `${card.due_date} ${months[now.getMonth()]}`;
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
      const isIsoString = dateStr.includes('T');
      const d = new Date(isIsoString ? dateStr : dateStr + 'T12:00:00');
      if (isNaN(d.getTime())) return 'Data Inválida';
      
      const today = new Date();
      const sameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
      
      if (sameDay(d, today)) return 'Hoje';
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${d.getDate()} ${months[d.getMonth()]} ${isIsoString ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}`.trim();
    } catch {
      return dateStr;
    }
  }

  exportCsv() {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return;
    const headers = ['Data', 'Descricao', 'Categoria', 'Valor (BRL)', 'Status'];
    const rows = txs.map(tx => [
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
}
