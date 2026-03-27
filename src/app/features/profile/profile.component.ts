import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { ChangePasswordModalComponent } from './change-password-modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { ResultModalComponent } from '../../shared/components/result-modal.component';
import { AvatarUploadModalComponent } from './avatar-upload-modal.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, ChangePasswordModalComponent, ResultModalComponent, AvatarUploadModalComponent],
  template: `
    <div class="p-8 max-w-5xl mx-auto space-y-8">
      <h1 class="text-3xl font-bold text-slate-900">Meu Perfil</h1>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Avatar Card -->
        <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div (click)="showAvatarModal.set(true)" 
               class="group relative w-28 h-28 rounded-full border-4 border-gray-100 overflow-hidden mb-4 cursor-pointer">
            <!-- Overlay on hover -->
            <div class="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <mat-icon class="text-white">camera_alt</mat-icon>
              <span class="text-[10px] text-white font-bold uppercase mt-1">Alterar</span>
            </div>

            @if (supabase.currentUserProfile()?.avatar) {
              <img [src]="supabase.currentUserProfile()?.avatar" alt="Profile" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerpolicy="no-referrer">
            } @else {
              <div class="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                <mat-icon class="text-5xl">person</mat-icon>
              </div>
            }
          </div>
          <h2 class="text-xl font-bold text-slate-900">{{ supabase.currentUserProfile()?.name }}</h2>
          <p class="text-slate-400 text-sm mt-1">{{ supabase.currentUserProfile()?.email }}</p>
          <span class="mt-4 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">Premium Member</span>
        </div>

        <!-- Profile Form -->
        <div class="md:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-6">
          <h3 class="text-lg font-bold text-slate-900">Informações Pessoais</h3>

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="space-y-5">
            <div class="grid grid-cols-2 gap-5">
              <div class="space-y-2">
                <label for="fullName" class="text-sm font-bold text-slate-700">Nome Completo</label>
                <input id="fullName" formControlName="fullName" type="text"
                  class="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-slate-300 transition-all text-slate-900">
              </div>
              <div class="space-y-2">
                <label for="profileEmail" class="text-sm font-bold text-slate-700">Email</label>
                <input id="profileEmail" formControlName="email" type="email" readonly
                  class="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 cursor-not-allowed">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-5">
              <div class="space-y-2">
                <label for="phone" class="text-sm font-bold text-slate-700">Telefone</label>
                <input id="phone" formControlName="phone" type="tel" placeholder="(00) 00000-0000"
                  class="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-slate-300 transition-all text-slate-900">
              </div>
              <div class="space-y-2">
                <label for="birthDate" class="text-sm font-bold text-slate-700">Data de Nascimento</label>
                <input id="birthDate" formControlName="birthDate" type="date"
                  class="w-full h-12 px-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-slate-300 transition-all text-slate-900">
              </div>
            </div>

            <div class="flex justify-end gap-4 pt-4">
              <button 
                type="button" (click)="showPasswordModal.set(true)"
                class="px-6 py-3 border border-gray-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                <mat-icon class="text-lg">vpn_key</mat-icon>
                Alterar Senha
              </button>
              <button type="submit"
                class="px-8 py-3 bg-[#0B1120] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    @if (showPasswordModal()) {
      <app-change-password-modal
        (closeModal)="showPasswordModal.set(false)"
        (passwordSuccess)="onPasswordSuccess($event)"
        (passwordError)="onPasswordError($event)">
      </app-change-password-modal>
    }

    @if (showAvatarModal()) {
      <app-avatar-upload-modal
        [currentAvatarUrl]="supabase.currentUserProfile()?.avatar || ''"
        (closeRequest)="showAvatarModal.set(false)"
        (uploadSuccess)="onAvatarUploaded($event)">
      </app-avatar-upload-modal>
    }

    @if (showResultModal()) {
      <app-result-modal
        [isSuccess]="resultIsSuccess()"
        (confirm)="showResultModal.set(false)">
      </app-result-modal>
    }
    `
})
export class ProfileComponent implements OnInit {
  supabase = inject(SupabaseService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);

  showPasswordModal = signal(false);
  showAvatarModal = signal(false);
  showResultModal = signal(false);
  resultIsSuccess = signal(true);

  profileForm = this.fb.group({
    fullName: [''],
    email: [''],
    phone: [''],
    birthDate: ['']
  });

  async ngOnInit() {
    await this.supabase.getUser();
    const profile = this.supabase.currentUserProfile();
    if (profile) {
      this.profileForm.patchValue({
        fullName: profile.name,
        email: profile.email,
        birthDate: profile.birthDate || ''
      });

      // Load phone from user metadata if exists (not in shared signal yet)
      const user = await this.supabase.getUser();
      if (user) {
        this.profileForm.patchValue({ phone: user.user_metadata?.['phone'] || '' });
      }
    }
  }

  async saveProfile() {
    try {
      await this.supabase.updateUserMetadata({
        full_name: this.profileForm.value.fullName,
        phone: this.profileForm.value.phone,
        birth_date: this.profileForm.value.birthDate
      });
      this.toast.success('Perfil atualizado!', 'Suas informações foram salvas.');
    } catch {
      this.toast.error('Erro', 'Não foi possível atualizar o perfil.');
    }
  }

  onAvatarUploaded(url: string) {
    this.showAvatarModal.set(false);
  }

  onPasswordSuccess(msg: string) {
    this.toast.success('Senha alterada', msg);
    this.resultIsSuccess.set(true);
    this.showResultModal.set(true);
  }

  onPasswordError(msg: string) {
    this.toast.error('Erro', msg);
    this.resultIsSuccess.set(false);
    this.showResultModal.set(true);
  }
}
