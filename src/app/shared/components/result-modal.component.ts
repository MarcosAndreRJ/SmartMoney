import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-result-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-white rounded-[32px] w-full max-w-[440px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        <div class="p-10 flex flex-col items-center text-center">
          <!-- Icon Container -->
          <div class="mb-8 relative">
            <div class="w-20 h-20 rounded-full flex items-center justify-center" [ngClass]="isSuccess ? 'bg-emerald-50' : 'bg-red-50'">
              <div class="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg" 
                   [ngClass]="isSuccess ? 'bg-[#10B981] shadow-emerald-200' : 'bg-red-500 shadow-red-200'">
                <mat-icon class="text-[32px] w-[32px] h-[32px]">{{ isSuccess ? 'check' : 'close' }}</mat-icon>
              </div>
            </div>
            <!-- Pulse effect -->
            <div class="absolute inset-0 rounded-full animate-ping opacity-20" [ngClass]="isSuccess ? 'bg-[#10B981]' : 'bg-red-500'"></div>
          </div>

          <!-- Title -->
          <h2 class="text-2xl font-bold text-slate-900 mb-4 leading-tight">
            {{ title || (isSuccess ? 'Salvo com sucesso!' : 'Erro ao processar') }}
          </h2>

          <!-- Description -->
          <p class="text-slate-500 text-base leading-relaxed mb-10 font-medium px-4">
            {{ message || (isSuccess 
              ? 'As informações foram atualizadas e salvas no sistema com êxito.' 
              : 'Ocorreu um erro inesperado ao salvar os dados. Por favor, tente novamente.') 
            }}
          </p>

          <!-- Button -->
          <button 
            (click)="confirm.emit()"
            class="w-full h-14 bg-[#0F172A] text-white rounded-2xl font-bold text-base hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center transform active:scale-[0.98]">
            Entendido
          </button>

          <!-- Footer/Brand -->
          <div class="mt-8 flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
            <mat-icon class="text-[14px] w-[14px] h-[14px]">verified_user</mat-icon>
            SmartMoney Secure
          </div>
        </div>

        <!-- Bottom Accent Gradient -->
        <div class="h-1.5 w-full bg-gradient-to-r" 
             [ngClass]="isSuccess ? 'from-[#10B981] via-[#34D399] to-[#F59E0B]' : 'from-red-400 via-orange-500 to-red-600'">
        </div>
      </div>
    </div>
  `
})
export class ResultModalComponent {
  @Input() isSuccess = true;
  @Input() title = '';
  @Input() message = '';
  @Output() confirm = new EventEmitter<void>();
}
