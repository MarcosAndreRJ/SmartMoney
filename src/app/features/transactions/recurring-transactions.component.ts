import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';
import { NavigationService } from '../../core/services/navigation.service';
import { ResultModalComponent } from '../../shared/components/result-modal.component';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RecurringSchedulerService } from '../../core/services/recurring-scheduler.service';

export interface RecurringItem {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  frequency: string;
  start_date: string;
  early_alert_days: number;
  is_active: boolean;
  type: 'income' | 'expense';
  recurrence_type: 'fixed' | 'installment';
  installments_total?: number;
  installments_paid: number;
  icon: string;
  color: string;
  bg_color: string;
  is_archived: boolean;
  account_id?: string;
}

@Component({
  selector: 'app-recurring-transactions',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    ReactiveFormsModule, 
    FormsModule, 
    ResultModalComponent, 
    ConfirmModalComponent,
    MatMenuModule,
    MatButtonModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      
      <!-- Modals -->
      @if (showResult()) {
        <app-result-modal 
          [isSuccess]="resultSuccess()"
          [message]="resultMessage()"
          (confirm)="onResultConfirm()">
        </app-result-modal>
      }

      @if (showConfirmDelete()) {
        <app-confirm-modal
          title="Confirmar Exclusão"
          message="Tem certeza que deseja excluir esta transação recorrente? Esta ação não poderá ser desfeita."
          (confirm)="deleteTransaction()"
          (cancel)="showConfirmDelete.set(false)">
        </app-confirm-modal>
      }

      <header class="mb-10">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 class="text-[32px] font-extrabold tracking-tight text-slate-900 leading-tight">Transações Recorrentes</h1>
            <p class="text-slate-400 text-sm mt-2 font-medium">Automatize suas receitas e despesas regulares para um melhor controle.</p>
          </div>
          <button (click)="showSettings.set(!showSettings())"
            class="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <mat-icon class="text-lg">tune</mat-icon>
            Configurações
          </button>
        </div>

        <!-- Scheduler Settings Panel -->
        @if (showSettings()) {
          <div class="mt-6 bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 animate-in slide-in-from-top-2 duration-300">
            <div class="flex items-center gap-3 mb-8">
              <div class="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <mat-icon class="text-lg">auto_mode</mat-icon>
              </div>
              <div>
                <h3 class="text-base font-bold text-slate-900">Geração Automática de Lançamentos</h3>
                <p class="text-xs text-slate-400">Configure como as transações recorrentes geram entradas em Lançamentos.</p>
              </div>
            </div>

            <div class="space-y-6">
              <!-- Auto-generate toggle -->
              <div class="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p class="text-sm font-bold text-slate-900">Gerar ao abrir o app</p>
                  <p class="text-xs text-slate-400 mt-0.5">Verifica e cria os lançamentos pendentes automaticamente toda vez que você acessa o app.</p>
                </div>
                <mat-slide-toggle
                  [checked]="schedulerSettings().autoGenerateOnOpen"
                  (change)="toggleAutoGenerate($event.checked)">
                </mat-slide-toggle>
              </div>

              <!-- Generation Period selector -->
              <div class="space-y-3">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Horizonte de Geração</label>
                <p class="text-xs text-slate-400">Gera somente os lançamentos pendentes dentro do período escolhido.</p>
                <div class="grid grid-cols-3 gap-3 pt-1">
                  @for (days of [30, 60, 90]; track days) {
                    <button type="button"
                      (click)="setGenerationHorizon(days)"
                      class="h-12 rounded-xl border-2 font-bold text-sm transition-all"
                      [class.border-indigo-600]="schedulerSettings().generationHorizonDays === days"
                      [class.bg-indigo-50]="schedulerSettings().generationHorizonDays === days"
                      [class.text-indigo-700]="schedulerSettings().generationHorizonDays === days"
                      [class.border-slate-100]="schedulerSettings().generationHorizonDays !== days"
                      [class.bg-slate-50]="schedulerSettings().generationHorizonDays !== days"
                      [class.text-slate-500]="schedulerSettings().generationHorizonDays !== days">
                      {{ days }} dias
                    </button>
                  }
                </div>
              </div>

              <!-- Manual run button -->
              <div class="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  (click)="runSchedulerNow()"
                  [disabled]="scheduler.isRunning()"
                  class="flex-1 h-12 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <mat-icon class="text-lg">{{ scheduler.isRunning() ? 'hourglass_empty' : 'play_arrow' }}</mat-icon>
                  {{ scheduler.isRunning() ? 'Processando...' : 'Gerar Lançamentos Agora' }}
                </button>
                @if (scheduler.lastRunAt()) {
                  <div class="flex items-center gap-2 text-xs text-slate-400 justify-center sm:justify-start">
                    <mat-icon class="text-sm">check_circle</mat-icon>
                    {{ scheduler.generatedCount() }} lançamentos gerados
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </header>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Left Column: Form -->
        <div class="lg:col-span-12 xl:col-span-7">
          <div class="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 p-10">
            <div class="flex items-center gap-3 mb-10">
              <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                <mat-icon class="text-xl">{{ isEditing() ? 'edit' : 'add' }}</mat-icon>
              </div>
              <h2 class="text-xl font-bold text-slate-900 tracking-tight">{{ isEditing() ? 'Editar' : 'Cadastrar Nova' }} Transação</h2>
            </div>

            <form [formGroup]="recurringForm" (ngSubmit)="saveTransaction()" class="space-y-10">
              <!-- Income/Expense Toggle -->
              <div class="flex p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                <button type="button" (click)="setTransactionType('income')"
                  class="flex-1 py-3.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  [class.bg-white]="transactionType() === 'income'"
                  [class.shadow-md]="transactionType() === 'income'"
                  [class.text-emerald-600]="transactionType() === 'income'"
                  [class.text-slate-400]="transactionType() !== 'income'">
                  <mat-icon class="text-lg" *ngIf="transactionType() === 'income'">trending_up</mat-icon>
                  Receita
                </button>
                <button type="button" (click)="setTransactionType('expense')"
                  class="flex-1 py-3.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  [class.bg-white]="transactionType() === 'expense'"
                  [class.shadow-md]="transactionType() === 'expense'"
                  [class.text-red-600]="transactionType() === 'expense'"
                  [class.text-slate-400]="transactionType() !== 'expense'">
                  <mat-icon class="text-lg" *ngIf="transactionType() === 'expense'">trending_down</mat-icon>
                  Despesa
                </button>
              </div>

              <!-- Fixed/Installments Selection -->
              <div class="grid grid-cols-2 gap-6">
                <button type="button" (click)="setRecurrenceType('fixed')"
                  class="p-6 rounded-2xl border-2 text-left transition-all group relative overflow-hidden"
                  [class.border-indigo-600]="recurrenceType() === 'fixed'"
                  [class.bg-indigo-50/30]="recurrenceType() === 'fixed'"
                  [class.border-slate-50]="recurrenceType() !== 'fixed'"
                  [class.bg-slate-50]="recurrenceType() !== 'fixed'">
                  <p class="text-base font-bold text-slate-900">Fixo</p>
                  <p class="text-[11px] text-slate-400 mt-1 font-medium uppercase tracking-wider">Repete indefinidamente</p>
                  <div *ngIf="recurrenceType() === 'fixed'" class="absolute top-2 right-2 text-indigo-600">
                    <mat-icon class="text-lg">check_circle</mat-icon>
                  </div>
                </button>
                <button type="button" (click)="setRecurrenceType('installment')"
                  class="p-6 rounded-2xl border-2 text-left transition-all group relative overflow-hidden"
                  [class.border-indigo-600]="recurrenceType() === 'installment'"
                  [class.bg-indigo-50/30]="recurrenceType() === 'installment'"
                  [class.border-slate-50]="recurrenceType() !== 'installment'"
                  [class.bg-slate-50]="recurrenceType() !== 'installment'">
                  <p class="text-base font-bold text-slate-900">Parcelado</p>
                  <p class="text-[11px] text-slate-400 mt-1 font-medium uppercase tracking-wider">Número limitado de vezes</p>
                  <div *ngIf="recurrenceType() === 'installment'" class="absolute top-2 right-2 text-indigo-600">
                    <mat-icon class="text-lg">check_circle</mat-icon>
                  </div>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-8">
                <div class="space-y-3">
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nome da Transação</label>
                  <input formControlName="name" type="text" placeholder="Ex: Assinatura Netflix"
                    class="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium text-slate-900">
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-3">
                    <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Valor (R$)</label>
                    <input formControlName="amount" type="number" placeholder="0,00"
                      class="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-slate-900">
                  </div>
                  <div class="space-y-3" *ngIf="recurrenceType() === 'installment'">
                    <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Qtd. Parcelas</label>
                    <input formControlName="installments_total" type="number" placeholder="1"
                      class="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-slate-900">
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-3">
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Categoria</label>
                  <div class="relative">
                    <select formControlName="category"
                      class="w-full h-14 px-5 appearance-none bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium text-slate-900">
                      @for (cat of categories(); track cat.id) {
                        <option [value]="cat.name">{{ cat.name }}</option>
                      }
                    </select>
                    <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
                  </div>
                </div>
                <div class="space-y-3">
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Frequência</label>
                  <div class="relative">
                    <select formControlName="frequency"
                      class="w-full h-14 px-5 appearance-none bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium text-slate-900">
                      <option value="Mensal">Mensal</option>
                      <option value="Semanal">Semanal</option>
                      <option value="Anual">Anual</option>
                      <option value="Diário">Diário</option>
                    </select>
                    <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-3">
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Data de Início</label>
                  <input formControlName="start_date" type="date"
                    class="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium text-slate-900">
                </div>
                <div class="space-y-3">
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Alerta Antecipado
                    <mat-icon class="text-[14px] w-[14px] h-[14px] text-slate-300">info</mat-icon>
                  </label>
                  <div class="relative">
                    <input formControlName="early_alert_days" type="number" placeholder="3"
                      class="w-full h-14 px-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium text-slate-900">
                    <span class="absolute right-5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">dias antes</span>
                  </div>
                </div>
              </div>

              <!-- Account selector -->
              <div class="space-y-3">
                <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Conta para Lançamentos</label>
                <div class="relative">
                  <select formControlName="account_id"
                    class="w-full h-14 px-5 appearance-none bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium text-slate-900">
                    <option value="">Selecionar conta...</option>
                    @for (acc of accounts(); track acc.id) {
                      <option [value]="acc.id">{{ acc.institution_name }}</option>
                    }
                  </select>
                  <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
                </div>
              </div>

              <div class="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm">
                    <mat-icon class="text-lg">power_settings_new</mat-icon>
                  </div>
                  <span class="text-sm font-bold text-slate-700">Status Ativo</span>
                </div>
                <mat-slide-toggle formControlName="is_active" color="primary"></mat-slide-toggle>
              </div>

              <div class="flex items-center gap-4 pt-4">
                <button type="button" *ngIf="isEditing()" (click)="cancelEdit()"
                  class="px-8 py-4 text-slate-400 font-bold text-sm hover:text-slate-900 transition-colors">
                  Cancelar
                </button>
                <button type="submit" [disabled]="recurringForm.invalid"
                  class="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 transform active:scale-[0.98]">
                  <mat-icon class="text-[20px]">{{ isEditing() ? 'check' : 'save_alt' }}</mat-icon>
                  {{ isEditing() ? 'Salvar Alterações' : 'Salvar Transação Recorrente' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Right Column: Active Recurrences & Summaries -->
        <div class="lg:col-span-12 xl:col-span-5 space-y-8">
          <div class="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 p-10 overflow-hidden relative">
            <div class="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
              <div class="flex items-center gap-8">
                <button (click)="activeTab.set('ativas')" 
                  class="relative py-2 text-sm font-bold transition-all"
                  [class.text-slate-900]="activeTab() === 'ativas'"
                  [class.text-slate-400]="activeTab() !== 'ativas'">
                  Ativas
                  <div *ngIf="activeTab() === 'ativas'" class="absolute -bottom-[25px] left-0 w-full h-1 bg-slate-900 rounded-full"></div>
                </button>
                <button (click)="activeTab.set('arquivadas')" 
                  class="relative py-2 text-sm font-bold transition-all"
                  [class.text-slate-900]="activeTab() === 'arquivadas'"
                  [class.text-slate-400]="activeTab() !== 'arquivadas'">
                  Arquivadas
                  <div *ngIf="activeTab() === 'arquivadas'" class="absolute -bottom-[25px] left-0 w-full h-1 bg-slate-900 rounded-full"></div>
                </button>
              </div>
              
              <div class="flex items-center gap-4">
                <div class="relative">
                  <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
                  <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Filtrar..."
                    class="w-32 h-9 pl-9 pr-3 bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none focus:ring-1 focus:ring-indigo-600 font-medium">
                </div>
                <div class="relative">
                  <select [ngModel]="filterType()" (ngModelChange)="filterType.set($event)"
                    class="h-9 pl-3 pr-8 appearance-none bg-slate-50 border border-slate-100 rounded-lg text-[11px] outline-none font-bold text-slate-900">
                    <option value="Todas">Todas</option>
                    <option value="Receita">Receita</option>
                    <option value="Despesa">Despesa</option>
                  </select>
                  <mat-icon class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</mat-icon>
                </div>
              </div>
            </div>

            <div class="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              @for (item of filteredRecurrences(); track item.id) {
                <div class="p-6 rounded-[24px] border border-slate-50 hover:bg-slate-50/30 transition-all flex items-center gap-5 group">
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    [style.backgroundColor]="item.bg_color"
                    [style.color]="item.color">
                    <mat-icon class="text-xl">{{ item.icon }}</mat-icon>
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-1">
                      <p class="text-sm font-bold text-slate-900 truncate">{{ item.name }}</p>
                      <p class="text-sm font-extrabold"
                        [class.text-emerald-500]="item.type === 'income'"
                        [class.text-red-500]="item.type === 'expense'">
                        {{ item.type === 'income' ? '+' : '-' }}R$ {{ item.amount | number:'1.2-2' }}
                      </p>
                    </div>
                    <p class="text-[11px] text-slate-400 font-medium">
                      {{ item.frequency }} • {{ item.category }}
                      @if (item.recurrence_type === 'installment') { • ({{ item.installments_paid }}/{{ item.installments_total }}x) }
                    </p>
                  </div>

                  <button [matMenuTriggerFor]="menu" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu" panelClass="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <button mat-menu-item (click)="startEdit(item)">
                      <mat-icon class="text-slate-400">edit</mat-icon>
                      <span class="text-slate-600 font-medium">Editar</span>
                    </button>
                    <button mat-menu-item (click)="toggleArchive(item)">
                      <mat-icon class="text-slate-400">{{ item.is_archived ? 'unarchive' : 'archive' }}</mat-icon>
                      <span class="text-slate-600 font-medium">{{ item.is_archived ? 'Desarquivar' : 'Arquivar' }}</span>
                    </button>
                    <button mat-menu-item (click)="confirmDelete(item.id)">
                      <mat-icon class="text-red-400">delete</mat-icon>
                      <span class="text-red-500 font-medium">Excluir</span>
                    </button>
                  </mat-menu>
                </div>
              } @empty {
                <div class="py-16 flex flex-col items-center text-center">
                  <div class="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
                    <mat-icon class="text-3xl">inbox</mat-icon>
                  </div>
                  <h3 class="text-slate-900 font-bold text-sm mb-1">Sem transações</h3>
                  <p class="text-slate-400 text-[11px] font-medium leading-relaxed">Não há transações nesta listagem.</p>
                </div>
              }
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="space-y-6">
            <!-- Monthly Balance Predict -->
            <div class="bg-gradient-to-br from-[#0B1220] to-[#1A2537] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
              <div class="flex items-center justify-between relative z-10">
                <div class="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/5">
                  <mat-icon class="text-emerald-400">trending_up</mat-icon>
                </div>
                <div class="text-right">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[2px] mb-1">Previsão de Saldo Mensal</p>
                  <h3 class="text-3xl font-extrabold tracking-tight" [class.text-emerald-400]="monthlyBalance() >= 0" [class.text-red-400]="monthlyBalance() < 0">
                    {{ monthlyBalance() >= 0 ? '+' : '-' }}R$ {{ Math.abs(monthlyBalance()) | number:'1.2-2' }}
                  </h3>
                </div>
              </div>
              
              <div class="mt-10 relative z-10">
                <div class="flex justify-between items-end mb-3">
                  <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Saldo Estimado</p>
                    <p class="text-lg font-bold text-emerald-400">+R$ 5.650,00</p>
                  </div>
                  <div class="text-right bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p class="text-[9px] font-bold text-slate-400 uppercase mb-1">Impacto de Recorrentes</p>
                    <p class="text-base font-bold text-red-400">- R$ 2.850</p>
                    <p class="text-[9px] text-red-300 font-medium">32% da renda total</p>
                  </div>
                </div>
                <div class="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.3)]" [style.width.%]="balancePercentage()"></div>
                </div>
                <div class="flex justify-between mt-3 px-1">
                  <span class="text-[9px] font-bold text-slate-500 uppercase">Meta de Economia (75%)</span>
                  <span class="text-[9px] font-bold text-slate-500 uppercase">Estimado Final</span>
                </div>
              </div>

              <!-- Background Polish -->
              <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]"></div>
              <div class="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-[60px]"></div>
            </div>

            <div class="grid grid-cols-2 gap-6">
              <div class="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <mat-icon>calendar_today</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Próximos 7 dias</p>
                  <p class="text-sm font-bold text-slate-900">2 Pagamentos</p>
                </div>
              </div>
              <div class="bg-white rounded-[28px] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <mat-icon>savings</mat-icon>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Economia Potencial</p>
                  <p class="text-sm font-bold text-slate-900">R$ 1.200,00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
  `]
})
export class RecurringTransactionsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private loadingService = inject(LoadingService);
  scheduler = inject(RecurringSchedulerService);

  // Settings panel
  showSettings = signal(false);
  schedulerSettings = signal(this.scheduler.getSettings());
  accounts = signal<any[]>([]);
  
  // Expose Math to template
  Math = Math;

  // View State
  transactionType = signal<'income' | 'expense'>('expense');
  recurrenceType = signal<'fixed' | 'installment'>('fixed');
  isEditing = signal(false);
  editingId = signal<string | null>(null);

  // Data State
  recurrences = signal<RecurringItem[]>([]);
  categories = signal<any[]>([]);
  
  // Filter State
  searchQuery = signal('');
  filterType = signal('Todas');
  activeTab = signal<'ativas' | 'arquivadas'>('ativas');

  // Modal State
  showResult = signal(false);
  resultSuccess = signal(true);
  resultMessage = signal('');
  showConfirmDelete = signal(false);
  idToDelete = signal<string | null>(null);

  filteredRecurrences = computed(() => {
    let list = this.recurrences();
    const query = this.searchQuery().toLowerCase().trim();
    const typeFilter = this.filterType();
    const currentTab = this.activeTab();
    
    // First filter by archive status
    list = list.filter(item => currentTab === 'arquivadas' ? item.is_archived : !item.is_archived);

    if (query) {
      list = list.filter(item => item.name?.toLowerCase().includes(query));
    }

    if (typeFilter !== 'Todas') {
      const type = typeFilter === 'Receita' ? 'income' : 'expense';
      list = list.filter(item => item.type === type);
    }

    return list;
  });

  monthlyBalance = computed(() => {
    return this.recurrences().reduce((acc, item) => {
      const val = Number(item.amount);
      return item.type === 'income' ? acc + val : acc - val;
    }, 0);
  });

  balancePercentage = computed(() => {
    const list = this.recurrences();
    if (list.length === 0) return 0;
    const income = list.filter(i => i.type === 'income').reduce((acc, i) => acc + Number(i.amount), 0);
    const expense = list.filter(i => i.type === 'expense').reduce((acc, i) => acc + Number(i.amount), 0);
    if (income === 0) return expense > 0 ? 100 : 0;
    return Math.min(Math.round((expense / income) * 100), 100);
  });

  recurringForm = this.fb.group({
    name: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: ['Moradia', [Validators.required]],
    frequency: ['Mensal', [Validators.required]],
    start_date: [new Date().toLocaleDateString('en-CA'), [Validators.required]],
    early_alert_days: [3, [Validators.required, Validators.min(0)]],
    is_active: [true],
    installments_total: [1, [Validators.min(1)]],
    account_id: ['' as string | null]
  });

  async ngOnInit() {
    await this.loadData();
    await this.loadCategories();
    await this.loadAccounts();
  }

  private async loadAccounts() {
    const { data } = await this.supabase.getAccounts();
    this.accounts.set(data || []);
  }

  toggleAutoGenerate(value: boolean) {
    const s = { ...this.schedulerSettings(), autoGenerateOnOpen: value };
    this.scheduler.saveSettings(s);
    this.schedulerSettings.set(s);
  }

  setGenerationHorizon(days: number) {
    const s = { ...this.schedulerSettings(), generationHorizonDays: days as 30 | 60 | 90 };
    this.scheduler.saveSettings(s);
    this.schedulerSettings.set(s);
  }

  async runSchedulerNow() {
    await this.scheduler.runScheduler();
  }

  async loadData() {
    this.loadingService.show('Carregando transações...');
    try {
      const { data, error } = await this.supabase.client
        .from('recurring_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.recurrences.set(data || []);
    } catch (err) {
      console.error('Error loading recurrences:', err);
    } finally {
      this.loadingService.hide();
    }
  }

  async loadCategories() {
    try {
      const { data, error } = await this.supabase.client
        .from('categories')
        .select('id, name')
        .is('parent_id', null);
      
      if (error) throw error;
      this.categories.set(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  setTransactionType(type: 'income' | 'expense') {
    this.transactionType.set(type);
  }

  setRecurrenceType(type: 'fixed' | 'installment') {
    this.recurrenceType.set(type);
  }

  startEdit(item: RecurringItem) {
    this.isEditing.set(true);
    this.editingId.set(item.id);
    this.transactionType.set(item.type);
    this.recurrenceType.set(item.recurrence_type);
    
    this.recurringForm.patchValue({
      name: item.name,
      amount: item.amount,
      category: item.category,
      frequency: item.frequency,
      start_date: item.start_date,
      early_alert_days: item.early_alert_days,
      is_active: item.is_active,
      installments_total: item.installments_total,
      account_id: item.account_id || ''
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.recurringForm.reset({
      category: 'Moradia',
      frequency: 'Mensal',
      start_date: new Date().toLocaleDateString('en-CA'),
      early_alert_days: 3,
      is_active: true,
      installments_total: 1,
      account_id: ''
    });
  }

  async saveTransaction() {
    if (this.recurringForm.invalid) return;

    this.loadingService.show(this.isEditing() ? 'Atualizando...' : 'Salvando...');
    try {
      const formValue = this.recurringForm.getRawValue();
      const user = (await this.supabase.client.auth.getUser()).data.user;

      const payload = {
        user_id: user?.id,
        name: formValue.name,
        amount: formValue.amount,
        category: formValue.category,
        frequency: formValue.frequency,
        start_date: formValue.start_date,
        early_alert_days: formValue.early_alert_days,
        type: this.transactionType(),
        recurrence_type: this.recurrenceType(),
        is_active: formValue.is_active,
        installments_total: this.recurrenceType() === 'installment' ? formValue.installments_total : null,
        account_id: formValue.account_id || null,
        icon: this.getIconForCategory(formValue.category!),
        color: this.transactionType() === 'income' ? '#10B981' : '#EF4444',
        bg_color: this.transactionType() === 'income' ? '#ECFDF5' : '#FEF2F2'
      };

      if (this.isEditing()) {
        const { error } = await this.supabase.client
          .from('recurring_transactions')
          .update(payload)
          .eq('id', this.editingId());
        if (error) throw error;
      } else {
        const { error } = await this.supabase.client
          .from('recurring_transactions')
          .insert(payload);
        if (error) throw error;
      }

      this.resultSuccess.set(true);
      this.resultMessage.set('As informações da sua transação recorrente foram salvas e atualizadas.');
      this.showResult.set(true);
      this.cancelEdit();
      await this.loadData();
    } catch (err: any) {
      console.error('Error saving transaction:', err);
      this.resultSuccess.set(false);
      this.resultMessage.set(err.message || 'Erro ao salvar transação recorrente.');
      this.showResult.set(true);
    } finally {
      this.loadingService.hide();
    }
  }

  confirmDelete(id: string) {
    this.idToDelete.set(id);
    this.showConfirmDelete.set(true);
  }

  async deleteTransaction() {
    if (!this.idToDelete()) return;

    this.showConfirmDelete.set(false);
    this.loadingService.show('Excluindo...');
    try {
      const { error } = await this.supabase.client
        .from('recurring_transactions')
        .delete()
        .eq('id', this.idToDelete());

      if (error) throw error;
      
      this.idToDelete.set(null);
      await this.loadData();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    } finally {
      this.loadingService.hide();
    }
  }

  async toggleArchive(item: RecurringItem) {
    this.loadingService.show(item.is_archived ? 'Desarquivando...' : 'Arquivando...');
    try {
      const { error } = await this.supabase.client
        .from('recurring_transactions')
        .update({ is_archived: !item.is_archived })
        .eq('id', item.id);

      if (error) throw error;
      await this.loadData();
    } catch (err) {
      console.error('Error toggling archive:', err);
    } finally {
      this.loadingService.hide();
    }
  }

  onResultConfirm() {
    this.showResult.set(false);
  }

  getDayFromDate(dateStr: string): string {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.getUTCDate().toString().padStart(2, '0');
  }

  private getIconForCategory(category: string): string {
    const map: Record<string, string> = { 
      'Moradia': 'home', 
      'Salário': 'work', 
      'Alimentação': 'restaurant', 
      'Transporte': 'directions_car',
      'Educação': 'school',
      'Lazer': 'celebration',
      'Saúde': 'favorite'
    };
    return map[category] || 'payments';
  }
}
