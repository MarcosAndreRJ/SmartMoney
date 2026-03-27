import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isLoading()) {
      <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md transition-all duration-300">
        <!-- Logo/Icon Animation -->
        <div class="relative flex items-center justify-center mb-6">
          <div class="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
          <div class="absolute w-20 h-20 border-4 border-t-[#0F172A] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div class="absolute flex items-center justify-center text-[#0F172A]">
            <span class="material-icons text-4xl animate-pulse">account_balance_wallet</span>
          </div>
        </div>
        
        <!-- Text -->
        <div class="text-center space-y-2">
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">{{ message() }}</h2>
          <div class="flex items-center justify-center gap-1">
            <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class LoadingOverlayComponent {
  isLoading = input<boolean>(false);
  message = input<string>('Sincronizando dados...');
}
