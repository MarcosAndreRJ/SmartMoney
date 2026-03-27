import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';
import { NavigationService } from '../../core/services/navigation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="p-4 md:p-8 bg-[#F8FAFC] min-h-screen text-slate-900 animate-in fade-in duration-500 pb-20">
      
      <!-- 1. Top Stats Overview -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 mt-2">
        <div (click)="navigateTo('accounts')" class="cursor-pointer bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div class="flex justify-between items-start mb-4 relative z-10">
            <div class="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <mat-icon>account_balance</mat-icon>
            </div>
            <span class="text-[10px] font-bold px-2 py-1 rounded-lg" 
                  [ngClass]="(stats()?.stats?.balanceChange || 0) >= 0 ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'">
              {{ (stats()?.stats?.balanceChange || 0) >= 0 ? '+' : '' }}{{ stats()?.stats?.balanceChange | number:'1.1-1' }}%
            </span>
          </div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Saldo Total</p>
          <p class="text-2xl font-extrabold text-slate-900 relative z-10">{{ stats()?.stats?.totalBalance | currency:'BRL':'R$ ' }}</p>
          <div class="absolute bottom-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full -mr-10 -mb-10 group-hover:scale-110 transition-transform"></div>
        </div>

        <!-- Gastos do Mês -->
        <div (click)="navigateTo('lancamentos')" class="cursor-pointer bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div class="flex justify-between items-start mb-4 relative z-10">
            <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <mat-icon>shopping_cart</mat-icon>
            </div>
            <span class="text-[10px] font-bold px-2 py-1 rounded-lg"
                  [ngClass]="(stats()?.stats?.spendingChange || 0) <= 0 ? 'text-emerald-500 bg-emerald-50' : 'text-red-500 bg-red-50'">
              {{ (stats()?.stats?.spendingChange || 0) >= 0 ? '+' : '' }}{{ stats()?.stats?.spendingChange | number:'1.1-1' }}%
            </span>
          </div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Gastos do Mês</p>
          <p class="text-2xl font-extrabold text-slate-900 relative z-10">{{ stats()?.stats?.monthlySpending | currency:'BRL':'R$ ' }}</p>
          <div class="absolute bottom-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-10 -mb-10 group-hover:scale-110 transition-transform"></div>
        </div>

        <!-- Saldo Previsto -->
        <div class="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative border-l-4 border-l-violet-500">
          <div class="flex justify-between items-start mb-4 relative z-10">
            <div class="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <mat-icon>event_available</mat-icon>
            </div>
          </div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Saldo Previsto</p>
          <p class="text-2xl font-extrabold text-slate-900 relative z-10">{{ stats()?.stats?.predictedBalance | currency:'BRL':'R$ ' }}</p>
        </div>

        <!-- Total em Empréstimos -->
        <div class="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div class="flex justify-between items-start mb-4 relative z-10">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <mat-icon>account_balance_wallet</mat-icon>
            </div>
          </div>
          <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Total em Empréstimos</p>
          <p class="text-2xl font-extrabold text-slate-900 relative z-10">{{ stats()?.stats?.totalLoans | currency:'BRL':'R$ ' }}</p>
        </div>
      </div>

      <!-- 2. Resumo de Cartões -->
      <div class="mb-10">
        <div class="flex justify-between items-end mb-4 px-2">
            <div>
                <h2 class="text-lg font-bold text-slate-800">Resumo de Cartões</h2>
                <p class="text-xs text-slate-400 font-medium">{{ stats()?.creditCards?.length || 0 }} Cartões Ativos</p>
            </div>
            <button (click)="navigateTo('accounts')" class="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors uppercase tracking-wider px-3 py-1 bg-violet-50 rounded-lg">Gerenciar</button>
        </div>
        
        <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
            @for (card of stats()?.creditCards; track card.id) {
                <div class="min-w-[280px] bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white" [style.backgroundColor]="card.color">
                            <mat-icon>credit_card</mat-icon>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 line-clamp-1">{{ card.name }}</p>
                            <p class="text-[13px] font-bold text-slate-700">Final {{ card.lastDigits }}</p>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center mb-3">
                        <p class="text-[10px] font-bold text-slate-400 uppercase">Fatura Atual</p>
                        <p class="text-[15px] font-extrabold text-slate-900">{{ card.currentBill | currency:'BRL':'R$ ' }}</p>
                    </div>

                    <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div class="h-full bg-violet-500 rounded-full" [style.width.%]="(card.currentBill / (card.limit || 1)) * 100"></div>
                    </div>

                    <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter">
                        <span class="text-slate-400">Limite R$ {{ card.limit | number:'1.0-0' }}</span>
                        <span class="text-violet-600">Disponível R$ {{ card.available | number:'1.0-0' }}</span>
                    </div>
                </div>
            } @empty {
                <div class="w-full h-32 flex flex-col items-center justify-center bg-white rounded-[24px] border border-dashed border-slate-200 text-slate-400">
                    <mat-icon class="mb-2">add_card</mat-icon>
                    <p class="text-xs font-bold uppercase">Nenhum cartão cadastrado</p>
                </div>
            }
        </div>
      </div>

      <!-- middle grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        <!-- 3. Análise de Recorrência -->
        <div class="lg:col-span-2 bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-10">
            <div class="flex-1">
                <div class="mb-8">
                    <h3 class="text-lg font-bold text-slate-800 mb-1">Análise de Recorrência</h3>
                    <p class="text-xs text-slate-400 font-medium">Comparativo mensal de fluxo fixo</p>
                </div>

                <div class="flex items-center gap-4 mb-8">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-violet-500"></div>
                        <span class="text-[10px] font-bold text-slate-500 uppercase">Receitas Fixas</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full bg-red-400"></div>
                        <span class="text-[10px] font-bold text-slate-500 uppercase">Despesas Fixas</span>
                    </div>
                </div>

                <!-- Recurrence Bar Chart (SVG styling) -->
                <div class="w-full h-12 bg-slate-50 rounded-xl overflow-hidden flex mb-8">
                    <div class="h-full bg-violet-500 flex items-center px-4 text-white text-[10px] font-bold" [style.width.%]="(stats()?.recurrence?.income / ((stats()?.recurrence?.income + stats()?.recurrence?.expenses) || 1)) * 100">
                        Receitas: R$ {{ stats()?.recurrence?.income | number:'1.0-0' }}
                    </div>
                    <div class="h-full bg-red-400 flex items-center justify-end px-4 text-white text-[10px] font-bold" [style.width.%]="(stats()?.recurrence?.expenses / ((stats()?.recurrence?.income + stats()?.recurrence?.expenses) || 1)) * 100">
                        Despesas: R$ {{ stats()?.recurrence?.expenses | number:'1.0-0' }}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-violet-50/40 p-4 rounded-2xl border border-violet-100">
                        <p class="text-[10px] font-bold text-violet-700 uppercase mb-1">Receitas Fixas</p>
                        <p class="text-lg font-extrabold text-violet-800">{{ stats()?.recurrence?.income | currency:'BRL':'R$ ' }}</p>
                    </div>
                    <div class="bg-red-50/30 p-4 rounded-2xl border border-red-50">
                        <p class="text-[10px] font-bold text-red-600 uppercase mb-1">Despesas Fixas</p>
                        <p class="text-lg font-extrabold text-red-700">{{ stats()?.recurrence?.expenses | currency:'BRL':'R$ ' }}</p>
                    </div>
                </div>
            </div>

            <div class="w-full md:w-56 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col items-center justify-center text-center p-4">
                <div class="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 mb-4 shadow-sm">
                    <mat-icon class="text-3xl">savings</mat-icon>
                </div>
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Recorrente Livre</p>
                <p class="text-2xl font-extrabold text-violet-600 mb-2">{{ (stats()?.recurrence?.income - stats()?.recurrence?.expenses) | currency:'BRL':'R$ ' }}</p>
                <p class="text-[10px] text-slate-400 leading-relaxed font-medium">Este é o valor garantido que sobra após suas contas fixas.</p>
            </div>
        </div>

        <!-- 4. Minhas Metas -->
        <div class="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-lg font-bold text-slate-800">Minhas Metas</h3>
                <button (click)="navigateTo('goals')" class="text-[10px] font-bold text-violet-600 uppercase hover:underline">Ver todas</button>
            </div>

            <div class="space-y-4">
                @for (goal of stats()?.goals; track goal.id) {
                    <div class="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl group hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm" [style.backgroundColor]="goal.color || '#94a3b8'">
                            <mat-icon>{{ goal.icon || 'trending_up' }}</mat-icon>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-end mb-1">
                                <p class="text-[13px] font-bold text-slate-700 truncate mb-0.5">{{ goal.name }}</p>
                                <span class="text-[10px] font-bold text-slate-400">{{ goal.progress | number:'1.0-0' }}%</span>
                            </div>
                            <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div class="h-full rounded-full" [style.width.%]="goal.progress" [style.backgroundColor]="goal.color || '#94a3b8'"></div>
                            </div>
                            <div class="flex justify-between mt-1.5">
                                <span class="text-[10px] font-medium text-slate-400 leading-none">R$ {{ goal.current_amount | number:'1.0-0' }}</span>
                                <span class="text-[10px] font-medium text-slate-400 leading-none">de R$ {{ goal.target_amount | number:'1.0-0' }}</span>
                            </div>
                        </div>
                    </div>
                } @empty {
                    <div class="text-center py-10">
                        <p class="text-xs text-slate-400 font-medium italic">Nenhuma meta ativa</p>
                    </div>
                }
            </div>
        </div>
      </div>

      <!-- bottom grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        <!-- 5. Evolução de Patrimônio (Chart) -->
        <div class="lg:col-span-2 bg-gradient-to-br from-[#4C1D95] via-[#6D28D9] to-[#1D4ED8] rounded-[32px] p-8 shadow-xl relative overflow-hidden flex flex-col group min-h-[400px]">
            <!-- Decorative circle -->
            <div class="absolute top-0 right-0 w-64 h-64 bg-fuchsia-300/20 rounded-full blur-3xl -mr-32 -mt-32"></div>

            <div class="flex justify-between items-start mb-10 relative z-10">
                <div>
                    <h3 class="text-lg font-bold text-white mb-1">Evolução de Patrimônio</h3>
                    <p class="text-xs text-slate-400 font-medium">Últimos 6 meses de performance</p>
                </div>
                <div class="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white/60 hover:text-white transition-colors cursor-pointer">
                    <span class="text-[10px] font-extrabold uppercase tracking-widest">Mensal</span>
                    <mat-icon class="text-[16px]">expand_more</mat-icon>
                </div>
            </div>

            <!-- Chart Simulation (Tailwind Bars + Lines) -->
            <div class="flex-1 flex items-end justify-between gap-4 mt-auto relative z-10 px-4">
                @for (point of stats()?.heritageEvolution; track point.month; let i = $index) {
                    <div class="flex-1 flex flex-col items-center gap-4 group cursor-pointer relative">
                        <!-- Tooltip -->
                        <div class="opacity-0 group-hover:opacity-100 transition-all absolute -top-12 bg-white text-slate-900 text-[10px] font-extrabold py-1.5 px-3 rounded-xl shadow-lg whitespace-nowrap z-[20] transform -translate-y-2 group-hover:translate-y-0">
                            {{ point.value | currency:'BRL':'R$ ' }}
                        </div>
                        
                        <!-- Value Dot -->
                        <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all group-hover:scale-150 z-10"
                             [style.marginBottom.px]="(point.value / (getMaxHeritage() || 1)) * 150"></div>
                        
                        <!-- Invisible vertical connector -->
                        <div class="absolute bottom-10 w-px bg-white/5 h-[200px] group-hover:bg-white/10 transition-colors"></div>

                        <span class="text-[10px] font-extrabold text-slate-500 tracking-widest group-hover:text-white transition-colors">{{ point.month }}</span>
                    </div>
                }

                <!-- Lines between dots (Simulation) -->
                <svg class="absolute inset-x-0 bottom-10 w-full h-[200px] pointer-events-none opacity-20" preserveAspectRatio="none">
                    <path [attr.d]="getLinePath()" fill="none" stroke="url(#gradient)" stroke-width="4" stroke-linecap="round" />
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="#34D399" />
                            <stop offset="100%" stop-color="#818CF8" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>

        <!-- 6. Gastos por Categoria -->
        <div class="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm flex flex-col">
            <h3 class="text-lg font-bold text-slate-800 mb-8">Gastos por Categoria</h3>

            <div class="space-y-6 flex-1">
                @for (cat of stats()?.categorySpending; track cat.name) {
                    <div class="group">
                        <div class="flex items-center gap-4 mb-3">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110" [style.backgroundColor]="cat.color">
                                <mat-icon class="text-[20px]">{{ cat.icon }}</mat-icon>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-bold text-slate-700 truncate">{{ cat.name }}</p>
                                <div class="flex justify-between mt-0.5">
                                    <span class="text-[10px] font-bold text-slate-400">{{ (cat.amount / (stats()?.stats?.monthlySpending || 1)) * 100 | number:'1.0-0' }}% do total</span>
                                    <span class="text-[11px] font-extrabold text-slate-800">{{ cat.amount | currency:'BRL':'R$ ' }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-1000" [style.backgroundColor]="cat.color" [style.width.%]="(cat.amount / (stats()?.stats?.monthlySpending || 1)) * 100"></div>
                        </div>
                    </div>
                }

                @if (!stats()?.categorySpending?.length) {
                    <div class="flex flex-col items-center justify-center py-10 opacity-40">
                        <mat-icon class="text-5xl mb-2">pie_chart_outline</mat-icon>
                        <p class="text-xs font-bold uppercase">Sem gastos registrados</p>
                    </div>
                }
            </div>

            <button class="w-full py-4 mt-8 border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all">Relatório Detalhado</button>
        </div>
      </div>

      <!-- 7. Últimas Transações -->
      <div class="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
        <div class="flex justify-between items-center mb-8">
            <h3 class="text-lg font-bold text-slate-800">Últimas Transações</h3>
            <button (click)="navigateTo('lancamentos')" class="text-[10px] font-bold text-violet-600 uppercase hover:underline">Ver Extrato Completo</button>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left whitespace-nowrap">
                <thead>
                    <tr class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        <th class="pb-4 px-2">Data</th>
                        <th class="pb-4 px-2">Descrição</th>
                        <th class="pb-4 px-2">Categoria</th>
                        <th class="pb-4 px-2 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                    @for (tx of stats()?.recentTransactions; track tx.id) {
                        <tr class="group hover:bg-slate-50/50 transition-colors">
                            <td class="py-5 px-2 text-[12px] font-medium text-slate-500">{{ tx.date | date:'dd MMM, yyyy':'UTC' }}</td>
                            <td class="py-5 px-2">
                                <span class="text-[13px] font-bold text-slate-900 leading-none group-hover:text-violet-600 transition-colors">{{ tx.description }}</span>
                            </td>
                            <td class="py-5 px-2">
                                <span class="px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase"
                                      [style.backgroundColor]="tx.categoryColor + '20'"
                                      [style.color]="tx.categoryColor">
                                    {{ tx.categoryName }}
                                </span>
                            </td>
                            <td class="py-5 px-2 text-right">
                                <span class="text-[14px] font-extrabold" [ngClass]="tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'">
                                    {{ tx.type === 'income' ? '+' : '-' }} {{ tx.amount | currency:'BRL':'R$ ' }}
                                </span>
                            </td>
                        </tr>
                    } @empty {
                        <tr>
                            <td colspan="4" class="py-10 text-center text-slate-400 font-medium italic">Nenhuma transação recente</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
      </div>

    </div>
  `
})
export class DashboardComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private loadingSrv = inject(LoadingService);
  private navSrv = inject(NavigationService);

  stats = signal<any>(null);

  navigateTo(view: string) {
    (this.navSrv as any).navigateTo(view as any);
  }

  async ngOnInit() {
    this.loadingSrv.show('Carregando seu painel...');
    try {
      const summary = await this.supabase.getDashboardSummary();
      if (summary) {
        this.stats.set(summary);
      }
    } catch (err) {
      console.error('Dashboard: Error loading summary', err);
    } finally {
      this.loadingSrv.hide();
    }
  }

  getMaxHeritage() {
    const data = this.stats()?.heritageEvolution;
    if (!data || data.length === 0) return 1000;
    return Math.max(...data.map((d: any) => d.value), 1000);
  }

  // Simulates a curved path for the heritage chart
  getLinePath() {
    const data = this.stats()?.heritageEvolution;
    if (!data || data.length < 2) return '';
    
    const width = 1000;
    const height = 200;
    const step = width / (data.length - 1);
    const maxVal = this.getMaxHeritage();
    
    let path = `M 0 ${height - (data[0].value / maxVal) * height}`;
    
    for (let i = 1; i < data.length; i++) {
        const x = i * step;
        const y = height - (data[i].value / maxVal) * height;
        path += ` L ${x} ${y}`;
    }
    
    return path;
  }
}
