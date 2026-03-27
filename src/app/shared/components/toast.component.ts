import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ToastService } from '../services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
    <div class="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="pointer-events-auto w-[380px] bg-white rounded-xl shadow-2xl border border-gray-100 flex overflow-hidden animate-in fade-in slide-in-from-right-5 duration-300"
          [class.border-l-4]="true"
          [class.border-l-[#10B981]]="toast.type === 'success'"
          [class.border-l-[#EF4444]]="toast.type === 'error'">
          
          <div class="p-4 flex items-start gap-4 w-full relative">
            <!-- Icon -->
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              [class.bg-[#D1FAE5]]="toast.type === 'success'"
              [class.bg-[#FEE2E2]]="toast.type === 'error'">
              <mat-icon 
                class="text-xl"
                [class.text-[#059669]]="toast.type === 'success'"
                [class.text-[#DC2626]]="toast.type === 'error'">
                {{ toast.type === 'success' ? 'check_circle' : 'error' }}
              </mat-icon>
            </div>

            <!-- Content -->
            <div class="flex-1 pr-6">
              <h4 class="text-base font-bold text-slate-900 leading-tight">{{ toast.title }}</h4>
              <p class="text-sm text-slate-500 mt-1 leading-relaxed">{{ toast.message }}</p>
            </div>

            <!-- Close Button -->
            <button 
              (click)="toastService.remove(toast.id)"
              class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
              <mat-icon class="text-xl">close</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
    toastService = inject(ToastService);
}
