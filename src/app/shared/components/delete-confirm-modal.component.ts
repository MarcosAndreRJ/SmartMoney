import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-delete-confirm-modal',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
    <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div class="bg-white rounded-[32px] w-full max-w-[440px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        <div class="p-10 flex flex-col items-center text-center">
          
          <!-- Icon -->
          <div class="mb-8">
            <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
              <mat-icon class="text-red-500 text-3xl">report_problem</mat-icon>
            </div>
          </div>

          <!-- Title -->
          <h2 class="text-2xl font-bold text-slate-900 mb-4 leading-tight">
            {{ title() }}
          </h2>

          <!-- Description -->
          <p class="text-slate-500 text-base leading-relaxed mb-10 px-4">
            {{ message() }}
          </p>

          <!-- Actions -->
          <div class="flex gap-3 w-full">
            <button 
              (click)="cancel.emit()"
              class="flex-1 h-14 bg-slate-50 text-slate-600 rounded-2xl font-bold text-base hover:bg-slate-100 transition-all">
              Cancelar
            </button>
            <button 
              (click)="confirm.emit()"
              class="flex-1 h-14 bg-red-500 text-white rounded-2xl font-bold text-base hover:bg-red-600 shadow-lg shadow-red-100 transition-all">
              Sim, Excluir
            </button>
          </div>
        </div>
        
        <!-- Bottom border accent -->
        <div class="h-1.5 w-full bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-10"></div>
      </div>
    </div>
  `
})
export class DeleteConfirmModalComponent {
    title = input<string>('Confirmar Exclusão');
    message = input<string>('Tem certeza que deseja excluir este item? Esta ação não poderá ser desfeita e os dados serão removidos permanentemente da sua conta SmartKonta.');

    confirm = output<void>();
    cancel = output<void>();
}
