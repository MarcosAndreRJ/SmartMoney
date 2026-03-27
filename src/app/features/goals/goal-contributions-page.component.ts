import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GoalService } from './goal.service';
import { PrivacyService } from '../../core/services/privacy.service';
import { LoadingService } from '../../core/services/loading.service';
import { FormsModule } from '@angular/forms';
import { GoalContribution } from './goal.models';

@Component({
  selector: 'app-goal-contributions-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      
      <!-- Top Actions & Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Extrato de Aportes em Metas</h1>
          <p class="text-slate-500 mt-1">Acompanhe o histórico detalhado de investimentos nas suas metas.</p>
        </div>

        <!-- Filters -->
        <div class="flex items-center gap-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Período</label>
            <div class="relative">
              <select [(ngModel)]="selectedPeriod" class="h-12 pl-12 pr-10 rounded-2xl bg-white border border-slate-200 text-slate-700 font-medium outline-none hover:border-slate-300 focus:border-[#0F172A] transition-all appearance-none cursor-pointer min-w-[180px]">
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Último ano</option>
                <option value="all">Todo o período</option>
              </select>
              <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_today</mat-icon>
              <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
            </div>
          </div>

          <div class="space-y-1.5">
             <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">Meta</label>
             <div class="relative">
               <select [(ngModel)]="selectedGoalId" class="h-12 pl-12 pr-10 rounded-2xl bg-white border border-slate-200 text-slate-700 font-medium outline-none hover:border-slate-300 focus:border-[#0F172A] transition-all appearance-none cursor-pointer min-w-[200px]">
                 <option [ngValue]="null">Todas as Metas</option>
                 @for (goal of goalSrv.goals(); track goal.id) {
                    <option [value]="goal.id">{{ goal.name }}</option>
                 }
               </select>
               <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">filter_list</mat-icon>
               <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
             </div>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Total Aportado -->
        <div class="bg-[#0F172A] rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
          <mat-icon class="absolute -right-4 -bottom-4 text-[120px] text-white/5 rotate-[-15deg] pointer-events-none">savings</mat-icon>
          <div class="relative z-10">
            <h3 class="text-slate-400 font-medium mb-1">Total Aportado</h3>
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-4xl font-extrabold tracking-tight">
                {{ privacy.isPrivate() ? 'R$ ****' : (totalAportado() | currency:'BRL':'R$') }}
              </span>
            </div>
            <!-- Stubbed positive trend for illustration -->
            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 backdrop-blur-sm border border-emerald-500/20">
              <mat-icon class="text-[14px] w-[14px] h-[14px]">trending_up</mat-icon>
              <span class="text-xs font-bold">+12.5% vs ano ant.</span>
            </div>
          </div>
        </div>

        <!-- Aportes este Mês -->
        <div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
          <mat-icon class="absolute -right-4 -bottom-4 text-[120px] text-slate-50 rotate-[-15deg] pointer-events-none">calendar_month</mat-icon>
          <div class="relative z-10">
            <h3 class="text-slate-500 font-medium mb-1">Aportes este Mês</h3>
            <div class="flex items-baseline gap-2 mb-4">
              <span class="text-4xl font-extrabold text-slate-900 tracking-tight">
                {{ privacy.isPrivate() ? 'R$ ****' : (aportesMes() | currency:'BRL':'R$') }}
              </span>
            </div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <mat-icon class="text-[14px] w-[14px] h-[14px]">check_circle</mat-icon>
              <span class="text-xs font-bold">Meta mensal atingida</span>
            </div>
          </div>
        </div>

         <!-- Progresso Geral -->
         <div class="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-xl shadow-slate-200/40 flex flex-col justify-center">
            <div class="flex justify-between items-end mb-4">
               <div>
                  <h3 class="text-slate-500 font-medium mb-1">Progresso Geral</h3>
               </div>
               <span class="text-2xl font-extrabold text-slate-900">{{ progressoGeral().toFixed(0) }}%</span>
            </div>
            <div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
               <div class="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" [style.width.%]="progressoGeral()"></div>
            </div>
            <p class="text-xs font-medium text-slate-400 italic">
               {{ privacy.isPrivate() ? 'Faltam R$ ****' : ('Faltam ' + (faltamGeral() | currency:'BRL':'R$')) }} para o objetivo global.
            </p>
         </div>
      </div>

      <!-- Table Section -->
      <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div class="p-6 md:px-8 md:py-6 border-b border-slate-100 flex justify-between items-center">
          <h2 class="text-lg font-bold text-slate-900">Últimos Aportes</h2>
        </div>

        @if (isLoading()) {
           <div class="py-20 flex justify-center">
              <div class="w-10 h-10 border-4 border-slate-200 border-t-[#0F172A] rounded-full animate-spin"></div>
           </div>
        } @else if (filteredContributions().length === 0) {
           <div class="py-20 flex flex-col items-center text-center">
              <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                 <mat-icon class="text-3xl">inbox</mat-icon>
              </div>
              <h3 class="text-slate-900 font-bold mb-1">Nenhum aporte encontrado</h3>
              <p class="text-slate-500 text-sm">Ajuste os filtros ou crie um novo aporte nas suas metas.</p>
           </div>
        } @else {
           <div class="overflow-x-auto">
             <table class="w-full text-left border-collapse">
               <thead>
                 <tr class="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                   <th class="py-4 px-8 font-bold">Meta</th>
                   <th class="py-4 px-6 font-bold">Origem</th>
                   <th class="py-4 px-6 font-bold">Data</th>
                   <th class="py-4 px-6 font-bold text-right">Valor</th>
                   <th class="py-4 px-6"></th>
                 </tr>
               </thead>
               <tbody class="divide-y divide-slate-100">
                 @for (contrib of filteredContributions(); track contrib.id) {
                   <tr class="group hover:bg-slate-50/80 transition-colors">
                     <!-- Meta -->
                     <td class="py-4 px-8 whitespace-nowrap">
                       <div class="flex items-center gap-4">
                         <div class="w-12 h-12 rounded-[14px] flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110"
                              [style.backgroundColor]="contrib.goals?.color || '#94a3b8'">
                           <mat-icon>{{ contrib.goals?.icon || 'flag' }}</mat-icon>
                         </div>
                         <div>
                           <p class="font-bold text-slate-900">{{ contrib.goals?.name || 'Meta Excluída' }}</p>
                           <p class="text-[13px] text-slate-500 mt-0.5">{{ contrib.category || 'Investimento' }}</p>
                         </div>
                       </div>
                     </td>
                     
                     <!-- Origem -->
                     <td class="py-4 px-6 whitespace-nowrap">
                       <div class="flex items-center gap-2">
                         <div class="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                           <mat-icon class="text-[14px]">account_balance</mat-icon>
                         </div>
                         <span class="text-[14px] font-medium text-slate-600">
                           {{ contrib.account_id ? 'Conta ' + contrib.account_id : 'Depósito Direto' }}
                         </span>
                       </div>
                     </td>
                     
                     <!-- Data -->
                     <td class="py-4 px-6 whitespace-nowrap">
                       <span class="text-[14px] font-medium text-slate-600">{{ contrib.date | date:'dd MMM, yyyy':'UTC' }}</span>
                     </td>
                     
                     <!-- Valor -->
                     <td class="py-4 px-6 whitespace-nowrap text-right">
                       <span class="font-extrabold text-emerald-600">
                         + {{ privacy.isPrivate() ? 'R$ ****' : (contrib.amount | currency:'BRL':'R$') }}
                       </span>
                     </td>
                     
                     <!-- Ações -->
                     <td class="py-4 px-6 whitespace-nowrap text-right">
                       <button class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                         <mat-icon class="text-[20px]">more_vert</mat-icon>
                       </button>
                     </td>
                   </tr>
                 }
               </tbody>
             </table>
           </div>
           
           <!-- Pagination Footer -->
           <div class="p-4 px-8 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500 bg-slate-50/30">
             <span>Exibindo {{ filteredContributions().length }} aportes encontrados</span>
             <div class="flex gap-2">
               <button class="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600">
                  <mat-icon class="text-[18px]">chevron_left</mat-icon>
               </button>
               <button class="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600">
                  <mat-icon class="text-[18px]">chevron_right</mat-icon>
               </button>
             </div>
           </div>
        }
      </div>

    </div>
  `
})
export class GoalContributionsPageComponent implements OnInit {
  goalSrv = inject(GoalService);
  privacy = inject(PrivacyService);
  loadingSrv = inject(LoadingService);

  isLoading = computed(() => this.loadingSrv.isLoading());

  selectedPeriod = signal('30');
  selectedGoalId = signal<string | null>(null);

  async ngOnInit() {
    this.goalSrv.loadAllContributions();
  }

  // Filter Logic
  filteredContributions = computed(() => {
     let data = this.goalSrv.allContributions();

     // Apply Goal Filter
     const goalId = this.selectedGoalId();
     if (goalId) {
        data = data.filter(c => c.goal_id === goalId);
     }

     // Apply Period Filter
     const period = this.selectedPeriod();
     if (period !== 'all') {
        const days = parseInt(period, 10);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - days);
        
        data = data.filter(c => new Date(c.date) >= limitDate);
     }

     return data;
  });

  // KPI Computations based on filtered data
  totalAportado = computed(() => {
     return this.filteredContributions().reduce((sum, c) => sum + Number(c.amount), 0);
  });

  aportesMes = computed(() => {
     const monthStartDate = new Date();
     monthStartDate.setDate(1); // 1st of current month
     
     return this.filteredContributions()
        .filter(c => new Date(c.date) >= monthStartDate)
        .reduce((sum, c) => sum + Number(c.amount), 0);
  });

  // We calculate progress based on active goals, independent of the filters, to show a global metric
  progressoGeral = computed(() => {
     const rawGoals = this.goalSrv.goals();
     if (!rawGoals.length) return 0;
     
     const totalAlvo = rawGoals.reduce((sum, g) => sum + Number(g.target_amount || 0), 0);
     const totalSalvo = rawGoals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);
     
     if (totalAlvo === 0) return 0;
     return Math.min((totalSalvo / totalAlvo) * 100, 100);
  });

  faltamGeral = computed(() => {
     const rawGoals = this.goalSrv.goals();
     if (!rawGoals.length) return 0;
     
     const totalAlvo = rawGoals.reduce((sum, g) => sum + Number(g.target_amount || 0), 0);
     const totalSalvo = rawGoals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);
     
     return Math.max(0, totalAlvo - totalSalvo);
  });
}
