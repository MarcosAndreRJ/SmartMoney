import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-transfer-result-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div class="bg-white rounded-[32px] w-full max-w-[440px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative">
          
          <!-- Decorative Elements -->
          <div class="absolute top-8 left-8 text-emerald-100">
            <mat-icon class="text-[32px] w-[32px] h-[32px]">star</mat-icon>
          </div>
          <div class="absolute top-24 left-20 w-3 h-3 rounded-full bg-emerald-50"></div>
          <div class="absolute top-40 right-12 text-emerald-100">
            <mat-icon class="text-[24px] w-[24px] h-[24px] rotate-12">favorite</mat-icon>
          </div>

          <div class="p-10 flex flex-col items-center text-center">
            <!-- Icon Container -->
            <div class="mb-8 relative">
              <div class="w-20 h-20 rounded-full flex items-center justify-center" [ngClass]="isSuccess ? 'bg-emerald-50' : 'bg-red-50'">
                <div class="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg" 
                     [ngClass]="isSuccess ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'">
                  <mat-icon class="text-[32px] w-[32px] h-[32px]">{{ isSuccess ? 'check' : 'close' }}</mat-icon>
                </div>
              </div>
              <!-- Pulse effect -->
              <div class="absolute inset-0 rounded-full animate-ping" [ngClass]="isSuccess ? 'bg-emerald-500/20' : 'bg-red-500/20'"></div>
            </div>

            <h2 class="text-2xl font-bold text-slate-900 mb-8 leading-tight">
              {{ isSuccess ? 'Transferência Realizada com Sucesso!' : 'Erro ao Realizar Transferência' }}
            </h2>

            @if (isSuccess) {
              <!-- Amount Card -->
              <div class="w-full bg-[#F8F9FA] rounded-2xl p-6 mb-8 border border-gray-100">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Valor Enviado</p>
                <p class="text-3xl font-bold text-slate-900">R$ {{ amount }}</p>
              </div>

              <!-- Details List -->
              <div class="w-full space-y-4 mb-10">
                <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-400 font-medium">Destinatário</span>
                  <span class="text-slate-900 font-bold">{{ recipient }}</span>
                </div>
                <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-400 font-medium">Data</span>
                  <span class="text-slate-900 font-bold">{{ date }}</span>
                </div>
                <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-400 font-medium">Hora</span>
                  <span class="text-slate-900 font-bold">{{ time }}</span>
                </div>
              </div>
            } @else {
              <div class="w-full bg-red-50 rounded-2xl p-6 mb-8 border border-red-100">
                <p class="text-sm text-red-700 leading-relaxed font-medium">
                  Não foi possível processar sua transferência no momento. Por favor, verifique seu saldo ou tente novamente mais tarde.
                </p>
              </div>
            }

            <!-- Actions -->
            <div class="w-full space-y-3">
              <button (click)="closeModal.emit()" class="w-full h-14 bg-[#0B1120] text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200">
                <mat-icon class="text-[18px]">{{ isSuccess ? 'home' : 'refresh' }}</mat-icon>
                {{ isSuccess ? 'Voltar ao Início' : 'Tentar Novamente' }}
              </button>
              @if (isSuccess) {
                <button class="w-full h-14 bg-[#F8F9FA] text-slate-900 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                  <mat-icon class="text-[18px]">receipt_long</mat-icon>
                  Ver Comprovante
                </button>
              }
            </div>
          </div>

          <!-- Bottom Accent -->
          <div class="h-1.5 w-full bg-gradient-to-r" [ngClass]="isSuccess ? 'from-emerald-400 to-teal-500' : 'from-red-400 to-orange-500'"></div>
        </div>
      </div>
    }
  `
})
export class TransferResultModalComponent {
  @Input() isOpen = false;
  @Input() isSuccess = true;
  @Input() amount = '0,00';
  @Input() recipient = '';
  @Input() date = '';
  @Input() time = '';

  @Output() closeModal = new EventEmitter<void>();
}
