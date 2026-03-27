import { Component, inject, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { InvestmentService, Investment } from './investments.service';
import { SupabaseService, SupabaseAccount } from '../../core/services/supabase.service';

@Component({
  selector: 'app-investment-contribution',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-end">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" (click)="close.emit()"></div>

      <!-- Slide-over panel -->
      <div class="relative w-full max-w-md h-full bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">Novo Aporte</h2>
            <p class="text-xs font-medium text-slate-500 mt-0.5">Realize um novo investimento no ativo</p>
          </div>
          <button (click)="close.emit()" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <mat-icon class="text-[20px]">close</mat-icon>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          
          <!-- Selected Asset Card -->
          <div class="p-6">
             <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <mat-icon>show_chart</mat-icon>
                </div>
                <div>
                   <p class="text-sm font-extrabold text-slate-900">{{ investment()?.name }}</p>
                   <span class="px-2 py-0.5 mt-1 inline-block rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700 tracking-wider">
                     {{ investment()?.category }}
                   </span>
                </div>
             </div>
          </div>

          <!-- Form content -->
          <form [formGroup]="form" (ngSubmit)="save()" class="px-6 pb-6 space-y-6">
            
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-[#1e293b] uppercase tracking-wider">Valor do Aporte</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">$</span>
                <input type="number" formControlName="amount" class="w-full h-11 pl-8 pr-4 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900" placeholder="0.00" step="0.01">
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-[#1e293b] uppercase tracking-wider">Origem dos Recursos</label>
              <div class="relative">
                <select formControlName="account_id" class="w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700">
                  <option value="">Selecionar conta...</option>
                  @for(acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.institution_name }} ({{ acc.account_type }})</option>
                  }
                </select>
                <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</mat-icon>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-[#1e293b] uppercase tracking-wider">Data da Transação</label>
              <div class="relative">
                <input type="date" formControlName="date" class="w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700">
                <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">calendar_today</mat-icon>
              </div>
            </div>

            <!-- Balances info -->
            <div class="mt-8 p-4 bg-white/50 backdrop-blur rounded-xl space-y-2 border border-dashed border-gray-200">
               <div class="flex justify-between items-center text-xs">
                  <span class="text-slate-500 font-medium">Saldo disponível em conta:</span>
                  <span class="font-extrabold text-slate-900">$12,450.00</span>
               </div>
               <div class="flex justify-between items-center text-xs">
                  <span class="text-slate-500 font-medium">Taxas estimadas:</span>
                  <span class="font-extrabold text-slate-900">$0.00</span>
               </div>
            </div>
            
          </form>

        </div>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-100 bg-white flex flex-col gap-3">
          <button (click)="save()" [disabled]="form.invalid || isLoading" class="w-full h-[46px] bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            @if(isLoading) {
              <mat-icon class="animate-spin text-[18px]">loop</mat-icon>
            } @else {
              <mat-icon class="text-[18px]">add</mat-icon>
            }
            Confirmar Aporte
          </button>
          
          <button (click)="close.emit()" class="w-full h-[46px] bg-transparent text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
        </div>

      </div>
    </div>
  `
})
export class InvestmentContributionComponent {
    private fb = inject(FormBuilder);
    private investmentService = inject(InvestmentService);
    private supabase = inject(SupabaseService);

    investment = () => (window as any).__currentInvestment as Investment | null;
    @Output() close = new EventEmitter<void>(); 

    isLoading = false;
    accounts = signal<SupabaseAccount[]>([]);

    form = this.fb.group({
        amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
        account_id: [''],
        date: [new Date().toISOString().substring(0, 10), Validators.required]
    });

    async ngOnInit() {
       const user = await this.supabase.getUser();
       if(user) {
         const { data } = await this.supabase.client.from('accounts').select('*').eq('user_id', user.id);
         if(data) this.accounts.set(data);
       }
    }

    async save() {
        if (this.form.invalid) return;

        this.isLoading = true;
        try {
            const vals = this.form.value;
            const currentInvestment = this.investment();
            if (!currentInvestment) return;

            await this.investmentService.addContribution(
                currentInvestment.id, 
                Number(vals.amount), 
                vals.account_id || undefined, 
                vals.date || undefined
            );
            this.close.emit();
        } catch(err) {
            console.error(err);
        } finally {
            this.isLoading = false;
        }
    }
}
