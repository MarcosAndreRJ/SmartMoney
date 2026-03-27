import { Component, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        <!-- Header -->
        <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <mat-icon class="text-emerald-600">vpn_key</mat-icon>
            </div>
            <h2 class="text-xl font-bold text-slate-900">Alterar Senha</h2>
          </div>
          <button (click)="closeModal.emit()" class="text-gray-400 hover:text-gray-600 transition-colors">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Body -->
        <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()" class="p-8 space-y-6">
          <!-- Current Password -->
          <div class="space-y-2">
            <label for="currentPassword" class="text-sm font-semibold text-slate-700">Senha Atual</label>
            <div class="relative flex items-center">
              <input 
                id="currentPassword"
                [type]="showCurrent() ? 'text' : 'password'" 
                formControlName="currentPassword"
                placeholder="••••••••"
                class="w-full h-14 px-5 pr-12 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-all text-base">
              <button 
                type="button"
                (click)="showCurrent.set(!showCurrent())"
                class="absolute right-4 text-gray-400 hover:text-gray-600">
                <mat-icon>{{ showCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          </div>

          <!-- New Password -->
          <div class="space-y-2">
            <label for="newPassword" class="text-sm font-semibold text-slate-700">Nova Senha</label>
            <div class="relative flex items-center">
              <input 
                id="newPassword"
                [type]="showNew() ? 'text' : 'password'" 
                formControlName="newPassword"
                placeholder="Mínimo 8 caracteres"
                class="w-full h-14 px-5 pr-12 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-all text-base">
              <button 
                type="button"
                (click)="showNew.set(!showNew())"
                class="absolute right-4 text-gray-400 hover:text-gray-600">
                <mat-icon>{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          </div>

          <!-- Confirm Password -->
          <div class="space-y-2">
            <label for="confirmPassword" class="text-sm font-semibold text-slate-700">Confirmar Nova Senha</label>
            <div class="relative flex items-center">
              <input 
                id="confirmPassword"
                [type]="showConfirm() ? 'text' : 'password'" 
                formControlName="confirmPassword"
                placeholder="Repita a nova senha"
                class="w-full h-14 px-5 pr-12 rounded-xl border border-gray-200 focus:border-emerald-500 outline-none transition-all text-base">
              <button 
                type="button"
                (click)="showConfirm.set(!showConfirm())"
                class="absolute right-4 text-gray-400 hover:text-gray-600">
                <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          </div>

          <!-- Requirements -->
          <div class="p-4 bg-emerald-50/50 rounded-xl space-y-2">
            <div class="flex items-center gap-2 text-[13px] text-emerald-700">
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span>Use pelo menos uma letra maiúscula e um número.</span>
            </div>
            <div class="flex items-center gap-2 text-[13px] text-emerald-700">
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <span>Evite usar dados pessoais como datas de aniversário.</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-4 pt-4">
            <button 
              type="button"
              (click)="closeModal.emit()"
              class="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
              Cancelar
            </button>
            <button 
              type="submit"
              [disabled]="passwordForm.invalid || isSubmitting()"
              class="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100">
              @if (isSubmitting()) {
                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              } @else {
                <mat-icon class="text-lg">save</mat-icon>
              }
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ChangePasswordModalComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);

  closeModal = output();
  passwordSuccess = output<string>();
  passwordError = output<string>();

  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);
  isSubmitting = signal(false);

  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: (group: AbstractControl) => {
      const pass = group.get('newPassword')?.value;
      const confirmPass = group.get('confirmPassword')?.value;
      return pass === confirmPass ? null : { notSame: true };
    }
  });

  async onSubmit() {
    if (this.passwordForm.invalid) return;

    this.isSubmitting.set(true);
    try {
      const { error } = await this.supabase.client.auth.updateUser({
        password: this.passwordForm.value.newPassword!
      });

      if (error) throw error;

      this.passwordSuccess.emit('Senha alterada com sucesso!');
      this.closeModal.emit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar senha';
      this.passwordError.emit(msg);
      this.closeModal.emit();
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
