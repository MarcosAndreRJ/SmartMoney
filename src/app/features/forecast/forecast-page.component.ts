import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ForecastService, ForecastIntelligence, ForecastScenario, ForecastEvent, TimelinePoint } from '../../core/services/forecast.service';

@Component({
  selector: 'app-forecast-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F8FAFC] pb-12 relative">
      <!-- Drilldown Modal / Overlay -->
      @if (selectedMetric()) {
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all" (click)="selectedMetric.set(null)">
          <div class="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden" (click)="$event.stopPropagation()">
            <div class="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 class="text-xl font-black text-slate-800">{{ getMetricTitle(selectedMetric()!) }}</h3>
                <p class="text-xs font-medium text-slate-400 mt-1">Detalhamento da composição do valor</p>
              </div>
              <button (click)="selectedMetric.set(null)" class="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <div class="p-4 max-h-[60vh] overflow-y-auto">
              <div class="divide-y divide-slate-50">
                @for (item of compositionData(); track item.label) {
                  <div class="py-4 flex items-center justify-between px-4 hover:bg-slate-50 rounded-2xl transition-colors">
                    <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <mat-icon>{{ item.icon || 'circle' }}</mat-icon>
                      </div>
                      <div>
                        <p class="text-sm font-bold text-slate-700">{{ item.label }}</p>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ item.description }}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-black" [class.text-emerald-500]="item.value > 0" [class.text-red-500]="item.value < 0 && selectedMetric() !== 'balance'">
                        {{ item.value | currency:'BRL' }}
                      </p>
                      <p class="text-[9px] font-bold text-slate-400">{{ (item.percent || 0).toFixed(1) }}%</p>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span class="text-xs font-black text-slate-400 uppercase tracking-widest">Total Calculado</span>
              <span class="text-xl font-black text-slate-800">{{ getMetricTotal() | currency:'BRL' }}</span>
            </div>
          </div>
        </div>
      }

      <!-- Header Seccion -->
      <div class="bg-white border-b border-slate-200 pt-8 pb-6 px-4 sm:px-8">
        <div class="max-w-7xl mx-auto">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-black text-slate-800 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <mat-icon>trending_up</mat-icon>
                </div>
                Previsibilidade Financeira
              </h1>
              <p class="text-slate-500 text-sm font-medium mt-1 ml-13">
                Projete seu fluxo de caixa e antecipe decisões estratégicas.
              </p>
            </div>

            <!-- Global Filters -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex bg-slate-100 p-1 rounded-xl">
                <button (click)="horizon.set(1)" [class.bg-white]="horizon() === 1" [class.shadow-sm]="horizon() === 1" 
                  class="px-4 py-1.5 text-xs font-bold rounded-lg transition-all" [class.text-slate-800]="horizon() === 1" [class.text-slate-500]="horizon() !== 1">
                  1 M
                </button>
                <button (click)="horizon.set(3)" [class.bg-white]="horizon() === 3" [class.shadow-sm]="horizon() === 3" 
                  class="px-4 py-1.5 text-xs font-bold rounded-lg transition-all" [class.text-slate-800]="horizon() === 3" [class.text-slate-500]="horizon() !== 3">
                  3 M
                </button>
                <button (click)="horizon.set(6)" [class.bg-white]="horizon() === 6" [class.shadow-sm]="horizon() === 6" 
                  class="px-4 py-1.5 text-xs font-bold rounded-lg transition-all" [class.text-slate-800]="horizon() === 6" [class.text-slate-500]="horizon() !== 6">
                  6 M
                </button>
                <button (click)="horizon.set(12)" [class.bg-white]="horizon() === 12" [class.shadow-sm]="horizon() === 12" 
                  class="px-4 py-1.5 text-xs font-bold rounded-lg transition-all" [class.text-slate-800]="horizon() === 12" [class.text-slate-500]="horizon() !== 12">
                  12 M
                </button>
              </div>

              <select [ngModel]="scenario()" (ngModelChange)="scenario.set($event)" 
                class="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20">
                <option value="base">Cenário Base (Tudo)</option>
                <option value="conservative">Cenário Conservador</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        @if (isLoading()) {
          <div class="flex flex-col items-center justify-center py-20">
            <div class="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-slate-500 font-bold mt-4">Calculando projeções...</p>
          </div>
        } @else if (data()) {
          <!-- ──────── KPI CARDS GRID ──────── -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      <!-- Saldo Atual -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group" (click)="selectedMetric.set('balance')">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <mat-icon>account_balance_wallet</mat-icon>
          </div>
        </div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Atual</p>
        <h3 class="text-xl font-black text-slate-800">{{ data()!.summary.currentBalance | currency:'BRL' }}</h3>
      </div>

      <!-- Saldo Projetado -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
           (click)="selectedMetric.set('projected')">
        @if (data()!.summary.warningLevel >= 2) {
          <div class="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white text-[9px] font-black uppercase tracking-tighter rounded-bl-lg">
            Risco Crítico
          </div>
        }
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <mat-icon>insights</mat-icon>
          </div>
        </div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
          {{ horizon() === 1 ? 'Saldo Fim do Mês' : 'Saldo Final (Período)' }}
        </p>
        <h3 class="text-xl font-black text-slate-800" [class.text-red-600]="data()!.summary.projectedEndOfMonth < 0">
          {{ data()!.summary.projectedEndOfMonth | currency:'BRL' }}
        </h3>
      </div>

      <!-- Receitas Previstas -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
           (click)="selectedMetric.set('income')">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <mat-icon>trending_up</mat-icon>
          </div>
        </div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receitas Previstas</p>
        <h3 class="text-xl font-black text-emerald-600">+{{ data()!.summary.totalExpectedIncome | currency:'BRL' }}</h3>
      </div>

      <!-- Gastos Previstos -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
           (click)="selectedMetric.set('expense')">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <mat-icon>trending_down</mat-icon>
          </div>
        </div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gastos Previstos</p>
        <h3 class="text-xl font-black text-rose-600">-{{ data()!.summary.totalExpectedExpense | currency:'BRL' }}</h3>
      </div>

      <!-- Folga de Caixa -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
           (click)="selectedMetric.set('free')">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <mat-icon>savings</mat-icon>
          </div>
        </div>
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Folga de Caixa</p>
        <h3 class="text-xl font-black text-slate-800">{{ data()!.summary.freeCash | currency:'BRL' }}</h3>
      </div>
    </div>

    <!-- ──────── INSIGHTS ESTRUTURAIS ──────── -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Saúde Financeira das Recorrências -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <mat-icon class="text-lg">sync_alt</mat-icon>
          </div>
          <div>
            <h4 class="text-sm font-black text-slate-800">Saúde das Recorrências</h4>
            <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Estrutura fixa mensal</p>
          </div>
          <div class="ml-auto">
            @if (data()!.summary.structuralAnalysis.structuralHealthStatus === 'positive') {
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-full">Sustentável</span>
            } @else if (data()!.summary.structuralAnalysis.structuralHealthStatus === 'warning') {
              <span class="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-full">Alerta de Margem</span>
            } @else {
              <span class="px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black uppercase rounded-full">Déficit Estrutural</span>
            }
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex justify-between items-end">
            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Entradas Fixas</div>
            <div class="text-sm font-black text-emerald-600">{{ data()!.summary.structuralAnalysis.recurringIncome | currency:'BRL' }}</div>
          </div>
          <div class="flex justify-between items-end">
            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saídas Fixas</div>
            <div class="text-sm font-black text-rose-600">{{ data()!.summary.structuralAnalysis.recurringExpense | currency:'BRL' }}</div>
          </div>
          <div class="pt-4 border-t border-slate-50 flex justify-between items-center">
            <div class="text-[10px] text-slate-400 font-medium">Recorrências Ativas: <b>{{ data()!.summary.structuralAnalysis.activeRecurringCount }}</b></div>
            <div class="text-right">
              <p class="text-[9px] text-slate-400 font-black uppercase mb-0.5">Saldo Líquido Fixo</p>
              <p class="text-base font-black text-slate-800" [class.text-rose-600]="(data()!.summary.structuralAnalysis.recurringIncome - data()!.summary.structuralAnalysis.recurringExpense) < 0">
                {{ (data()!.summary.structuralAnalysis.recurringIncome - data()!.summary.structuralAnalysis.recurringExpense) | currency:'BRL' }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Equilíbrio Estrutural (Depois das Obrigações) -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div class="flex items-center gap-3 mb-6">
          <div class="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <mat-icon class="text-lg">account_tree</mat-icon>
          </div>
          <div>
            <h4 class="text-sm font-black text-slate-800">Impacto de Obrigações</h4>
            <p class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Recorrências + Empréstimos</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex justify-between items-end">
            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Parcelas de Empréstimo</div>
            <div class="text-sm font-black text-rose-600">{{ data()!.summary.structuralAnalysis.loanInstallments | currency:'BRL' }}</div>
          </div>
          <div class="flex justify-between items-end">
            <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Margem de Manobra</div>
            <div class="text-sm font-black text-slate-800">{{ data()!.summary.structuralAnalysis.netStructuralBalance | currency:'BRL' }}</div>
          </div>
          
          <div class="relative pt-6">
            <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 transition-all duration-500" 
                   [style.width.%]="math.max(0, math.min(100, (data()!.summary.structuralAnalysis.netStructuralBalance / (data()!.summary.structuralAnalysis.recurringIncome || 1)) * 100))">
              </div>
            </div>
            <p class="mt-2 text-[9px] text-slate-400 font-medium italic">
              {{ data()!.summary.structuralAnalysis.netStructuralBalance > 0 ? 'Sua estrutura fixa deixa uma margem positiva para novos investimentos.' : 'Sua estrutura fixa está consumindo mais do que sua receita recorrente.' }}
            </p>
          </div>
        </div>
      </div>
    </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Col Esquerda: Gráfico e Agenda -->
            <div class="lg:col-span-2 space-y-8">
              
              <!-- Timeline Chart -->
              <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div class="flex items-center justify-between mb-8">
                  <div>
                    <h3 class="text-lg font-black text-slate-800">Evolução do Saldo</h3>
                    <p class="text-xs font-medium text-slate-400">Projeção diária baseada em {{ scenario() }}</p>
                  </div>
                  <div class="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Confiável</div>
                    <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-400"></span> Provável</div>
                    <div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-blue-300"></span> Estimado</div>
                  </div>
                </div>

                <div class="h-64 relative w-full mb-4">
                  <!-- Simple CSS/SVG Chart representations - Fixed coordinates for browser compatibility -->
                  <svg class="w-full h-full overflow-visible" viewBox="0 0 100 256" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="#10B981" stop-opacity="0.1" />
                        <stop offset="100%" stop-color="#10B981" stop-opacity="0" />
                      </linearGradient>
                    </defs>
                    
                    <!-- Zero Axis -->
                    <line x1="0" [attr.y1]="getZeroVerticalPos()" x2="100%" [attr.y2]="getZeroVerticalPos()" stroke="#E2E8F0" stroke-dasharray="4 4" />

                    <!-- Main path -->
                    <path [attr.d]="timelinePath()" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path [attr.d]="timelineAreaPath()" fill="url(#gradient)" />
                    
                    <!-- Points -->
                    @for (p of chartPoints(); track $index) {
                      <circle [attr.cx]="p.x" [attr.cy]="p.y" r="1.5" 
                        [class]="p.confidence === 'high' ? 'fill-emerald-500' : p.confidence === 'medium' ? 'fill-amber-400' : 'fill-blue-300'" />
                    }
                  </svg>
                </div>
                <div class="flex justify-between px-2">
                   <span class="text-[9px] font-bold text-slate-400">{{ data()!.timeline[0].date | date:'dd/MM' }}</span>
                   <span class="text-[9px] font-bold text-slate-400">{{ data()!.timeline[data()!.timeline.length - 1].date | date:'dd/MM/yy' }}</span>
                </div>
              </div>

              <!-- Alerts Panel (if any) -->
              @if (data()!.summary.alerts.length > 0) {
                <div class="space-y-3">
                  @for (alert of data()!.summary.alerts; track alert.message) {
                    <div class="flex items-start gap-4 p-5 rounded-2xl border" 
                      [ngClass]="{
                        'bg-red-50 border-red-100 text-red-700': alert.severity === 3,
                        'bg-amber-50 border-amber-100 text-amber-700': alert.severity === 2,
                        'bg-blue-50 border-blue-100 text-blue-700': alert.severity === 1
                      }">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" 
                        [ngClass]="alert.severity === 3 ? 'bg-red-100' : alert.severity === 2 ? 'bg-amber-100' : 'bg-blue-100'">
                        <mat-icon>{{ alert.severity === 3 ? 'error' : 'warning' }}</mat-icon>
                      </div>
                      <div>
                        <h4 class="text-sm font-black">{{ alert.message }}</h4>
                        @if (alert.date) {
                          <p class="text-xs font-bold opacity-80 mt-1 uppercase tracking-wider">Impacto previsto para {{ alert.date | date:'dd / MMMM' }}</p>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- Agenda Financeira -->
              <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 class="text-lg font-black text-slate-800">Próximos Compromissos</h3>
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ data()!.events.length }} eventos filtrados</span>
                </div>
                <div class="divide-y divide-slate-50">
                  @for (event of data()!.events; track event.id) {
                    <div class="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                      <div class="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 shrink-0">
                         <span class="text-[10px] font-black text-slate-400 leading-none mb-0.5">{{ event.dueDate | date:'MMM' | uppercase }}</span>
                         <span class="text-base font-black text-slate-700 leading-none">{{ event.dueDate | date:'dd' }}</span>
                      </div>

                      <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-bold text-slate-700 truncate group-hover:text-emerald-600 transition-colors">{{ event.description }}</h4>
                        <div class="flex items-center gap-3 mt-1">
                          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <mat-icon class="text-[12px] h-3 w-3">category</mat-icon> {{ event.category }}
                          </span>
                          <span class="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest" 
                            [ngClass]="getConfidencePillClass(event.confidenceLevel)">
                            {{ getConfidenceText(event.confidenceLevel) }}
                          </span>
                        </div>
                      </div>

                      <div class="text-right">
                        <span class="text-sm font-black block" [class.text-emerald-500]="event.direction === 'income'" [class.text-red-500]="event.direction === 'expense'">
                          {{ event.direction === 'income' ? '+' : '-' }}{{ event.amount | currency:'BRL' }}
                        </span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          Impacto em conta
                        </span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Col Direita: Composição -->
            <div class="space-y-8">
               <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                  <h3 class="text-lg font-black text-slate-800 mb-6">Composição de Saídas</h3>
                  
                  <div class="space-y-6">
                    @for (source of sources(); track source.name) {
                      <div class="space-y-2">
                        <div class="flex items-center justify-between">
                          <span class="text-xs font-bold text-slate-500">{{ source.name }}</span>
                          <span class="text-xs font-black text-slate-700">{{ source.total | currency:'BRL' }}</span>
                        </div>
                        <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-500" 
                            [style.width.%]="source.percentage" [class]="source.color"></div>
                        </div>
                      </div>
                    }
                  </div>
               </div>

               <!-- Confidence Breakdown -->
               <div class="bg-emerald-900 p-8 rounded-3xl text-white relative overflow-hidden">
                  <mat-icon class="absolute -right-4 -bottom-4 text-white/5 text-8xl rotate-12">verified</mat-icon>
                  <h3 class="text-lg font-black mb-4">Grau de Firmeza</h3>
                  <p class="text-white/60 text-xs font-medium leading-relaxed mb-6">
                    Sua previsão é baseada em diferentes níveis de certeza. Revise os eventos "estimados" para maior precisão.
                  </p>
                  
                  <div class="space-y-4">
                    <div class="flex items-center justify-between p-3 bg-white/10 rounded-2xl">
                      <div class="flex items-center gap-3">
                         <div class="w-2 h-2 rounded-full bg-white"></div>
                         <span class="text-xs font-bold">Lançamento Real</span>
                      </div>
                      <span class="text-xs font-black">{{ (confidenceStats().confirmed / totalEvents() * 100) | number:'1.0-0' }}%</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/10 rounded-2xl">
                      <div class="flex items-center gap-3">
                         <div class="w-2 h-2 rounded-full bg-emerald-400"></div>
                         <span class="text-xs font-bold">Projeção Firme</span>
                      </div>
                      <span class="text-xs font-black">{{ (confidenceStats().predicted / totalEvents() * 100) | number:'1.0-0' }}%</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/10 rounded-2xl">
                      <div class="flex items-center gap-3">
                         <div class="w-2 h-2 rounded-full bg-blue-300"></div>
                         <span class="text-xs font-bold">Estimativa Vaga</span>
                      </div>
                      <span class="text-xs font-black">{{ (confidenceStats().estimated / totalEvents() * 100) | number:'1.0-0' }}%</span>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ml-13 { margin-left: 3.25rem; }
  `]
})
export class ForecastPageComponent implements OnInit {
  protected readonly math = Math;
  private forecastService = inject(ForecastService);

  isLoading = signal<boolean>(true);
  data = signal<ForecastIntelligence | null>(null);
  horizon = signal<number>(1);
  scenario = signal<ForecastScenario>('base');
  selectedMetric = signal<string | null>(null);

  compositionData = computed(() => {
    const metric = this.selectedMetric();
    const d = this.data();
    if (!metric || !d) return [];

    switch(metric) {
      case 'balance':
        return d.accounts.map(a => ({
          label: a.institution_name || 'Conta',
          description: `Final: ${a.account_number || '****'}`,
          value: a.currentBalance,
          percent: d.summary.currentBalance > 0 ? (a.currentBalance / d.summary.currentBalance) * 100 : 0,
          icon: 'home'
        }));

      case 'projected': {
        const s = d.summary;
        const totalOut = s.totalExpectedExpense;
        const pct = (v: number) => totalOut > 0 ? (v / totalOut) * 100 : 0;

        return [
          {
            label: 'Saldo Atual',
            description: 'Ponto de partida (conta hoje)',
            value: s.currentBalance,
            percent: 100,
            icon: 'account_balance_wallet'
          },
          {
            label: 'Entradas Previstas',
            description: 'Receitas no período',
            value: s.totalExpectedIncome,
            percent: 0,
            icon: 'add_circle'
          },
          {
            label: 'Despesas em Transações',
            description: 'Lançamentos diretos no período',
            value: -s.monthBreakdown.transactions,
            percent: pct(s.monthBreakdown.transactions),
            icon: 'receipt_long'
          },
          {
            label: 'Faturas de Cartão',
            description: 'Vencimentos de fatura no período',
            value: -s.monthBreakdown.cards,
            percent: pct(s.monthBreakdown.cards),
            icon: 'credit_card'
          },
          {
            label: 'Empréstimos',
            description: 'Parcelas no período',
            value: -s.monthBreakdown.loans,
            percent: pct(s.monthBreakdown.loans),
            icon: 'account_tree'
          },
          {
            label: 'Recorrências',
            description: 'Projeções ainda não lançadas',
            value: -s.monthBreakdown.recurring,
            percent: pct(s.monthBreakdown.recurring),
            icon: 'repeat'
          }
        ].filter(item => item.value !== 0 || item.label === 'Saldo Atual');
      }

      case 'income': {
        const inc = d.summary.incomeBreakdown;
        const total = inc.transactions + inc.recurring;
        const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;

        return [
          {
            label: 'Receitas Lançadas',
            description: 'Transações contábeis (Futuras/Pendentes)',
            value: inc.transactions,
            percent: pct(inc.transactions),
            icon: 'verified'
          },
          {
            label: 'Projeções de Recorrência',
            description: 'Expectativa baseada em repetições',
            value: inc.recurring,
            percent: pct(inc.recurring),
            icon: 'update'
          }
        ].filter(item => item.value !== 0);
      }

      case 'expense': {
        const b = d.summary.monthBreakdown;
        const total = d.summary.totalExpectedExpense;
        const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;

        return [
          {
            label: 'Faturas de Cartão',
            description: 'Impacto de cartões no período',
            value: -b.cards,
            percent: pct(b.cards),
            icon: 'credit_card'
          },
          {
            label: 'Empréstimos',
            description: 'Parcelas e encargos projetados',
            value: -b.loans,
            percent: pct(b.loans),
            icon: 'account_tree'
          },
          {
            label: 'Recorrências',
            description: 'Despesas fixas não lançadas',
            value: -b.recurring,
            percent: pct(b.recurring),
            icon: 'repeat'
          },
          {
            label: 'Despesas Lançadas',
            description: 'Transações diretas (Futuras/Pendentes)',
            value: -b.transactions,
            percent: pct(b.transactions),
            icon: 'receipt_long'
          }
        ].filter(item => item.value !== 0);
      }

      case 'free': {
        const summary = d.summary;
        const total = summary.currentBalance + summary.totalExpectedIncome;
        const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;

        return [
          { 
            label: 'Saldo Disponível', 
            description: 'Disponibilidade imediata', 
            value: summary.currentBalance, 
            percent: pct(summary.currentBalance),
            icon: 'account_balance_wallet' 
          },
          { 
            label: 'Receitas Previstas', 
            description: 'Entradas no período', 
            value: summary.totalExpectedIncome, 
            percent: pct(summary.totalExpectedIncome),
            icon: 'add_chart' 
          },
          { 
            label: 'Gastos Previstos', 
            description: 'Saídas e compromissos', 
            value: -summary.totalExpectedExpense, 
            percent: 0,
            icon: 'payments' 
          },
          { 
            label: 'Folga Líquida', 
            description: 'Saldo final projetado', 
            value: summary.freeCash, 
            percent: 0,
            icon: 'verified_user' 
          }
        ];
      }
        
      default: return [];
    }
  });

  constructor() {
    // Re-calcula sempre que os filtros mudarem
    effect(() => {
      this.loadData(this.horizon(), this.scenario());
    });
  }

  async ngOnInit() {
    // Carregamento inicial agora é tratado pelo effect no constructor
  }

  async loadData(h: number, s: ForecastScenario) {
    this.isLoading.set(true);
    try {
      const res = await this.forecastService.getForecastIntelligence(h, s);
      this.data.set(res);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── UI Helpers ─────────────────────────────────────────────────────────────

  getWarningLevelText(level: number): string {
    switch(level) {
      case 3: return 'Risco Crítico';
      case 2: return 'Atenção';
      case 1: return 'Informativo';
      default: return 'Seguro';
    }
  }

  getAlertClass(level: number): string {
    switch(level) {
      case 3: return 'bg-red-500 text-white';
      case 2: return 'bg-amber-500 text-white';
      case 1: return 'bg-blue-500 text-white';
      default: return 'bg-emerald-500 text-white';
    }
  }

  getConfidencePillClass(conf: string): string {
    switch(conf) {
      case 'confirmed': return 'bg-emerald-50 text-emerald-600';
      case 'predicted': return 'bg-amber-50 text-amber-600';
      case 'estimated': return 'bg-blue-50 text-blue-600';
      default: return 'bg-slate-50 text-slate-500';
    }
  }

  getConfidenceText(conf: string): string {
    switch(conf) {
      case 'confirmed': return 'Confirmado';
      case 'predicted': return 'Projetado';
      case 'estimated': return 'Estimado';
      default: return conf;
    }
  }

  getMetricTitle(metric: string): string {
    const map: Record<string, string> = {
      'balance': 'Composição do Saldo Atual',
      'projected': 'Cálculo do Saldo Projetado',
      'income': 'Fontes de Receita Previstas',
      'expense': 'Distribuição de Gastos Previstos',
      'free': 'Análise da Folga de Caixa'
    };
    return map[metric] || 'Detalhes';
  }

  getMetricTotal(): number {
    const m = this.selectedMetric();
    const s = this.data()?.summary;
    if (!m || !s) return 0;
    if (m === 'balance') return s.currentBalance;
    if (m === 'projected') return s.projectedEndOfMonth;
    if (m === 'income') return s.totalExpectedIncome;
    if (m === 'expense') return s.totalExpectedExpense;
    if (m === 'free') return s.freeCash;
    return 0;
  }

  // ── Chart Logic ────────────────────────────────────────────────────────────

  chartPoints = computed(() => {
    const d = this.data();
    if (!d || d.timeline.length < 2) return [];

    const timeline = d.timeline;
    const balances = timeline.map(p => p.balance);
    const min = Math.min(...balances, 0);
    const max = Math.max(...balances, 100);
    const range = max - min;

    return timeline.map((p, i) => ({
      x: (i / (timeline.length - 1)) * 100,
      y: 256 - ((p.balance - min) / range) * 256,
      confidence: p.confidence
    }));
  });

  getZeroVerticalPos(): number {
    const d = this.data();
    if (!d) return 128;
    const balances = d.timeline.map(p => p.balance);
    const min = Math.min(...balances, 0);
    const max = Math.max(...balances, 100);
    const range = max - min;
    return 256 - ((0 - min) / range) * 256;
  }

  timelinePath = computed(() => {
    const pts = this.chartPoints();
    if (pts.length < 2) return '';
    return `M ${pts[0].x} ${pts[0].y} ` + pts.map(p => `L ${p.x} ${p.y}`).join(' ');
  });

  timelineAreaPath = computed(() => {
    const pts = this.chartPoints();
    if (pts.length < 2) return '';
    const lastX = pts[pts.length - 1].x;
    return this.timelinePath() + ` L ${lastX} 256 L 0 256 Z`;
  });

  // ── Stats Logic ────────────────────────────────────────────────────────────

  totalEvents = computed(() => this.data()?.events.length || 0);

  confidenceStats = computed(() => {
    const evs = this.data()?.events || [];
    return {
      confirmed: evs.filter(e => e.confidenceLevel === 'confirmed').length,
      predicted: evs.filter(e => e.confidenceLevel === 'predicted').length,
      estimated: evs.filter(e => e.confidenceLevel === 'estimated').length
    };
  });

  sources = computed(() => {
    const evs = (this.data()?.events || []).filter(e => e.direction === 'expense');
    const totalByCategory = new Map<string, number>();
    
    evs.forEach(e => {
        const name = e.category || 'Outros';
        totalByCategory.set(name, (totalByCategory.get(name) || 0) + e.amount);
    });

    const total = Array.from(totalByCategory.values()).reduce((a, b) => a + b, 0);
    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-400', 'bg-slate-400', 'bg-indigo-400', 'bg-purple-400'];

    return Array.from(totalByCategory.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8) // Top 8 categorias
        .map(([name, val], i) => ({
            name,
            total: val,
            percentage: total > 0 ? (val / total) * 100 : 0,
            color: colors[i % colors.length]
        }));
  });
}
