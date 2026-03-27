import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-invite-member-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <!-- Backdrop -->
      <button 
        type="button"
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity border-none w-full h-full cursor-default"
        aria-label="Close modal"
        (click)="closeRequest.emit()">
      </button>

      <!-- Modal Content -->
      <div class="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="p-8 sm:p-10">
          <!-- Header -->
          <div class="flex justify-between items-start mb-2">
            <h2 class="text-2xl font-bold text-slate-900">Convidar Novo Membro</h2>
            <button 
              (click)="closeRequest.emit()"
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <p class="text-sm text-slate-500 leading-relaxed mb-8">
            Envie um convite para que outra pessoa possa visualizar ou gerenciar esta conta com você.
          </p>

          <form [formGroup]="inviteForm" (ngSubmit)="submit()" class="space-y-8">
            <!-- Email Field -->
            <div class="space-y-2">
              <label for="modalEmail" class="text-sm font-bold text-slate-700">E-mail</label>
              <div class="relative">
                <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail_outline</mat-icon>
                <input 
                  id="modalEmail"
                  formControlName="email"
                  type="email" 
                  placeholder="email@exemplo.com" 
                  class="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all">
              </div>
            </div>

            <!-- Permission Level -->
            <div class="space-y-3">
              <p class="text-sm font-bold text-slate-700">Nível de permissão</p>
              
              <!-- Visualizador -->
              <label 
                for="roleViewer"
                class="relative flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all group"
                [class.border-emerald-500]="inviteForm.get('role')?.value === 'Viewer'"
                [class.bg-emerald-50/30]="inviteForm.get('role')?.value === 'Viewer'"
                [class.border-slate-100]="inviteForm.get('role')?.value !== 'Viewer'">
                <input 
                  id="roleViewer"
                  type="radio" 
                  formControlName="role" 
                  value="Viewer" 
                  class="sr-only">
                <div 
                  class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  [class.border-emerald-500]="inviteForm.get('role')?.value === 'Viewer'"
                  [class.border-slate-200]="inviteForm.get('role')?.value !== 'Viewer'">
                  @if (inviteForm.get('role')?.value === 'Viewer') {
                    <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                  }
                </div>
                <div class="ml-4">
                  <p class="text-sm font-bold text-slate-900">Visualizador</p>
                  <p class="text-xs text-slate-500 mt-0.5">Pode apenas visualizar saldo e transações.</p>
                </div>
              </label>

              <!-- Editor -->
              <label 
                for="roleEditor"
                class="relative flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all group"
                [class.border-emerald-500]="inviteForm.get('role')?.value === 'Editor'"
                [class.bg-emerald-50/30]="inviteForm.get('role')?.value === 'Editor'"
                [class.border-slate-100]="inviteForm.get('role')?.value !== 'Editor'">
                <input 
                  id="roleEditor"
                  type="radio" 
                  formControlName="role" 
                  value="Editor" 
                  class="sr-only">
                <div 
                  class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  [class.border-emerald-500]="inviteForm.get('role')?.value === 'Editor'"
                  [class.border-slate-200]="inviteForm.get('role')?.value !== 'Editor'">
                  @if (inviteForm.get('role')?.value === 'Editor') {
                    <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                  }
                </div>
                <div class="ml-4">
                  <p class="text-sm font-bold text-slate-900">Editor</p>
                  <p class="text-xs text-slate-500 mt-0.5">Pode gerenciar transações e membros.</p>
                </div>
              </label>
            </div>

            <!-- Action Button -->
            <div class="flex gap-4 pt-2">
              <button 
                type="button"
                (click)="closeRequest.emit()"
                class="flex-1 h-14 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-100">
                Cancelar
              </button>
              <button 
                type="submit"
                [disabled]="inviteForm.invalid"
                class="flex-1 h-14 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none">
                <mat-icon class="text-xl">send</mat-icon>
                Enviar Convite
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class InviteMemberModalComponent {
  private fb = inject(FormBuilder);

  @Output() closeRequest = new EventEmitter<void>();
  @Output() invite = new EventEmitter<{ email: string, role: string }>();

  inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['Viewer', Validators.required]
  });

  submit() {
    if (this.inviteForm.valid) {
      const { email, role } = this.inviteForm.value;
      this.invite.emit({ email: email!, role: role! });
    }
  }
}
