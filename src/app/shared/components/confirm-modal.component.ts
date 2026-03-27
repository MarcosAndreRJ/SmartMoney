import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-white rounded-[32px] w-full max-w-[440px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
        
        <div class="p-10 flex flex-col items-center text-center">
          <!-- Icon Container -->
          <div class="mb-8 relative">
            <div class="w-16 h-16 rounded-full flex items-center justify-center bg-red-50 text-red-500">
              <mat-icon class="text-3xl w-8 h-8">report_problem</mat-icon>
            </div>
            <!-- Pulse effect -->
            <div class="absolute inset-0 rounded-full animate-ping bg-red-500/10"></div>
          </div>

          <!-- Title -->
          <h2 class="text-2xl font-bold text-slate-900 mb-4 leading-tight">
            {{ title }}
          </h2>

          <!-- Description -->
          <p class="text-slate-500 text-base leading-relaxed mb-10 font-medium px-4">
            {{ message }}
          </p>

          <!-- Actions -->
          <div class="flex flex-col gap-3 w-full">
            <button 
              (click)="cancel.emit()"
              class="w-full h-14 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold text-base hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button 
              (click)="confirm.emit()"
              class="w-full h-14 bg-red-600 text-white rounded-2xl font-bold text-base hover:bg-red-700 transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-2 transform active:scale-[0.98]">
              Sim, Excluir
            </button>
          </div>
        </div>

        <!-- Bottom Accent Gradient -->
        <div class="h-1.5 w-full bg-gradient-to-r from-red-400 via-orange-500 to-red-600"></div>
      </div>
    </div>
  `
})
export class ConfirmModalComponent {
  @Input() title = 'Confirmar Exclusão';
  @Input() message = 'Tem certeza que deseja excluir este item? Esta ação não poderá ser desfeita.';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
