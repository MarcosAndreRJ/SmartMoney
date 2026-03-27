import { Component, OnInit, computed, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { PrivacyService } from '../../core/services/privacy.service';
import { GoalModalComponent } from './goal-modal.component';
import { ContributionModalComponent } from './contribution-modal.component';
import { GoalDetailsModalComponent } from './goal-details-modal.component';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal.component';
import { GoalService } from './goal.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Goal } from './goal.models';

type GoalTab = 'Ativas' | 'Concluídas' | 'Suspensas';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule, GoalModalComponent, ContributionModalComponent, GoalDetailsModalComponent, DeleteConfirmModalComponent],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 pb-32">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-[#0F172A] mb-2 tracking-tight">Minhas Metas</h1>
          <p class="text-slate-500 font-medium">Acompanhe seu progresso e alcance seus objetivos financeiros.</p>
        </div>
        <button 
          (click)="openNewGoalModal()"
          class="h-12 px-6 bg-[#0F172A] text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2">
          <mat-icon class="text-lg">add_circle</mat-icon>
          Nova Meta
        </button>
      </div>

      <!-- Stats Summary -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md">
          <p class="text-[13px] text-slate-500 font-bold mb-1">Total em Metas</p>
          <div class="flex items-baseline gap-2">
            <h2 class="text-[28px] font-extrabold text-[#0F172A] tracking-tight">
              {{ privacy.isPrivate() ? 'R$ ****' : (totalTarget() | currency:'BRL':'R$') }}
            </h2>
          </div>
          <p class="text-[11px] text-emerald-500 mt-2 font-bold flex items-center gap-1 uppercase tracking-wider">
            <mat-icon class="text-[14px]">trending_up</mat-icon>
            {{ privacy.isPrivate() ? '****' : '12%' }} este mês
          </p>
        </div>
        
        <div class="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md">
          <p class="text-[13px] text-slate-500 font-bold mb-1">Valor Poupado</p>
          <div class="flex items-baseline gap-2">
            <h2 class="text-[28px] font-extrabold text-[#0F172A] tracking-tight">
              {{ privacy.isPrivate() ? 'R$ ****' : (totalSaved() | currency:'BRL':'R$') }}
            </h2>
          </div>
          <p class="text-[11px] text-emerald-500 mt-2 font-bold flex items-center gap-1 uppercase tracking-wider">
            <mat-icon class="text-[14px]">trending_up</mat-icon>
            {{ privacy.isPrivate() ? '****' : '5%' }} este mês
          </p>
        </div>

        <div class="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md">
          <p class="text-[13px] text-slate-500 font-bold mb-1">Metas Ativas</p>
          <div class="flex items-baseline gap-2">
            <h2 class="text-[28px] font-extrabold text-[#0F172A] tracking-tight">
              {{ activeCount() < 10 ? '0' + activeCount() : activeCount() }}
            </h2>
          </div>
          <p class="text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-wider">Em andamento</p>
        </div>

        <div class="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:shadow-md">
          <p class="text-[13px] text-slate-500 font-bold mb-1">Progresso Geral</p>
          <div class="flex items-baseline gap-2">
            <h2 class="text-[28px] font-extrabold text-[#0F172A] tracking-tight">
               {{ privacy.isPrivate() ? '**' : overallProgress().toFixed(0) }}%
            </h2>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
               <div class="h-full bg-emerald-500 rounded-full" [style.width.%]="overallProgress()"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Section Title & Tabs -->
      <div class="mt-12 space-y-6">
        <h2 class="text-xl font-bold text-[#0F172A]">Suas Metas de Poupança</h2>
        
        <div class="flex gap-8 border-b border-slate-200">
          <button *ngFor="let tab of tabs" 
            (click)="activeTab.set(tab)"
            class="pb-4 text-[13px] font-bold transition-colors relative flex items-center gap-2"
            [class.text-[#0F172A]]="activeTab() === tab"
            [class.text-slate-400]="activeTab() !== tab"
            [class.hover:text-slate-600]="activeTab() !== tab">
            {{ tab }}
            <span class="px-2 py-0.5 rounded-full text-[10px]"
              [class.bg-slate-100]="activeTab() === tab"
              [class.text-slate-600]="activeTab() === tab"
              [class.bg-slate-50]="activeTab() !== tab"
              [class.text-slate-400]="activeTab() !== tab">
              {{ getTabCount(tab) }}
            </span>
            <div *ngIf="activeTab() === tab" class="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-[#0F172A] rounded-t-full"></div>
          </button>
        </div>
      </div>

      <!-- Goals Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        @for (goal of filteredGoals(); track goal.id) {
          <!-- Goal Card Layout matching Image 1 -->
          <div class="bg-white rounded-[32px] p-8 pb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all border border-slate-50 flex flex-col group relative overflow-hidden h-[340px]">
             
            <!-- Decorative gradient top -->
            <div class="absolute top-0 left-0 right-0 h-32 opacity-10 bg-gradient-to-b from-current to-transparent" [style.color]="goal.color"></div>
            
            <div class="relative z-10">
              <div class="flex justify-between items-start mb-6">
                <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" [style.backgroundColor]="goal.color" [style.shadowColor]="goal.color">
                  <mat-icon class="text-2xl">{{ goal.icon }}</mat-icon>
                </div>
                <button [matMenuTriggerFor]="menu" [matMenuTriggerData]="{goal: goal}" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                  <mat-icon>more_vert</mat-icon>
                </button>
              </div>

              <h3 class="text-lg font-bold text-[#0F172A] mb-1 line-clamp-1 truncate" title="{{ goal.name }}">{{ goal.name }}</h3>
              <p class="text-[12px] font-medium text-slate-400 mb-8">Prazo: {{ goal.deadline | date:'MMM yyyy':'UTC' }}</p>
            </div>

            <div class="mt-auto relative z-10">
              <div class="flex justify-between items-end mb-3">
                <div>
                  <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Progresso</p>
                  <p class="text-[20px] font-extrabold text-[#0F172A]">
                    {{ privacy.isPrivate() ? 'R$ ****' : (goal.current_amount || 0 | currency:'BRL':'R$') }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Objetivo</p>
                  <p class="text-[13px] font-bold text-slate-600">{{ privacy.isPrivate() ? '****' : (goal.target_amount | currency:'BRL':'R$') }}</p>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                <div 
                  class="absolute top-0 left-0 h-full rounded-full transition-all duration-1000"
                  [style.width.%]="getProgress(goal)"
                  [style.backgroundColor]="goal.color">
                </div>
              </div>

              <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-6">
                <span [style.color]="goal.color">{{ getProgress(goal).toFixed(0) }}% Concluído</span>
                <span class="text-slate-400">Faltam {{ privacy.isPrivate() ? '****' : ((goal.target_amount - (goal.current_amount || 0)) | currency:'BRL':'R$') }}</span>
              </div>

              <button 
                *ngIf="goal.status === 'active'"
                (click)="openContribution(goal)"
                class="w-full h-12 bg-slate-50 text-slate-700 rounded-[16px] font-bold text-[13px] hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center gap-2">
                <mat-icon class="text-lg">add</mat-icon>
                Fazer Aporte
              </button>
              
              <div *ngIf="goal.status !== 'active'"
                   class="w-full h-12 flex items-center justify-center rounded-[16px] font-bold text-[13px]"
                   [class.bg-emerald-50]="goal.status === 'completed'"
                   [class.text-emerald-700]="goal.status === 'completed'"
                   [class.bg-amber-50]="goal.status === 'suspended'"
                   [class.text-amber-700]="goal.status === 'suspended'">
                {{ goal.status === 'completed' ? 'Meta Alcançada!' : 'Meta Suspensa' }}
              </div>
            </div>
          </div>
        }
        
        <!-- Empty State / Create New Goal Card -->
        <div *ngIf="activeTab() === 'Ativas'" class="bg-transparent border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center hover:bg-slate-50/50 hover:border-slate-300 transition-all cursor-pointer h-[340px]" (click)="openNewGoalModal()">
          <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
             <mat-icon>add</mat-icon>
          </div>
          <h3 class="text-[15px] font-bold text-slate-700 mb-2">Criar Nova Meta</h3>
          <p class="text-[12px] text-slate-400 text-center px-8 font-medium line-height-relaxed">Comece a planejar seu próximo grande objetivo financeiro.</p>
        </div>
      </div>

      <!-- Últimos Aportes -->
      <div class="mt-16 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 relative">
         <div class="flex justify-between items-center mb-6">
            <h2 class="text-[17px] font-bold text-[#0F172A]">Últimos Aportes</h2>
            <button (click)="navigateToContributions()" class="text-sm font-bold text-[#0F172A] hover:bg-slate-50 px-4 py-2 rounded-xl transition-colors">
              Ver tudo
            </button>
         </div>
         <div class="space-y-4">
            @for (contrib of contributions(); track contrib.id) {
               <div class="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
                  <div class="flex items-center gap-4">
                     <div class="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-500 bg-emerald-50">
                        <mat-icon class="text-[20px]">add_circle</mat-icon>
                     </div>
                     <div>
                        <p class="text-[14px] font-bold text-slate-900 leading-none mb-1">Aporte: {{ contrib['goals']?.name || 'Meta' }}</p>
                        <p class="text-[12px] font-medium text-slate-400">{{ contrib.date | date:'dd MMM yyyy':'UTC' }} {{ contrib.message ? '• ' + contrib.message : '' }}</p>
                     </div>
                  </div>
                  <div class="font-extrabold text-emerald-500 text-[15px]">
                     + {{ privacy.isPrivate() ? 'R$ ****' : (contrib.amount | currency:'BRL':'R$') }}
                  </div>
               </div>
            } @empty {
               <div class="text-center py-8 text-slate-400 text-[13px] font-medium">Nenhum aporte recente encontrado.</div>
            }
         </div>
      </div>

      <!-- Modals -->
      @if (showModal()) {
        <app-goal-modal 
          [goal]="selectedGoal()"
          (closeModal)="closeModal()"
          (saveGoal)="saveGoal($any($event))">
        </app-goal-modal>
      }

      @if (showContributionModal()) {
        <app-contribution-modal
          [goalName]="selectedGoal()?.name || ''"
          (closeRequest)="showContributionModal.set(false)"
          (confirm)="handleContribution($any($event))">
        </app-contribution-modal>
      }

      @if (showDetailsModal() && selectedGoal()) {
         <app-goal-details-modal
            [goal]="selectedGoal()!"
            (closeModal)="showDetailsModal.set(false)">
         </app-goal-details-modal>
      }

      <mat-menu #menu="matMenu" panelClass="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 min-w-[180px]">
        <ng-template matMenuContent let-goal="goal">
          <button mat-menu-item (click)="openDetails(goal)">
            <mat-icon class="text-slate-400">visibility</mat-icon>
            <span class="text-slate-600 font-medium">Ver Detalhes</span>
          </button>
          <button mat-menu-item (click)="startEdit(goal)">
            <mat-icon class="text-slate-400">edit</mat-icon>
            <span class="text-slate-600 font-medium">Editar</span>
          </button>
          <button mat-menu-item *ngIf="goal.status !== 'completed'" (click)="updateStatus(goal, 'completed')">
            <mat-icon class="text-emerald-500">check_circle</mat-icon>
            <span class="text-emerald-600 font-medium">Concluir</span>
          </button>
          <button mat-menu-item *ngIf="goal.status !== 'suspended'" (click)="updateStatus(goal, 'suspended')">
            <mat-icon class="text-amber-500">pause_circle_filled</mat-icon>
            <span class="text-amber-600 font-medium">Suspender</span>
          </button>
          <button mat-menu-item *ngIf="goal.status !== 'active'" (click)="updateStatus(goal, 'active')">
            <mat-icon class="text-blue-500">play_circle_filled</mat-icon>
            <span class="text-blue-600 font-medium">Reativar</span>
          </button>
          <hr class="my-1 border-slate-100">
          <button mat-menu-item (click)="confirmDelete(goal)">
            <mat-icon class="text-red-400">delete</mat-icon>
            <span class="text-red-500 font-medium">Excluir</span>
          </button>
        </ng-template>
      </mat-menu>

      @if (showDeleteConfirm()) {
        <app-delete-confirm-modal
          title="Confirmar Exclusão"
          message="Tem certeza que deseja excluir esta meta? Esta ação não poderá ser desfeita e todo o histórico de aportes associado será removido permanentemente da sua conta."
          (confirm)="executeDelete()"
          (cancel)="cancelDelete()">
        </app-delete-confirm-modal>
      }
    </div>
  `
})
export class GoalsComponent implements OnInit {
  @Output() changeView = new EventEmitter<string>();

  privacy = inject(PrivacyService);
  goalService = inject(GoalService);
  supabaseService = inject(SupabaseService);
  
  showModal = signal(false);
  showContributionModal = signal(false);
  showDetailsModal = signal(false);
  showDeleteConfirm = signal(false);
  selectedGoal = signal<Goal | null>(null);
  goalToDelete = signal<Goal | null>(null);
  activeTab = signal<GoalTab>('Ativas');
  tabs: GoalTab[] = ['Ativas', 'Concluídas', 'Suspensas'];

  // Signals coming directly from the service
  goals = this.goalService.goals;
  contributions = this.goalService.contributions;

  // Computed dashboard metrics
  filteredGoals = computed(() => {
    const statusMap = {
      'Ativas': 'active',
      'Concluídas': 'completed',
      'Suspensas': 'suspended'
    };
    return this.goals().filter(g => g.status === statusMap[this.activeTab()]);
  });

  totalTarget = computed(() => this.goals().filter(g => g.status === 'active').reduce((sum, g) => sum + Number(g.target_amount), 0));
  totalSaved = computed(() => this.goals().filter(g => g.status === 'active').reduce((sum, g) => sum + Number(g.current_amount || 0), 0));
  activeCount = computed(() => this.goals().filter(g => g.status === 'active').length);
  overallProgress = computed(() => {
    const target = this.totalTarget();
    if (target === 0) return 0;
    return (this.totalSaved() / target) * 100;
  });

  ngOnInit() {
    this.goalService.loadGoals();
    this.goalService.loadRecentContributions();
  }

  getTabCount(tab: GoalTab): number {
    const statusMap = {
      'Ativas': 'active',
      'Concluídas': 'completed',
      'Suspensas': 'suspended'
    };
    return this.goals().filter(g => g.status === statusMap[tab]).length;
  }

  getProgress(goal: Goal): number {
    if (!goal.target_amount || goal.target_amount === 0) return 0;
    return Math.min(((goal.current_amount || 0) / goal.target_amount) * 100, 100);
  }

  openNewGoalModal() {
    this.selectedGoal.set(null);
    this.showModal.set(true);
  }

  openDetails(goal: Goal) {
     this.selectedGoal.set(goal);
     this.showDetailsModal.set(true);
  }

  startEdit(goal: Goal) {
    this.selectedGoal.set(goal);
    this.showModal.set(true);
  }

  closeModal() {
    this.selectedGoal.set(null);
    this.showModal.set(false);
  }

  async saveGoal(goalData: Partial<Goal>) {
    if (this.selectedGoal()) {
      // Edit
      await this.goalService.updateGoal(this.selectedGoal()!.id, goalData);
    } else {
      // Create
      const result = await this.goalService.createGoal(goalData);
      // Wait actually, if there's an initial deposit, we should create a contribution for it right after creation. 
      // Current amount came via the event hack
      const initialAmount = (goalData as any).current_amount || 0;
      const accountId = (goalData as any).account_id;

      if (result.data && result.error === null && initialAmount > 0) {
         await this.goalService.addContribution({
            goal_id: result.data.id,
            amount: initialAmount,
            account_id: accountId || null,
            category: 'Investimento inicial',
            date: new Date().toISOString()
         });

         if (accountId) {
           const { data: accounts } = await this.supabaseService.getAccounts();
           const account = accounts?.find((a: any) => a.id === accountId);
           
           if (account) {
             const newBalance = Number((account.initial_balance - initialAmount).toFixed(2));
             await this.supabaseService.updateAccount(accountId, { initial_balance: newBalance });

             await this.supabaseService.createTransaction({
               account_id: accountId,
               amount: initialAmount,
               type: 'expense',
               category: 'Metas',
               description: 'Depósito inicial: ' + result.data.name,
               status: 'confirmed',
               date: new Date().toISOString()
             });
           }
         }
      }
    }

    this.closeModal();
  }

  updateStatus(goal: Goal, status: 'active' | 'completed' | 'suspended') {
     this.goalService.updateGoalStatus(goal.id, status);
  }

  confirmDelete(goal: Goal) {
     this.goalToDelete.set(goal);
     this.showDeleteConfirm.set(true);
  }

  cancelDelete() {
     this.goalToDelete.set(null);
     this.showDeleteConfirm.set(false);
  }

  async executeDelete() {
     const goal = this.goalToDelete();
     if (goal) {
       await this.goalService.deleteGoal(goal.id);
       this.cancelDelete();
     }
  }

  openContribution(goal: Goal) {
    this.selectedGoal.set(goal);
    this.showContributionModal.set(true);
  }

  async handleContribution(data: any) {
    const goal = this.selectedGoal();
    if (goal) {
      const amount = parseFloat(data.value.replace(',', '.'));
      const accountId = data.sourceAccount;
      
      if (!isNaN(amount)) {
        // 1. Add contribution to goal
        await this.goalService.addContribution({
           goal_id: goal.id,
           amount: amount,
           account_id: accountId || null,
           date: data.date || new Date().toISOString(),
           category: 'Aporte manual',
           message: data.message || ''
        });

        // 2. If an account was selected, debit it and create a transaction
        if (accountId) {
          try {
            const { data: accounts } = await this.supabaseService.getAccounts();
            const account = accounts?.find((a: any) => a.id === accountId);
            
            if (account) {
              // Update balance
              const newBalance = Number((account.initial_balance - amount).toFixed(2));
              await this.supabaseService.updateAccount(accountId, { initial_balance: newBalance });

              // Create transaction record
              await this.supabaseService.createTransaction({
                account_id: accountId,
                amount: amount,
                type: 'expense',
                category: 'Metas',
                description: `Aporte meta: ${goal.name}`,
                date: data.date || new Date().toISOString(),
                status: 'confirmed',
                user_id: (await this.supabaseService.getUser())?.id
              });
            }
          } catch (error) {
            console.error('Error processing contribution account debit:', error);
          }
        }
      }
    }
    this.showContributionModal.set(false);
  }

  navigateToContributions() {
    this.changeView.emit('goal-contributions');
  }
}
