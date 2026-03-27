import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { InvestmentService } from './investments.service';

@Component({
  selector: 'app-investment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-end">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" (click)="close.emit()"></div>

      <!-- Slide-over panel -->
      <div class="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900">{{ isEditing ? 'Editar Ativo' : 'Novo Investimento' }}</h2>
            <p class="text-xs font-medium text-slate-500 mt-0.5">Adicione um novo ativo para rastrear em sua carteira.</p>
          </div>
          <button (click)="close.emit()" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <mat-icon class="text-[20px]">close</mat-icon>
          </button>
        </div>

        <!-- Form content -->
        <form [formGroup]="form" (ngSubmit)="save()" class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nome do Investimento</label>
            <input type="text" formControlName="name" class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Ex: Apple Inc. ou Tesouro Selic">
          </div>

          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Categoria</label>
            <div class="relative">
              <select formControlName="category" class="w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                <option value="" disabled hidden>Selecionar Categoria</option>
                <option value="AÇÕES">Ações</option>
                <option value="FIIS">Fundos Imobiliários (FIIs)</option>
                <option value="RENDA FIXA">Renda Fixa</option>
                <option value="CRIPTO">Criptomoedas</option>
                <option value="OUTROS">Outros</option>
              </select>
              <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</mat-icon>
            </div>
          </div>

          <div class="space-y-1.5 border-t border-gray-100 pt-6">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Valor Inicial</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
              <input type="number" formControlName="initial_amount" class="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900" placeholder="0,00" step="0.01">
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rendimento Esperado (%)</label>
            <div class="relative">
              <input type="number" formControlName="expected_yield" class="w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="5.0" step="0.1">
              <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
            </div>
          </div>

          <!-- Info Box -->
          <div class="mt-8 p-4 bg-emerald-50 rounded-xl flex gap-3 border border-emerald-100/50">
             <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
               <mat-icon class="text-white text-[14px]">info</mat-icon>
             </div>
             <p class="text-xs font-medium text-emerald-800 leading-relaxed">Novos investimentos são adicionados automaticamente ao seu painel de acompanhamento diário.</p>
          </div>

        </form>

        <!-- Footer -->
        <div class="p-6 border-t border-gray-100 bg-slate-50/50">
          <button (click)="save()" [disabled]="form.invalid || isLoading" class="w-full h-[46px] bg-[#0F172A] text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            @if(isLoading) {
              <mat-icon class="animate-spin text-[18px]">loop</mat-icon>
            } @else {
              <mat-icon class="text-[18px]">check_circle</mat-icon>
            }
            {{ isEditing ? 'Salvar Alterações' : 'Registrar Ativo' }}
          </button>
        </div>

      </div>
    </div>
  `
})
export class InvestmentFormComponent {
    private fb = inject(FormBuilder);
    private investmentService = inject(InvestmentService);

    @Output() close = new EventEmitter<void>();
    isEditing = false;
    isLoading = false;

    form = this.fb.group({
        name: ['', Validators.required],
        category: ['', Validators.required],
        initial_amount: [0, [Validators.required, Validators.min(0)]],
        expected_yield: [0]
    });

    async save() {
        if (this.form.invalid) return;

        this.isLoading = true;
        try {
            await this.investmentService.createInvestment(this.form.value as any);
            this.close.emit();
        } catch(err) {
            console.error(err);
        } finally {
            this.isLoading = false;
        }
    }
}
