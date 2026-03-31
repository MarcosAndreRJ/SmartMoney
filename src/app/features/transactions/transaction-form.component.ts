import { Component, OnInit, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService, SupabaseTransaction, SupabaseAccount, SupabaseCardTransaction } from '../../core/services/supabase.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex justify-end animate-in fade-in duration-300">
      <div 
        class="w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col relative"
        (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="p-8 pb-6 flex items-center justify-between border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              [class.bg-red-50]="selectedType() === 'expense'"
              [class.text-red-500]="selectedType() === 'expense'"
              [class.bg-emerald-50]="selectedType() === 'income'"
              [class.text-emerald-500]="selectedType() === 'income'">
              <mat-icon>{{ selectedType() === 'expense' ? 'trending_down' : 'trending_up' }}</mat-icon>
            </div>
            <div>
              <h2 class="text-xl font-black text-slate-800 leading-tight">Nova Transação</h2>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Lançamento Financeiro</p>
            </div>
          </div>
          <button 
            (click)="formClose.emit()"
            class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Scrollable Form -->
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form [formGroup]="txForm" (ngSubmit)="onSubmit()" class="space-y-8">
            
            <!-- Type Selection (Segmented Control) -->
            <div class="space-y-3">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Lançamento</span>
              <div class="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
                <button 
                  type="button"
                  (click)="setType('expense')"
                  class="flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  [class.bg-white]="selectedType() === 'expense'"
                  [class.text-red-600]="selectedType() === 'expense'"
                  [class.shadow-sm]="selectedType() === 'expense'"
                  [class.text-slate-500]="selectedType() !== 'expense'"
                  [class.hover:text-slate-700]="selectedType() !== 'expense'">
                  <mat-icon class="text-lg">arrow_downward</mat-icon>
                  Despesa
                </button>
                <button 
                  type="button"
                  (click)="setType('income')"
                  class="flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  [class.bg-white]="selectedType() === 'income'"
                  [class.text-emerald-600]="selectedType() === 'income'"
                  [class.shadow-sm]="selectedType() === 'income'"
                  [class.text-slate-500]="selectedType() !== 'income'"
                  [class.hover:text-slate-700]="selectedType() !== 'income'">
                  <mat-icon class="text-lg">arrow_upward</mat-icon>
                  Receita
                </button>
              </div>
            </div>

            <!-- Description -->
            <div class="space-y-3">
              <label for="description" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
              <div class="group">
                <input 
                  id="description"
                  type="text" 
                  formControlName="description"
                  placeholder="Ex: Mercadinho da Esquina"
                  class="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-[#0F172A]/10 focus:outline-none transition-all text-slate-700 font-bold placeholder:text-slate-300">
              </div>
            </div>

            <!-- Amount with BRL mask -->
            <div class="space-y-3">
              <label for="amount" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</label>
              <div class="relative group">
                <div class="absolute left-6 top-1/2 -translate-y-1/2 flex items-center text-slate-400">
                  <span class="font-black text-lg">R$</span>
                </div>
                <input 
                  id="amount"
                  type="text" 
                  [value]="formattedAmount()"
                  (input)="onAmountInput($event)"
                  placeholder="0,00"
                  class="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-[#0F172A]/10 focus:outline-none transition-all text-slate-800 text-3xl font-black placeholder:text-slate-200">
              </div>
            </div>

            <!-- Category & Subcategory Grid -->
            <div class="grid grid-cols-2 gap-5">
              <div class="space-y-3">
                <label for="category" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</label>
                <div class="relative group">
                  <select 
                    id="category"
                    formControlName="category"
                    (change)="onCategoryChange()"
                    class="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-[#0F172A]/10 focus:outline-none transition-all text-slate-700 font-bold appearance-none cursor-pointer">
                    <option value="">Selecione...</option>
                    @for (cat of mainCategories(); track cat.id) {
                      <option [value]="cat.id">{{ cat.name }}</option>
                    }
                  </select>
                  <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform group-hover:translate-y-[-40%]">expand_more</mat-icon>
                </div>
              </div>

              <div class="space-y-3">
                <label for="subcategory" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Subcategoria @if (hasSubcategories()) { <span class="text-red-400">*</span> }
                </label>
                <div class="relative group">
                  <select 
                    id="subcategory"
                    formControlName="subcategory"
                    [disabled]="!hasSubcategories()"
                    class="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-[#0F172A]/10 focus:outline-none transition-all text-slate-700 font-bold appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">Selecione...</option>
                    @for (sub of subcategories(); track sub.id) {
                      <option [value]="sub.name">{{ sub.name }}</option>
                    }
                  </select>
                  <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform group-hover:translate-y-[-40%]">expand_more</mat-icon>
                </div>
                @if (hasSubcategories() && !txForm.get('subcategory')?.value) {
                  <p class="text-[10px] text-red-400 font-bold">Subcategoria obrigatória</p>
                }
              </div>
            </div>

            <!-- Date -->
            <div class="space-y-3">
              <label for="date" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
              <div class="relative">
                <input 
                  id="date"
                  type="date" 
                  formControlName="date"
                  class="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-[#0F172A]/10 focus:outline-none transition-all text-slate-700 font-bold [&::-webkit-calendar-picker-indicator]:opacity-0">
                <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_today</mat-icon>
              </div>
            </div>

            <!-- Account Selection -->
            <div class="space-y-3">
              <label for="account" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conta / Cartão</label>
              <div class="relative group">
                <select 
                  id="account"
                  formControlName="account_id"
                  class="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-[20px] focus:bg-white focus:border-[#0F172A]/10 focus:outline-none transition-all text-slate-700 font-bold appearance-none cursor-pointer">
                  <option value="">Selecione a conta...</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">
                      {{ acc.institution_name }} ({{ acc.account_type === 'credit_card' ? 'Cartão' : 'Saldo' }})
                    </option>
                  }
                </select>
                <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">account_balance_wallet</mat-icon>
              </div>
            </div>

            <!-- Status Toggle (Simplified) -->
            <div class="flex items-center justify-between p-6 rounded-[24px] bg-slate-50 border border-slate-100">
               <div class="flex flex-col gap-0.5">
                  <p class="text-sm font-bold text-slate-800">Transação Confirmada</p>
                  <p class="text-[10px] font-medium text-slate-400">Marcar como efetuada no saldo</p>
               </div>
               <button 
                  type="button"
                  (click)="toggleStatus()"
                  class="w-14 h-7 rounded-full relative transition-all p-1" 
                  [class.bg-emerald-500]="isConfirmed()"
                  [class.bg-slate-200]="!isConfirmed()">
                  <div class="w-5 h-5 rounded-full bg-white shadow-md transition-all transform"
                       [class.translate-x-7]="isConfirmed()"></div>
                </button>
            </div>

          </form>
        </div>

        <!-- Footer Actions -->
        <div class="p-8 border-t border-gray-100 flex flex-col gap-4">
          @if (errorMessage()) {
            <div class="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
              <mat-icon class="text-sm">error_outline</mat-icon>
              {{ errorMessage() }}
            </div>
          }
          
          <div class="grid grid-cols-2 gap-4">
            <button 
              (click)="formClose.emit()"
              class="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all">
              Cancelar
            </button>
            <button 
              (click)="onSubmit()"
              [disabled]="isLoading() || txForm.invalid"
              class="py-4 bg-[#0F172A] text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isLoading() ? 'Aguarde...' : 'Salvar Transação' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
  `]
})
export class TransactionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private toast = inject(ToastService);

  formClose = output<void>();
  formSave = output<void>();

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  
  accounts = signal<SupabaseAccount[]>([]);
  allCategories = signal<any[]>([]);
  mainCategories = signal<any[]>([]);
  subcategories = signal<any[]>([]);
  hasSubcategories = signal(false);
  
  selectedType = signal<'income' | 'expense'>('expense');
  isConfirmed = signal(true);
  formattedAmount = signal('0,00');
  rawAmount = signal<number | null>(null);

  txForm = this.fb.group({
    description: ['', [Validators.required, Validators.minLength(3)]],
    category: ['', [Validators.required]],
    subcategory: [''],
    date: [new Date().toISOString().split('T')[0], [Validators.required]],
    account_id: ['', [Validators.required]],
  });

  async ngOnInit() {
    await this.loadFormData();
  }

  private async loadFormData() {
    const [accs, cats] = await Promise.all([
      this.supabase.getAccounts(),
      this.supabase.getAllCategories()
    ]);

    if (accs.data) this.accounts.set(accs.data);
    if (cats.data) {
      this.allCategories.set(cats.data);
      this.filterCategoriesByType(this.selectedType());
    }
    
    const mainAcc = accs.data?.find(a => a.is_main_account);
    if (mainAcc) {
      this.txForm.patchValue({ account_id: mainAcc.id });
    }
  }

  private filterCategoriesByType(type: 'income' | 'expense') {
    const filtered = this.allCategories().filter(c => c.type === type && c.parent_id === null);
    this.mainCategories.set(filtered);
    this.subcategories.set([]);
    this.hasSubcategories.set(false);
    this.txForm.patchValue({ category: '', subcategory: '' });
  }

  setType(type: 'income' | 'expense') {
    this.selectedType.set(type);
    this.filterCategoriesByType(type);
  }

  onCategoryChange() {
    const catId = this.txForm.get('category')?.value;
    if (!catId) {
      this.subcategories.set([]);
      this.hasSubcategories.set(false);
      this.txForm.patchValue({ subcategory: '' });
      return;
    }

    const subs = this.allCategories().filter(c => c.parent_id === catId);
    this.subcategories.set(subs);
    this.hasSubcategories.set(subs.length > 0);

    if (subs.length > 0) {
      this.txForm.patchValue({ subcategory: '' });
    } else {
      this.txForm.patchValue({ subcategory: '' });
    }
  }

  onAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let raw = input.value.replace(/\D/g, '');
    const cents = parseInt(raw || '0', 10);
    this.rawAmount.set(cents / 100);
    this.formattedAmount.set(this.formatBRL(cents / 100));
  }

  private formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  toggleStatus() {
    this.isConfirmed.update(v => !v);
  }

  async onSubmit() {
    if (this.txForm.invalid) {
      this.errorMessage.set('Preencha todos os campos obrigatórios.');
      return;
    }

    const amount = this.rawAmount();
    if (!amount || amount <= 0) {
      this.errorMessage.set('Informe um valor válido.');
      return;
    }

    if (this.hasSubcategories() && !this.txForm.get('subcategory')?.value) {
      this.errorMessage.set('Selecione uma subcategoria.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const formValue = this.txForm.value;
      const accountId = formValue.account_id!;
      const selectedAcc = this.accounts().find(a => a.id === accountId);
      const isCard = selectedAcc?.account_type === 'credit_card';

      const txStatus = this.isConfirmed() ? 'confirmed' : 'pending';
      const categoryValue = formValue.subcategory || formValue.category!;

      const txData = {
        description: formValue.description!,
        amount: amount,
        date: formValue.date!,
        category: categoryValue,
        status: txStatus as 'confirmed' | 'pending' | 'cancelled'
      };

      if (isCard) {
        const cardTx: Partial<SupabaseCardTransaction> = {
          ...txData,
          card_id: accountId,
          status: txStatus as 'confirmed' | 'pending' | 'cancelled'
        };
        const { error } = await this.supabase.createCardTransaction(cardTx);
        if (error) throw error;
      } else {
        const tx: Partial<SupabaseTransaction> = {
          ...txData,
          account_id: accountId,
          type: this.selectedType() as 'income' | 'expense',
          status: txStatus as 'confirmed' | 'pending' | 'cancelled'
        };
        const { error } = await this.supabase.createTransaction(tx);
        if (error) throw error;

        if (txStatus === 'confirmed') {
          const delta = this.selectedType() === 'income' ? txData.amount : -txData.amount;
          await this.updateAccountBalance(accountId, delta);
        }
      }

      this.toast.success('Transação Salva', 'Lançamento registrado com sucesso.');
      this.formSave.emit();
      this.formClose.emit();

    } catch (err: any) {
      this.errorMessage.set(err.message || 'Erro ao salvar transação.');
      this.toast.error('Erro', this.errorMessage()!);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async updateAccountBalance(accountId: string, delta: number) {
    const acc = this.accounts().find(a => a.id === accountId);
    if (!acc) return;

    const newBalance = Number(acc.initial_balance) + delta;
    await this.supabase.updateAccount(accountId, { initial_balance: newBalance });
  }
}
