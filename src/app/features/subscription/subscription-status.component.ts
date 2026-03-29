import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from '../../core/services/navigation.service';

@Component({
  selector: 'app-subscription-status',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="min-h-[calc(100vh-120px)] bg-gradient-to-b from-slate-50 to-white p-6 md:p-10">
      <div class="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div class="p-8 md:p-10" [class.bg-emerald-50]="isSuccess()" [class.bg-red-50]="!isSuccess()">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
            [class.bg-emerald-500]="isSuccess()"
            [class.bg-red-500]="!isSuccess()">
            <mat-icon class="text-white">{{ isSuccess() ? 'verified' : 'error' }}</mat-icon>
          </div>
          <p class="mt-4 text-xs font-bold uppercase tracking-wider"
            [class.text-emerald-700]="isSuccess()"
            [class.text-red-700]="!isSuccess()">
            {{ actionLabel() }}
          </p>
          <h1 class="mt-2 text-3xl font-extrabold text-slate-900">{{ title() }}</h1>
          <p class="mt-2 text-slate-600 leading-relaxed">{{ message() }}</p>
        </div>

        <div class="p-8 md:p-10 space-y-4">
          @if (context()?.planName) {
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs text-slate-500 uppercase tracking-wider font-bold">Plano Atual</p>
              <p class="text-lg font-bold text-slate-900">{{ context()?.planName }}</p>
            </div>
          }

          @if (context()?.endDate) {
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs text-slate-500 uppercase tracking-wider font-bold">Acesso premium até</p>
              <p class="text-lg font-bold text-slate-900">{{ context()?.endDate }}</p>
            </div>
          }

          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              (click)="goToSubscription()"
              class="px-5 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors border-none">
              Voltar para Assinatura
            </button>
            <button
              (click)="goToDashboard()"
              class="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors border-none">
              Ir para Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SubscriptionStatusComponent {
  private navService = inject(NavigationService);

  context = this.navService.subscriptionStatusContext;
  isSuccess = computed(() => this.context()?.status === 'success');
  title = computed(() => this.context()?.title || 'Status da assinatura');
  message = computed(() => this.context()?.message || 'Não foi possível carregar os detalhes da operação.');
  actionLabel = computed(() => (this.context()?.action === 'resume' ? 'Manutenção de assinatura' : 'Cancelamento de assinatura'));

  goToSubscription() {
    this.navService.navigateTo('subscription');
  }

  goToDashboard() {
    this.navService.navigateTo('dashboard');
  }
}
