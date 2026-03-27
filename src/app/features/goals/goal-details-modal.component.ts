import { Component, EventEmitter, Input, Output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { PrivacyService } from '../../core/services/privacy.service';
import { Goal, GoalContribution } from './goal.models';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-goal-details-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="p-8 pb-6 border-b border-slate-100 flex justify-between items-start relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-full opacity-10 bg-gradient-to-br from-current to-transparent" [style.color]="goal.color"></div>
          
          <div class="relative z-10 flex items-center gap-4">
             <div class="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg" [style.backgroundColor]="goal.color" [style.shadowColor]="goal.color">
               <mat-icon class="text-3xl">{{ goal.icon }}</mat-icon>
             </div>
             <div>
               <h2 class="text-2xl font-bold text-[#0F172A]">{{ goal.name }}</h2>
               <p class="text-[13px] font-medium text-slate-500 mt-1">Status: <span class="font-bold uppercase tracking-wider" [style.color]="goal.color">{{ getStatusLabel(goal.status) }}</span></p>
             </div>
          </div>

          <button (click)="closeModal.emit()" class="relative z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="p-8 overflow-y-auto">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 gap-4 mb-8">
             <div class="bg-slate-50 rounded-[20px] p-5">
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Progresso Atual</p>
                <p class="text-[24px] font-extrabold text-[#0F172A]">
                  {{ privacy.isPrivate() ? 'R$ ****' : (goal.current_amount || 0 | currency:'BRL':'R$') }}
                </p>
                <div class="mt-3 flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                     <div class="h-full rounded-full transition-all" [style.width.%]="progress" [style.backgroundColor]="goal.color"></div>
                  </div>
                  <span class="text-[10px] font-bold text-slate-500">{{ progress.toFixed(0) }}%</span>
                </div>
             </div>
             
             <div class="bg-slate-50 rounded-[20px] p-5">
                <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Objetivo Final</p>
                <p class="text-[24px] font-extrabold text-[#0F172A]">
                  {{ privacy.isPrivate() ? 'R$ ****' : (goal.target_amount || 0 | currency:'BRL':'R$') }}
                </p>
                <p class="text-[12px] font-medium text-slate-500 mt-2">Prazo: {{ goal.deadline | date:'MMM yyyy':'UTC' }}</p>
             </div>
          </div>

          <!-- History -->
          <div>
            <h3 class="text-[15px] font-bold text-[#0F172A] mb-4">Histórico de Aportes</h3>
            
            @if (loading()) {
               <div class="py-8 flex justify-center">
                  <div class="w-8 h-8 border-4 border-slate-200 border-t-[#0F172A] rounded-full animate-spin"></div>
               </div>
            } @else {
               <div class="space-y-3">
                  @for (contrib of contributions(); track contrib.id) {
                     <div class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-[16px]">
                        <div class="flex items-center gap-4">
                           <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400">
                              <mat-icon class="text-[20px]">account_balance_wallet</mat-icon>
                           </div>
                           <div>
                              <p class="text-[14px] font-bold text-slate-900 leading-none mb-1">{{ contrib.category || 'Aporte' }}</p>
                              <p class="text-[12px] font-medium text-slate-400">{{ contrib.date | date:'dd MMM yyyy':'UTC' }} {{ contrib.message ? '• ' + contrib.message : '' }}</p>
                           </div>
                        </div>
                        <div class="font-extrabold text-[#0F172A] text-[15px]">
                           + {{ privacy.isPrivate() ? 'R$ ****' : (contrib.amount | currency:'BRL':'R$') }}
                        </div>
                     </div>
                  } @empty {
                     <div class="text-center py-8 bg-slate-50 rounded-[20px]">
                        <p class="text-[13px] font-bold text-slate-500">Nenhum aporte registrado ainda.</p>
                     </div>
                  }
               </div>
            }
          </div>
        </div>

      </div>
    </div>
  `
})
export class GoalDetailsModalComponent implements OnInit {
  @Input({ required: true }) goal!: Goal;
  @Output() closeModal = new EventEmitter<void>();
  
  privacy = inject(PrivacyService);
  private supabaseService = inject(SupabaseService);
  private get supabase() { return (this.supabaseService as any).supabase; }
  
  contributions = signal<GoalContribution[]>([]);
  loading = signal(true);

  get progress() {
     if (!this.goal || !this.goal.target_amount) return 0;
     return Math.min(((this.goal.current_amount || 0) / this.goal.target_amount) * 100, 100);
  }

  getStatusLabel(status: string | undefined) {
      if (status === 'completed') return 'Concluída';
      if (status === 'suspended') return 'Suspensa';
      return 'Em andamento';
  }

  async ngOnInit() {
      try {
         const { data, error } = await this.supabase
            .from('goal_contributions')
            .select('*')
            .eq('goal_id', this.goal.id)
            .order('date', { ascending: false });

         if (error) throw error;
         this.contributions.set((data as any[]) || []);
      } catch (error) {
         console.error('Error fetching contributions:', error);
      } finally {
         this.loading.set(false);
      }
  }
}
