import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NavigationService } from '../../core/services/navigation.service';
import { AdminService } from '../../core/services/admin.service';
import { SupabaseService } from '../../core/services/supabase.service';

interface PlanDetails {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  features: string[];
  billingCycle: string;
}

@Component({
  selector: 'app-subscription-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#F8F9FA] p-8">
      <div class="max-w-6xl mx-auto">
        <button (click)="goBack()" class="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors">
          <mat-icon>arrow_back</mat-icon>
          <span class="font-medium">Voltar</span>
        </button>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <div class="flex items-center justify-between mb-8">
                <h1 class="text-2xl font-bold text-slate-900">
                  @switch (step()) {
                    @case (1) { Identificação }
                    @case (2) { Pagamento }
                    @case (3) { Confirmação }
                  }
                </h1>
                <div class="flex items-center gap-2">
                  @for (s of [1,2,3]; track s) {
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      [class.bg-emerald-500]="step() >= s"
                      [class.text-white]="step() >= s"
                      [class.bg-slate-200]="step() < s"
                      [class.text-slate-500]="step() < s">
                      {{ s }}
                    </div>
                    @if (s < 3) {
                      <div class="w-8 h-0.5"
                        [class.bg-emerald-500]="step() > s"
                        [class.bg-slate-200]="step() <= s">
                      </div>
                    }
                  }
                </div>
              </div>

              @switch (step()) {
                @case (1) {
                  <div class="space-y-6">
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-2">Nome Completo</label>
                      <input type="text" [value]="userName()" 
                        class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
                        disabled>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700 mb-2">E-mail</label>
                      <input type="email" [value]="userEmail()" 
                        class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
                        disabled>
                    </div>
                    <p class="text-sm text-slate-500">Você será redirecionado automaticamente para o pagamento.</p>
                    <button (click)="nextStep()" class="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors">
                      Continuar
                    </button>
                  </div>
                }
                @case (2) {
                  <div class="space-y-6">
                    <div class="flex gap-2 bg-slate-100 p-1 rounded-xl">
                      @for (method of paymentMethods; track method.id) {
                        <button (click)="paymentMethod.set(method.id)"
                          class="flex-1 py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2"
                          [class.bg-white]="paymentMethod() === method.id"
                          [class.text-emerald-600]="paymentMethod() === method.id"
                          [class.shadow-sm]="paymentMethod() === method.id"
                          [class.text-slate-600]="paymentMethod() !== method.id">
                          <mat-icon class="text-lg">{{ method.icon }}</mat-icon>
                          {{ method.label }}
                        </button>
                      }
                    </div>

                    @if (paymentMethod() === 'card') {
                      <div class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium text-slate-700 mb-2">Número do Cartão</label>
                          <input type="text" [(ngModel)]="cardNumber" placeholder="0000 0000 0000 0000"
                            class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        </div>
                        <div>
                          <label class="block text-sm font-medium text-slate-700 mb-2">Nome do Titular</label>
                          <input type="text" [(ngModel)]="cardName" placeholder="Nome como está no cartão"
                            class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">Validade</label>
                            <input type="text" [(ngModel)]="cardExpiry" placeholder="MM/AA"
                              class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                          </div>
                          <div>
                            <label class="block text-sm font-medium text-slate-700 mb-2">CVV</label>
                            <input type="text" [(ngModel)]="cardCvv" placeholder="123"
                              class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                          </div>
                        </div>
                      </div>
                    }

                    @if (paymentMethod() === 'pix') {
                      <div class="text-center py-8 space-y-4">
                        <div class="w-48 h-48 bg-white border-2 border-emerald-100 rounded-xl mx-auto flex items-center justify-center">
                          <div class="text-center">
                            <mat-icon class="text-6xl text-emerald-500">qr_code_2</mat-icon>
                            <p class="text-xs text-slate-500 mt-2">QR Code PIX</p>
                          </div>
                        </div>
                        <div class="bg-emerald-50 rounded-xl p-4">
                          <p class="text-sm text-emerald-700 font-medium">Copie o código PIX</p>
                          <code class="block mt-2 p-3 bg-white rounded-lg text-xs text-slate-600 break-all">
                            00020126580014BR.GOV.BCB.PIX0136random-pix-code-here-00000000000000
                          </code>
                          <button (click)="copyPixCode()" class="mt-3 text-sm text-emerald-600 font-medium hover:text-emerald-700">
                            <mat-icon class="text-lg align-middle">content_copy</mat-icon>
                            Copiar código
                          </button>
                        </div>
                      </div>
                    }

                    @if (paymentMethod() === 'boleto') {
                      <div class="space-y-4">
                        <div class="bg-slate-50 rounded-xl p-6 text-center">
                          <mat-icon class="text-4xl text-slate-400">receipt_long</mat-icon>
                          <p class="text-slate-600 mt-2">Boleto Bancário</p>
                        </div>
                        <div class="bg-slate-50 rounded-xl p-4">
                          <p class="text-sm text-slate-500 mb-2">Linha Digitável</p>
                          <code class="block p-3 bg-white rounded-lg text-sm text-slate-700 font-mono">
                            00190.00001  00000.000001  00000.00000  1  82340000000000
                          </code>
                          <button (click)="copyBoletoCode()" class="mt-3 text-sm text-slate-600 font-medium hover:text-slate-700">
                            <mat-icon class="text-lg align-middle">content_copy</mat-icon>
                            Copiar linha digitável
                          </button>
                        </div>
                        <p class="text-xs text-slate-500">O boleto será enviado para seu e-mail após a conclusão.</p>
                      </div>
                    }

                    <button (click)="finalizarPagamento()" 
                      [disabled]="processing()"
                      class="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      @if (processing()) {
                        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processando...
                      } @else {
                        Finalizar Pagamento
                      }
                    </button>
                  </div>
                }
                @case (3) {
                  <div class="text-center py-12 space-y-6">
                    <div class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                      <mat-icon class="text-5xl text-emerald-500">check_circle</mat-icon>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-900">Assinatura ativada!</h2>
                    <p class="text-slate-500 max-w-md mx-auto">
                      Parabéns! Seu plano {{ selectedPlan()?.name }} está ativo. 
                      Você pode aproveitar todos os benefícios agora.
                    </p>
                    <button (click)="goToDashboard()" 
                      class="py-4 px-8 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors">
                      Voltar ao Dashboard
                    </button>
                  </div>
                }
              }
            </div>
          </div>

          <div class="lg:col-span-1">
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-8">
              <h3 class="text-lg font-bold text-slate-900 mb-4">Resumo do Pedido</h3>
              
              @if (selectedPlan()) {
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-slate-900">{{ selectedPlan()?.name }}</span>
                    <span class="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">MENSAL</span>
                  </div>
                  
                  <ul class="space-y-2">
                    @for (feature of selectedPlan()?.features; track feature) {
                      <li class="flex items-center gap-2 text-sm text-slate-600">
                        <mat-icon class="text-emerald-500 text-lg">check</mat-icon>
                        {{ feature }}
                      </li>
                    }
                  </ul>

                  <div class="border-t border-slate-100 pt-4 space-y-2">
                    <div class="flex justify-between text-sm">
                      <span class="text-slate-500">Subtotal</span>
                      <span class="text-slate-900">{{ selectedPlan()?.price }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                      <span class="text-slate-500">Taxas</span>
                      <span class="text-emerald-600 font-medium">Isento</span>
                    </div>
                    <div class="flex justify-between text-lg font-bold pt-2 border-t border-slate-100">
                      <span>Total a pagar</span>
                      <span>{{ selectedPlan()?.price }}</span>
                    </div>
                  </div>

                  <div class="bg-slate-50 rounded-xl p-4">
                    <p class="text-sm text-slate-500">Próxima renovação</p>
                    <p class="font-medium text-slate-900">{{ nextBillingDate() }}</p>
                  </div>

                  <div class="bg-emerald-50 rounded-xl p-4 text-center">
                    <mat-icon class="text-emerald-500">verified_user</mat-icon>
                    <p class="text-sm text-emerald-700 font-medium mt-1">Satisfação Garantida</p>
                    <p class="text-xs text-emerald-600">7 dias para solicitar reembolso</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SubscriptionCheckoutComponent implements OnInit {
  private navService = inject(NavigationService);
  private adminService = inject(AdminService);
  private supabaseService = inject(SupabaseService);

  step = signal<1 | 2 | 3>(2);
  paymentMethod = signal<'card' | 'pix' | 'boleto'>('card');
  selectedPlan = signal<PlanDetails | null>(null);
  processing = signal(false);

  userName = signal('');
  userEmail = signal('');

  cardNumber = '';
  cardName = '';
  cardExpiry = '';
  cardCvv = '';

  paymentMethods = [
    { id: 'card' as const, label: 'Cartão', icon: 'credit_card' },
    { id: 'pix' as const, label: 'PIX', icon: 'pix' },
    { id: 'boleto' as const, label: 'Boleto', icon: 'receipt' }
  ];

  nextBillingDate = computed(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  async ngOnInit() {
    const user = await this.supabaseService.getUser();
    if (user) {
      this.userName.set((user.user_metadata as any)?.full_name || user.email?.split('@')[0] || '');
      this.userEmail.set(user.email || '');
      this.step.set(2);
    } else {
      this.step.set(1);
    }

    await this.loadSelectedPlan();
  }

  async loadSelectedPlan() {
    const planId = this.navService.selectedPlanId();
    if (planId) {
      const plans = await this.adminService.getPlans();
      const plan = plans.find((p: any) => p.id === planId);
      if (plan) {
        this.selectedPlan.set({
          id: plan.id,
          name: plan.name,
          price: plan.price == 0 ? 'Grátis' : `R$ ${Number(plan.price).toFixed(2)}`,
          priceValue: Number(plan.price) || 0,
          features: plan.features || [],
          billingCycle: 'mensal'
        });
      }
    }
  }

  nextStep() {
    if (this.step() === 1) {
      this.step.set(2);
    }
  }

  goBack() {
    const currentSub = this.navService.selectedPlanId();
    if (currentSub) {
      this.navService.navigateTo('subscription');
    } else {
      this.navService.navigateTo('dashboard');
    }
  }

  copyPixCode() {
    const code = '00020126580014BR.GOV.BCB.PIX0136random-pix-code-here-00000000000000';
    navigator.clipboard.writeText(code);
    alert('Código PIX copiado!');
  }

  copyBoletoCode() {
    const code = '00190.00001  00000.000001  00000.00000  1  82340000000000';
    navigator.clipboard.writeText(code);
    alert('Linha digitável copiada!');
  }

  async finalizarPagamento() {
    this.processing.set(true);

    try {
      const user = await this.supabaseService.getUser();
      if (!user) {
        alert('Usuário não autenticado');
        return;
      }

      const plan = this.selectedPlan();
      if (!plan) {
        alert('Plano não selecionado');
        return;
      }

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const existingSub = await this.adminService.getUserSubscription(user.id);

      if (existingSub?.id) {
        await this.adminService.updateSubscription(existingSub.id, {
          plan_id: plan.id,
          status: 'active',
          payment_gateway: this.getGatewayName()
        });
      } else {
        await this.adminService.createSubscription({
          user_id: user.id,
          plan_id: plan.id,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          payment_gateway: this.getGatewayName()
        });
      }

      this.step.set(3);
    } catch (err) {
      console.error('Error processing payment:', err);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      this.processing.set(false);
    }
  }

  getGatewayName(): 'pagarme' | 'stripe' | 'manual' | 'credit_card' | 'pix' | 'boleto' {
    switch (this.paymentMethod()) {
      case 'card': return 'credit_card';
      case 'pix': return 'pix';
      case 'boleto': return 'boleto';
      default: return 'manual';
    }
  }

  goToDashboard() {
    this.navService.navigateTo('dashboard');
  }
}
