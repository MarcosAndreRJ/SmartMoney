import { Component, EventEmitter, Output, Input, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

interface ContributionData {
  sourceAccount: string | null;
  value: string;
  date: string;
  message?: string;
}

@Component({
  selector: 'app-contribution-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <!-- Backdrop -->
      <button type="button"
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity border-none w-full h-full cursor-default"
        aria-label="Close modal"
        (click)="closeRequest.emit()">
      </button>

      <!-- Modal Content -->
      <div class="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="p-8 sm:p-10">
          <!-- Header -->
          <div class="flex items-center gap-4 mb-8">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <mat-icon class="text-2xl">savings</mat-icon>
            </div>
            <div class="flex-1">
              <h2 class="text-xl font-bold text-slate-900 leading-tight">Aportar em uma Meta</h2>
              <p class="text-sm text-slate-400">{{ goalName }}</p>
            </div>
            <button (click)="closeRequest.emit()"
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="contributionForm" (ngSubmit)="submit()" class="space-y-6">
            <!-- Source Account -->
            <div class="space-y-2">
              <label for="sourceAccount" class="text-sm font-bold text-slate-700">Conta de Origem</label>
              <div class="relative">
                <select id="sourceAccount" formControlName="sourceAccount"
                  class="w-full h-14 px-4 appearance-none bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 outline-none focus:bg-white focus:border-emerald-500/50 transition-all">
                  <option [ngValue]="null">Nenhuma (Apenas registrar aporte)</option>
                  @for (account of accounts(); track account.id) {
                     <option [value]="account.id">{{ account.institution_name }}</option>
                  }
                </select>
                <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
              </div>
            </div>

            <!-- Value -->
            <div class="space-y-2">
              <label for="contributionValue" class="text-sm font-bold text-slate-700">Valor do Aporte</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input id="contributionValue" formControlName="value" type="text" placeholder="0,00"
                  class="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold text-lg outline-none focus:bg-white focus:border-emerald-500/50 transition-all">
              </div>
            </div>

            <!-- Date and Category -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label for="contributionDate" class="text-sm font-bold text-slate-700">Data</label>
                <input id="contributionDate" formControlName="date" type="date"
                  class="w-full h-14 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 outline-none focus:bg-white focus:border-emerald-500/50 transition-all">
              </div>
              <div class="space-y-2">
                <p class="text-sm font-bold text-slate-700">Categoria</p>
                <div class="h-14 flex items-center">
                  <span class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                    <mat-icon class="text-sm">sell</mat-icon>
                    Investimento
                  </span>
                </div>
              </div>
            </div>

            <!-- Message -->
            <div class="space-y-2">
              <label for="contributionMessage" class="text-sm font-bold text-slate-700">Mensagem (Opcional)</label>
              <textarea id="contributionMessage" formControlName="message" rows="3"
                placeholder="Ex: Rendimento extra do mês"
                class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 outline-none focus:bg-white focus:border-emerald-500/50 transition-all resize-none"></textarea>
            </div>

            <!-- Buttons -->
            <div class="flex items-center gap-4 pt-4">
              <button type="button" (click)="closeRequest.emit()"
                class="flex-1 h-14 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-slate-100">
                Cancelar
              </button>
              <button type="submit" [disabled]="contributionForm.invalid"
                class="flex-[2] h-14 rounded-2xl bg-[#0F172A] text-white font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200">
                Confirmar Aporte
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    `
})
export class ContributionModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabaseService = inject(SupabaseService);

  @Input() goalName: string = '';
  @Output() closeRequest = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<ContributionData>();

  accounts = signal<any[]>([]);

  contributionForm = this.fb.group({
    sourceAccount: [null as string | null], // Null means no account selected
    value: ['', [Validators.required, Validators.pattern(/^\d+([.,]\d{1,2})?$/)]],
    date: [new Date().toLocaleDateString('en-CA'), Validators.required],
    message: ['']
  });

  async ngOnInit() {
     try {
         const { data, error } = await this.supabaseService.getAccounts();
         if (error) throw error;
         
         const filtered = (data as any[] || []).filter(a => 
            a.account_type !== 'credit' && a.account_type !== 'credit_card'
         );
         
         this.accounts.set(filtered);
         
         // Select the first account if we have one
         if (filtered.length > 0) {
             this.contributionForm.patchValue({ sourceAccount: filtered[0].id });
         }
     } catch (error) {
         console.error('Error loading accounts:', error);
     }
  }

  submit() {
    if (this.contributionForm.valid) {
      this.confirm.emit(this.contributionForm.value as ContributionData);
      this.closeRequest.emit();
    }
  }
}
