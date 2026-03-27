import { Component, OnInit, inject, signal, output, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService, SupabaseAccount } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] flex justify-end">
      <div class="w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        <!-- Header -->
        <div class="p-8 flex items-center justify-between border-b border-gray-50">
          <h2 class="text-2xl font-bold text-[#0B1120]">{{ accountToEdit() ? 'Editar Conta' : 'Nova Conta' }}</h2>
          <button 
            (click)="formClose.emit()"
            class="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Form -->
        <div class="flex-1 overflow-y-auto p-8">
          <form [formGroup]="accountForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Institution Name -->
            <div class="space-y-2">
              <label for="institutionName" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome da Instituição</label>
              <input 
                id="institutionName"
                type="text" 
                formControlName="institution_name"
                placeholder="Ex: Nubank, Itaú, Bradesco"
                class="w-full px-4 py-4 bg-[#F8F9FA] border border-transparent rounded-2xl focus:bg-white focus:border-slate-200 focus:outline-none transition-all text-slate-600 font-medium"
              >
            </div>

            <!-- Account Type -->
            <div class="space-y-2">
              <label for="accountType" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Conta</label>
              <div class="relative">
                <select 
                  id="accountType"
                  formControlName="account_type"
                  class="w-full px-4 py-4 bg-[#F8F9FA] border border-transparent rounded-2xl focus:bg-white focus:border-slate-200 focus:outline-none transition-all text-slate-600 font-medium appearance-none"
                >
                  <option value="checking">Conta Corrente</option>
                  <option value="savings">Poupança</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="investment">Investimento</option>
                </select>
                <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
              </div>
            </div>

            <!-- Initial Balance -->
            <div class="space-y-2">
              <label for="initialBalance" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Inicial</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input 
                  id="initialBalance"
                  type="number" 
                  formControlName="initial_balance"
                  placeholder="0,00"
                  class="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border border-transparent rounded-2xl focus:bg-white focus:border-slate-200 focus:outline-none transition-all text-slate-600 font-medium"
                >
              </div>
            </div>

            <!-- Credit Card fields -->
            @if (accountForm.get('account_type')?.value === 'credit_card') {
              <div class="space-y-2">
                <label for="creditLimit" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Limite de Crédito</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input 
                    id="creditLimit"
                    type="number" 
                    formControlName="credit_limit"
                    placeholder="0,00"
                    class="w-full pl-12 pr-4 py-4 bg-[#F8F9FA] border border-transparent rounded-2xl focus:bg-white focus:border-slate-200 focus:outline-none transition-all text-slate-600 font-medium"
                  >
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label for="closingDate" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dia Fechamento</label>
                  <input 
                    id="closingDate"
                    type="number" 
                    formControlName="closing_date"
                    placeholder="Ex: 10"
                    min="1" max="31"
                    class="w-full px-4 py-4 bg-[#F8F9FA] border border-transparent rounded-2xl focus:bg-white focus:border-slate-200 focus:outline-none transition-all text-slate-600 font-medium"
                  >
                </div>
                <div class="space-y-2">
                  <label for="dueDate" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dia Vencimento</label>
                  <input 
                    id="dueDate"
                    type="number" 
                    formControlName="due_date"
                    placeholder="Ex: 15"
                    min="1" max="31"
                    class="w-full px-4 py-4 bg-[#F8F9FA] border border-transparent rounded-2xl focus:bg-white focus:border-slate-200 focus:outline-none transition-all text-slate-600 font-medium"
                  >
                </div>
              </div>
            }

            <!-- Color -->
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cor</label>
              <div class="flex flex-wrap gap-3">
                @for (color of colors; track color) {
                  <button 
                    type="button"
                    (click)="setColor(color)"
                    class="w-10 h-10 rounded-full transition-all border-4"
                    [style.backgroundColor]="color"
                    [class.border-slate-900]="selectedColor() === color"
                    [class.border-transparent]="selectedColor() !== color">
                  </button>
                }
              </div>
            </div>

            <!-- Icon -->
            <div class="space-y-3">
              <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ícone</label>
              <div class="flex flex-wrap gap-3">
                @for (icon of icons; track icon) {
                  <button 
                    type="button"
                    (click)="setIcon(icon)"
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

            <!-- Main Account toggle -->
            <div class="flex items-center justify-between py-3 border-t border-gray-50">
              <div>
                <p class="text-sm font-bold text-slate-900">Conta Principal</p>
                <p class="text-xs text-slate-400">Usar como conta padrão para transações</p>
              </div>
              <button 
                type="button"
                (click)="toggleMain()"
                class="w-14 h-7 rounded-full relative transition-all p-1" 
                [class.bg-emerald-500]="isMainAccount()"
                [class.bg-gray-200]="!isMainAccount()">
                <div class="w-5 h-5 rounded-full bg-white shadow-sm transition-all transform"
                     [class.translate-x-7]="isMainAccount()"></div>
              </button>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="p-8 border-t border-gray-50">
          @if (errorMessage()) {
            <p class="text-red-500 text-sm text-center mb-4">{{ errorMessage() }}</p>
          }
          <button 
            (click)="onSubmit()"
            [disabled]="isLoading() || accountForm.invalid"
            class="w-full py-4 bg-[#0B1120] text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isLoading() ? 'Salvando...' : 'Salvar Conta' }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class AccountFormComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  formClose = output<void>();
  formSave = output<SupabaseAccount>();

  accountToEdit = input<SupabaseAccount | null>(null);

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  isMainAccount = signal(false);
  selectedColor = signal('#0F172A');
  selectedIcon = signal('account_balance');

  colors = ['#0F172A', '#10B981', '#3B82F6', '#A855F7', '#F97316', '#F43F5E', '#F59E0B', '#06B6D4'];
  icons = ['account_balance', 'credit_card', 'savings', 'trending_up', 'wallet', 'payments', 'attach_money', 'monetization_on'];

  accountForm = this.fb.group({
    institution_name: ['', [Validators.required]],
    account_type: ['checking', [Validators.required]],
    initial_balance: [0, [Validators.required, Validators.min(0)]],
    credit_limit: [null as number | null],
    closing_date: [null as number | null],
    due_date: [null as number | null],
  });

  constructor() {
    effect(() => {
      const acc = this.accountToEdit();
      if (acc) {
        this.accountForm.patchValue({
          institution_name: acc.institution_name,
          account_type: acc.account_type,
          initial_balance: acc.initial_balance,
          credit_limit: acc.credit_limit ?? null,
          closing_date: acc.closing_date ?? null,
          due_date: acc.due_date ?? null,
        });
        this.selectedColor.set(acc.color || '#0F172A');
        this.selectedIcon.set(acc.icon || 'account_balance');
        this.isMainAccount.set(acc.is_main_account || false);
      }
    });
  }

  setColor(color: string) {
    this.selectedColor.set(color);
  }

  setIcon(icon: string) {
    this.selectedIcon.set(icon);
  }

  toggleMain() {
    this.isMainAccount.update(v => !v);
  }

  async onSubmit() {
    if (this.accountForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const formValue = this.accountForm.value;
      const accountData = {
        institution_name: formValue.institution_name!,
        account_type: formValue.account_type!,
        initial_balance: formValue.initial_balance ?? 0,
        credit_limit: formValue.credit_limit ?? undefined,
        closing_date: formValue.closing_date ?? undefined,
        due_date: formValue.due_date ?? undefined,
        color: this.selectedColor(),
        icon: this.selectedIcon(),
        is_main_account: this.isMainAccount(),
      };

      const existingAcc = this.accountToEdit();
      let result;

      if (existingAcc) {
        result = await this.supabase.updateAccount(existingAcc.id, accountData);
      } else {
        result = await this.supabase.createAccount(accountData);
      }

      if (result.error) throw result.error;

      this.toast.success(
        existingAcc ? 'Conta atualizada!' : 'Conta criada!',
        `${formValue.institution_name} foi ${existingAcc ? 'atualizada' : 'adicionada'} com sucesso.`
      );

      if (result.data) this.formSave.emit(result.data);
      this.formClose.emit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar conta.';
      this.errorMessage.set(msg);
      this.toast.error('Erro', msg);
    } finally {
      this.isLoading.set(false);
    }
  }
}

