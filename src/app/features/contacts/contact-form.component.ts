import { Component, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { SupabaseService, SupabaseContact } from '../../core/services/supabase.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * Custom validator to ensure at least one payment method is provided:
 * - PIX Key
 * - OR Bank Details (Agency & Account)
 * - OR Tax ID (CPF/CNPJ)
 */
export const financialInfoValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const pix = control.get('pix_key')?.value;
  const agency = control.get('bank_agency')?.value;
  const account = control.get('account_number')?.value;
  const taxId = control.get('tax_id')?.value;

  const hasPix = !!pix && pix.trim().length > 0;
  const hasBank = (!!agency && agency.trim().length > 0) && (!!account && account.trim().length > 0);
  const hasTaxId = !!taxId && taxId.trim().length > 0;

  if (hasPix || hasBank || hasTaxId) {
    return null;
  }

  return { mandatoryFinancialInfo: true };
};

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <!-- Sidebar Panel -->
      <div class="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-500">
        <div class="p-8">
          <!-- Header -->
          <div class="flex justify-between items-center mb-10">
            <h2 class="text-2xl font-bold text-slate-900">Novo Contato</h2>
            <button (click)="closeRequest.emit()" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="contactForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Email (User Discovery Key) -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Email (opcional)</label>
              <div class="relative group">
                <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] group-focus-within:text-emerald-500 transition-colors">mail_outline</mat-icon>
                <input 
                  formControlName="email" 
                  type="email" 
                  placeholder="email@exemplo.com"
                  class="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-50 rounded-2xl text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 transition-all font-medium">
                @if (isSearching()) {
                  <div class="absolute right-4 top-1/2 -translate-y-1/2">
                    <div class="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }
              </div>
              <p class="text-[10px] text-slate-400 px-1 italic">Dica: Se o contato já usa o SmartMoney, os dados serão puxados automaticamente.</p>
            </div>

            <!-- Name -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Nome Completo</label>
              <input 
                formControlName="name" 
                type="text" 
                placeholder="Ex: Maria Oliveira"
                class="w-full h-14 px-4 bg-slate-50 border border-slate-50 rounded-2xl text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 transition-all font-medium">
            </div>

            <!-- Bank Selection (Simplified for now) -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Banco</label>
              <select 
                formControlName="bank_name" 
                class="w-full h-14 px-4 bg-slate-50 border border-slate-50 rounded-2xl text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/50 transition-all font-medium appearance-none">
                <option value="">Selecione o banco</option>
                <option value="Nubank">Nubank</option>
                <option value="Inter">Inter</option>
                <option value="Itaú">Itaú</option>
                <option value="Bradesco">Bradesco</option>
                <option value="Santander">Santander</option>
                <option value="Banco do Brasil">Banco do Brasil</option>
              </select>
            </div>

            <!-- Agency & Account -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Agência</label>
                <input 
                  formControlName="bank_agency" 
                  type="text" 
                  placeholder="0001"
                  class="w-full h-14 px-4 bg-slate-50 border border-slate-50 rounded-2xl text-slate-900 outline-none focus:bg-white transition-all font-medium"
                  [class.border-red-100]="contactForm.errors?.['mandatoryFinancialInfo'] && contactForm.touched">
              </div>
              <div class="space-y-2">
                <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Número da Conta</label>
                <input 
                  formControlName="account_number" 
                  type="text" 
                  placeholder="00000-0"
                  class="w-full h-14 px-4 bg-slate-50 border border-slate-50 rounded-2xl text-slate-900 outline-none focus:bg-white transition-all font-medium"
                  [class.border-red-100]="contactForm.errors?.['mandatoryFinancialInfo'] && contactForm.touched">
              </div>
            </div>

            <!-- CPF/CNPJ -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">CPF ou CNPJ</label>
              <input 
                formControlName="tax_id" 
                type="text" 
                placeholder="000.000.000-00"
                class="w-full h-14 px-4 bg-slate-50 border border-slate-50 rounded-2xl text-slate-900 outline-none focus:bg-white transition-all font-medium"
                [class.border-red-100]="contactForm.errors?.['mandatoryFinancialInfo'] && contactForm.touched">
            </div>

            <!-- PIX Key -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-400 uppercase tracking-wider">Chave PIX</label>
              <input 
                formControlName="pix_key" 
                type="text" 
                placeholder="CPF, E-mail, Celular ou Aleatória"
                class="w-full h-14 px-4 bg-slate-50 border border-slate-50 rounded-2xl text-slate-900 outline-none focus:bg-white transition-all font-medium"
                [class.border-red-100]="contactForm.errors?.['mandatoryFinancialInfo'] && contactForm.touched">
            </div>

            <!-- Validation Error Message -->
            @if (contactForm.errors?.['mandatoryFinancialInfo'] && contactForm.touched) {
              <div class="p-4 bg-red-50 rounded-2xl flex gap-3 items-start border border-red-100 animate-in fade-in slide-in-from-top-2">
                <mat-icon class="text-red-500 shrink-0">warning</mat-icon>
                <p class="text-xs text-red-800 leading-relaxed font-medium">
                  Informe ao menos uma chave PIX, o CPF/CNPJ ou os dados bancários completos (Agência e Conta).
                </p>
              </div>
            }

            <!-- Info Alert -->
            <div class="p-4 bg-emerald-50 rounded-2xl flex gap-3 items-start border border-emerald-100">
              <mat-icon class="text-emerald-500 shrink-0">info</mat-icon>
              <p class="text-xs text-emerald-800 leading-relaxed font-medium">
                Certifique-se de que os dados estão corretos para evitar erros em futuras transferências.
              </p>
            </div>

            <!-- Footer Actions -->
            <div class="pt-6 space-y-3">
              <button 
                type="submit" 
                [disabled]="contactForm.invalid || isSubmitting()"
                class="w-full h-14 bg-[#0B1120] text-white rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 shadow-xl shadow-slate-200/50 transition-all flex items-center justify-center gap-2">
                @if (isSubmitting()) {
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                }
                Salvar Contato
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ContactFormComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);

  closeRequest = output<void>();
  saveContact = output<Partial<SupabaseContact>>();

  isSearching = signal(false);
  isSubmitting = signal(false);

  contactForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.email]],
    bank_name: [''],
    bank_agency: [''],
    account_number: [''],
    tax_id: [''],
    pix_key: [''],
    is_favorite: [false]
  }, { validators: [financialInfoValidator] });

  constructor() {
    // Implement User Discovery Logic
    this.contactForm.get('email')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(async (email) => {
      if (email && this.contactForm.get('email')?.valid) {
        this.isSearching.set(true);
        try {
          const { data, error } = await this.supabase.searchUserByEmail(email);
          if (data && !error) {
            // Found user! Auto-fill details
            this.contactForm.patchValue({
              name: data.full_name || this.contactForm.get('name')?.value || '',
              pix_key: data.email // Default pix key to email if found
            });
          }
        } finally {
          this.isSearching.set(false);
        }
      }
    });
  }

  async onSubmit() {
    if (this.contactForm.valid) {
      this.isSubmitting.set(true);
      try {
        const contactData = this.contactForm.value;
        const { data, error } = await this.supabase.createContact(contactData as Partial<SupabaseContact>);
        if (!error && data) {
          this.saveContact.emit(data);
        } else {
          console.error('Error saving contact:', error);
          alert('Erro ao salvar contato. Tente novamente.');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }
}
