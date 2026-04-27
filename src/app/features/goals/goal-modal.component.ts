import { Component, EventEmitter, Output, Input, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService, SupabaseAccount } from '../../core/services/supabase.service';
import { Goal } from './goal.models';

@Component({
  selector: 'app-goal-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  template: `
  <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="p-8 pb-0 flex justify-between items-start">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">{{ goal ? 'Editar Meta' : 'Criar Nova Meta' }}</h2>
          <p class="text-slate-500 mt-1">{{ goal ? 'Atualize as informações do seu objetivo.' : 'Defina o caminho para sua próxima conquista.' }}</p>
        </div>
        <button (click)="closeModal.emit()" class="text-slate-400 hover:text-slate-600 transition-colors">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <form [formGroup]="goalForm" class="p-8 space-y-8">
        <!-- Nome da Meta -->
        <div class="space-y-2">
          <label for="goalName" class="text-sm font-bold text-slate-700">Nome da Meta</label>
          <input id="goalName" formControlName="name" type="text" placeholder="Ex: Viagem para o Japão"
            class="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-300 outline-none transition-all text-slate-900">
        </div>

        <!-- Valor Alvo e Depósito Inicial -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label for="targetValue" class="text-sm font-bold text-slate-700">Valor Alvo</label>
            <div class="relative">
              <span class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
              <input id="targetValue" formControlName="target_amount" type="number" placeholder="0,00"
                class="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-300 outline-none transition-all text-slate-900">
            </div>
          </div>
          @if (!goal) {
            <div class="space-y-2">
              <label for="initialDeposit" class="text-sm font-bold text-slate-700">Depósito Inicial <span class="text-slate-400 font-normal">(Opcional)</span></label>
              <div class="relative">
                <span class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
                <input id="initialDeposit" formControlName="initialDeposit" type="number" placeholder="0,00"
                  class="w-full h-14 pl-14 pr-6 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-300 outline-none transition-all text-slate-900">
              </div>
            </div>
          }
        </div>

        <!-- Seleção de Conta para o Depósito Inicial -->
        @if ((goalForm.get('initialDeposit')?.value ?? 0) > 0) {
          <div class="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label for="accountId" class="text-sm font-bold text-slate-700">Origem do Depósito Inicial</label>
            <div class="relative">
              <select id="accountId" formControlName="account_id"
                class="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-300 outline-none transition-all text-slate-900 appearance-none">
                <option [ngValue]="null" disabled selected>Selecione uma conta...</option>
                @for (acc of accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.institution_name }} ({{ acc.account_type }})</option>
                }
              </select>
              <mat-icon class="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">account_balance</mat-icon>
            </div>
          </div>
        }

        <!-- Data Limite e Frequência -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label for="deadline" class="text-sm font-bold text-slate-700">Data Limite</label>
            <div class="relative">
              <input id="deadline" formControlName="deadline" type="date"
                class="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-300 outline-none transition-all text-slate-900 appearance-none">
              <mat-icon class="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_today</mat-icon>
            </div>
          </div>
          <div class="space-y-2">
            <label for="frequency" class="text-sm font-bold text-slate-700">Frequência de Aporte</label>
            <div class="relative">
              <select id="frequency" formControlName="frequency"
                class="w-full h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-slate-300 outline-none transition-all text-slate-900 appearance-none">
                <option value="mensal">Mensal</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="unico">Aporte Único</option>
              </select>
              <mat-icon class="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
            </div>
          </div>
        </div>

        <!-- Ícone da Meta -->
        <div class="space-y-4">
          <p class="text-sm font-bold text-slate-700">Ícone da Meta</p>
          <div class="flex flex-wrap gap-4">
            @for (icon of icons; track icon) {
              <button type="button" (click)="selectedIcon.set(icon)"
                class="w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2"
                [class.bg-emerald-50]="selectedIcon() === icon"
                [class.border-emerald-500]="selectedIcon() === icon"
                [class.text-emerald-600]="selectedIcon() === icon"
                [class.bg-slate-50]="selectedIcon() !== icon"
                [class.border-transparent]="selectedIcon() !== icon"
                [class.text-slate-400]="selectedIcon() !== icon">
                <mat-icon>{{ icon }}</mat-icon>
              </button>
            }
          </div>
        </div>

        <!-- Cor de Identificação -->
        <div class="space-y-4">
          <p class="text-sm font-bold text-slate-700">Cor de Identificação</p>
          <div class="flex flex-wrap gap-4">
            @for (color of colors; track color) {
              <button type="button" (click)="selectedColor.set(color)"
                class="w-12 h-12 rounded-full transition-all border-4"
                [style.backgroundColor]="color"
                [class.border-slate-200]="selectedColor() === color"
                [class.border-transparent]="selectedColor() !== color">
              </button>
            }
          </div>
        </div>
      </form>

      <!-- Footer -->
      <div class="p-8 pt-0 flex gap-4">
        <button (click)="closeModal.emit()"
          class="flex-1 h-14 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all border border-slate-100">
          Cancelar
        </button>
        <button (click)="submit()"
          [disabled]="goalForm.invalid"
          class="flex-[2] h-14 rounded-2xl font-bold text-white bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200">
          {{ goal ? 'Salvar Alterações' : 'Criar Meta' }}
        </button>
      </div>
    </div>
  </div>
  `
})
export class GoalModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);

  @Input() goal: Goal | null = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveGoal = new EventEmitter<Partial<Goal>>();

  icons = ['flight', 'home', 'directions_car', 'laptop', 'shopping_bag', 'celebration', 'favorite', 'school', 'trending_up', 'security'];
  colors = ['#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#14B8A6'];

  selectedIcon = signal('flight');
  selectedColor = signal('#10B981');
  accounts = signal<SupabaseAccount[]>([]);

  goalForm = this.fb.group({
    name: ['', Validators.required],
    target_amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    initialDeposit: [null as number | null, [Validators.min(0)]],
    account_id: [null as string | null],
    deadline: ['', Validators.required],
    frequency: ['mensal', Validators.required]
  });

  async ngOnInit() {
    this.goalForm.get('initialDeposit')?.valueChanges.subscribe(val => {
      const accountCtrl = this.goalForm.get('account_id');
      if (val && val > 0) {
        accountCtrl?.setValidators([Validators.required]);
      } else {
        accountCtrl?.clearValidators();
        accountCtrl?.setValue(null);
      }
      accountCtrl?.updateValueAndValidity();
    });

    const { data } = await this.supabase.getAccounts();
    if (data) {
      this.accounts.set((data as SupabaseAccount[]).filter(a => a.account_type !== 'credit' && a.account_type !== 'credit_card'));
    }

    if (this.goal) {
      this.goalForm.patchValue({
        name: this.goal.name,
        target_amount: this.goal.target_amount,
        deadline: this.goal.deadline ? this.goal.deadline.split('T')[0] : '',
        frequency: this.goal.frequency
      });
      // Initial deposit is only for creation, we hide it or disable it for edit conceptually,
      // but patching null is fine.
      this.selectedIcon.set(this.goal.icon);
      this.selectedColor.set(this.goal.color);
    }
  }

  submit() {
    if (this.goalForm.valid) {
      const formValue = this.goalForm.value;
      
      const goalData: Partial<Goal> = {
        name: formValue.name!,
        target_amount: formValue.target_amount!,
        deadline: formValue.deadline!,
        frequency: formValue.frequency as any,
        icon: this.selectedIcon(),
        color: this.selectedColor(),
        status: this.goal ? this.goal.status : 'active'
      };

      // We pass the initial deposit back so the parent can handle the first contribution if it's a new goal
      this.saveGoal.emit({
        ...goalData,
        // Hacky way to pass initial deposit, real implementation would handle this in the service call
        current_amount: formValue.initialDeposit || 0,
        account_id: formValue.account_id
      } as any);
    }
  }
}
