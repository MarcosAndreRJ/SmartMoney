import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  SupabaseService, SupabaseLoan, SupabaseLoanPayment, SupabaseAccount, SupabaseTransaction
} from '../../core/services/supabase.service';

interface NewLoanForm {
  creditor_name: string;
  type: 'fixed' | 'interest';
  initial_amount: number | null;
  monthly_rate: number | null;
  total_installments: number | null;
  due_day: number | null;
  start_date: string;
  account_id: string;
}

@Component({
  selector: 'app-loans-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 pb-20">

      <!-- Header -->
      <div class="flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Gestão de Empréstimos</h1>
          <p class="text-slate-500 mt-1 font-medium">Acompanhe seus contratos ativos e pagamentos pendentes.</p>
        </div>
        <button (click)="openAddModal()" class="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
          <mat-icon class="text-lg">add</mat-icon>
          Novo Empréstimo
        </button>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- Total em Dívida -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-4">
            <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Total em Dívida</p>
            <div class="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <mat-icon class="text-red-500 text-[20px]">account_balance</mat-icon>
            </div>
          </div>
          <p class="text-2xl font-black text-slate-900">R$ {{ totalDebt() | number:'1.2-2' }}</p>
          <p class="text-[10px] font-bold text-slate-400 mt-2">{{ activeLoans().length }} contrato{{ activeLoans().length !== 1 ? 's' : '' }} ativos</p>
        </div>

        <!-- Próximo Vencimento -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-4">
            <p class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Próximo Vencimento</p>
            <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <mat-icon class="text-amber-500 text-[20px]">event</mat-icon>
            </div>
          </div>
          <p class="text-2xl font-black text-slate-900">{{ nextDueLabel() }}</p>
          <p class="text-[10px] font-bold text-slate-400 mt-2">{{ nextMinimumPayment() > 0 ? 'Mín: R$ ' + (nextMinimumPayment() | number:\'1.2-2\') : '—' }}</p>
        </div>

        <!-- Total Pago -->
        <div class="bg-[#0F172A] rounded-2xl p-6 shadow-xl shadow-slate-200">
          <div class="flex justify-between items-start mb-4">
            <p class="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Total Pago</p>
            <div class="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <mat-icon class="text-white text-[20px]">check_circle</mat-icon>
            </div>
          </div>
          <p class="text-2xl font-black text-white">R$ {{ totalPaid() | number:'1.2-2' }}</p>
          <div class="w-full bg-white/10 h-1 rounded-full mt-4 overflow-hidden">
            <div class="h-full bg-emerald-400 rounded-full transition-all" [style.width]="paymentProgressWidth() + '%'"></div>
          </div>
        </div>
      </div>

      <!-- Loans Table -->
      @if (isLoading()) {
        <div class="flex items-center justify-center h-48 text-slate-400">
          <mat-icon class="animate-spin mr-3 text-3xl">refresh</mat-icon>
          <span class="font-medium">Carregando contratos...</span>
        </div>
      } @else if (loans().length === 0) {
        <div class="flex flex-col items-center justify-center h-56 gap-3 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <mat-icon class="text-[56px]">account_balance</mat-icon>
          <p class="font-bold text-lg">Nenhum empréstimo cadastrado</p>
          <p class="text-sm">Clique em "Novo Empréstimo" para adicionar um contrato.</p>
        </div>
      } @else {
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="flex justify-between items-center px-6 py-5 border-b border-slate-100">
            <h2 class="text-base font-extrabold text-slate-900">Contratos Ativos</h2>
            <span class="text-xs font-medium text-slate-500">{{ loans().length }} contrato{{ loans().length !== 1 ? 's' : '' }}</span>
          </div>

          <!-- Table Header -->
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-slate-50/70 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th class="px-6 py-4">Credor</th>
                  <th class="px-6 py-4">Tipo</th>
                  <th class="px-6 py-4">Valor Inicial</th>
                  <th class="px-6 py-4">Saldo Devedor</th>
                  <th class="px-6 py-4">Próxima Parcela</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                @for (loan of loans(); track loan.id) {
                  <tr class="hover:bg-slate-50/50 transition-colors group">
                    <!-- Credor -->
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl font-extrabold flex items-center justify-center text-sm text-white shrink-0"
                          [style.backgroundColor]="getBrandColor(loan.creditor_name)">
                          {{ loan.creditor_name.charAt(0).toUpperCase() }}
                        </div>
                        <div>
                          <p class="text-sm font-bold text-slate-900">{{ loan.creditor_name }}</p>
                          @if (loan.type === 'fixed') {
                            <p class="text-[10px] text-slate-400 font-medium">{{ loan.paid_installments }}/{{ loan.total_installments }}x pago</p>
                          } @else {
                            <p class="text-[10px] text-slate-400 font-medium">{{ loan.monthly_rate }}% a.m.</p>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- Tipo -->
                    <td class="px-6 py-4">
                      <span class="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                        [class.bg-indigo-50]="loan.type === 'interest'"
                        [class.text-indigo-600]="loan.type === 'interest'"
                        [class.bg-slate-100]="loan.type === 'fixed'"
                        [class.text-slate-600]="loan.type === 'fixed'">
                        {{ loan.type === 'fixed' ? 'Fixo' : 'Com Juros' }}
                      </span>
                    </td>

                    <!-- Valor Inicial -->
                    <td class="px-6 py-4">
                      <span class="text-sm font-semibold text-slate-700">R$ {{ loan.initial_amount | number:'1.2-2' }}</span>
                    </td>

                    <!-- Saldo Devedor -->
                    <td class="px-6 py-4">
                      <span class="text-sm font-bold text-red-600">R$ {{ loan.current_balance | number:'1.2-2' }}</span>
                      <div class="w-20 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                        <div class="h-full bg-red-400 rounded-full"
                          [style.width]="((loan.current_balance / loan.initial_amount) * 100) + '%'"></div>
                      </div>
                    </td>

                    <!-- Próxima Parcela -->
                    <td class="px-6 py-4">
                      <p class="text-sm font-semibold text-slate-700">{{ formatNextDue(loan.due_day) }}</p>
                      <p class="text-[10px] text-slate-400 font-medium">R$ {{ getMinPayment(loan) | number:'1.2-2' }}</p>
                    </td>

                    <!-- Status -->
                    <td class="px-6 py-4">
                      <span class="px-2.5 py-1 rounded-full text-[10px] font-bold"
                        [class.bg-emerald-50]="loan.status === 'active'"
                        [class.text-emerald-700]="loan.status === 'active'"
                        [class.bg-amber-50]="loan.status === 'overdue'"
                        [class.text-amber-700]="loan.status === 'overdue'"
                        [class.bg-slate-100]="loan.status === 'paid'"
                        [class.text-slate-500]="loan.status === 'paid'">
                        {{ loan.status === 'active' ? 'Em dia' : loan.status === 'overdue' ? 'Vencendo' : 'Quitado' }}
                      </span>
                    </td>

                    <!-- Ações -->
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button (click)="openPaymentModal(loan)"
                          class="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
                          Pagar Parcela
                        </button>
                        <button (click)="openActionModal(loan)"
                          class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-center text-slate-400">
                          <mat-icon class="text-[18px]">more_vert</mat-icon>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

    </div>

    <!-- ─── NEW LOAN SIDEBAR ─────────────────────────────────────── -->
    @if (showAddModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-end">
        <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" (click)="showAddModal.set(false)"></div>

        <div class="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-extrabold text-slate-900">Novo Empréstimo</h2>
              <p class="text-xs font-medium text-slate-500 mt-0.5">Preencha os detalhes para registrar o contrato.</p>
            </div>
            <button (click)="showAddModal.set(false)"
              class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <mat-icon class="text-[20px]">close</mat-icon>
            </button>
          </div>

          <!-- Form Body -->
          <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">

            <!-- Nome do Credor -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nome do Credor</label>
              <input [(ngModel)]="form.creditor_name" type="text" placeholder="Instituição ou Nome do Credor"
                class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all">
            </div>

            <!-- Valor Total -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Valor Total do Empréstimo</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
                <input [(ngModel)]="form.initial_amount" type="number" step="0.01" min="0" placeholder="0,00"
                  class="w-full h-11 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all text-slate-900">
              </div>
            </div>

            <!-- Tipo -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tipo</label>
              <div class="relative">
                <select [(ngModel)]="form.type"
                  class="w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all">
                  <option value="interest">Com Juros</option>
                  <option value="fixed">Fixo</option>
                </select>
                <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</mat-icon>
              </div>
            </div>

            <!-- Conta Associada -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Conta Associada</label>
              <div class="relative">
                <select [(ngModel)]="form.account_id"
                  class="w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all">
                  <option value="">Selecione a conta (opcional)...</option>
                  @for (acc of accounts(); track acc.id) {
                    <option [value]="acc.id">{{ acc.institution_name }} ({{ acc.account_type }})</option>
                  }
                </select>
                <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">account_balance</mat-icon>
              </div>
            </div>

            <!-- Juros Mensais (only for interest) -->
            @if (form.type === 'interest') {
              <div class="space-y-1.5">
                <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Juros Mensais (%)</label>
                <div class="relative">
                  <input [(ngModel)]="form.monthly_rate" type="number" step="0.01" min="0" placeholder="0,00"
                    class="w-full h-11 pl-4 pr-10 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all">
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                </div>
              </div>
            }

            <!-- Data de Início + Parcelas (fixed) -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Data de Início</label>
                <input [(ngModel)]="form.start_date" type="date"
                  class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all">
              </div>
              @if (form.type === 'fixed') {
                <div class="space-y-1.5">
                  <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Parcelas</label>
                  <input [(ngModel)]="form.total_installments" type="number" min="1" placeholder="Ex: 12"
                    class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all">
                </div>
              }
            </div>

            <!-- Dia de Vencimento -->
            <div class="space-y-1.5">
              <label class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Dia de Vencimento</label>
              <input [(ngModel)]="form.due_day" type="number" min="1" max="31" placeholder="Ex: 10"
                class="w-full h-11 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all">
            </div>

            <!-- Info box -->
            <div class="p-4 bg-emerald-50 rounded-xl flex gap-3 border border-emerald-100/50">
              <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <mat-icon class="text-white text-[14px]">info</mat-icon>
              </div>
              <p class="text-xs font-medium text-emerald-800 leading-relaxed">
                @if (form.type === 'interest') {
                  Ao salvar um empréstimo com juros, o sistema calculará o saldo devedor mensalmente com base no dia de vencimento informado até a quitação total.
                } @else {
                  Ao salvar um empréstimo fixo, o sistema irá gerar as parcelas automaticamente com o valor total dividido igualmente pelo número de meses.
                }
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div class="p-6 border-t border-gray-100 bg-slate-50/50">
            <button (click)="saveLoan()" [disabled]="isSaving()"
              class="w-full h-[46px] bg-[#0F172A] text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              @if (isSaving()) {
                <mat-icon class="animate-spin text-[18px]">loop</mat-icon>
              } @else {
                <mat-icon class="text-[18px]">check_circle</mat-icon>
              }
              Salvar Empréstimo
            </button>
            <button (click)="showAddModal.set(false)"
              class="w-full h-10 mt-2 text-slate-500 font-semibold text-sm hover:text-slate-700 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── PAYMENT MODAL ─────────────────────────────────────────── -->
    @if (loanForPayment()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" (click)="loanForPayment.set(null)"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-[420px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

          <!-- Payment Header -->
          <div class="flex items-center gap-4 px-6 py-5 bg-[#0F172A]">
            <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <mat-icon class="text-white text-[20px]">payments</mat-icon>
            </div>
            <div class="flex-1">
              <h2 class="text-base font-extrabold text-white">Pagamento de Parcela</h2>
              <p class="text-xs text-slate-400">{{ loanForPayment()!.type === 'interest' ? 'Empréstimo com Juros Variáveis' : 'Empréstimo de Valor Fixo' }}</p>
            </div>
            <button (click)="loanForPayment.set(null)"
              class="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
              <mat-icon class="text-[18px]">close</mat-icon>
            </button>
          </div>

          <!-- Payment Body -->
          <div class="px-6 py-5 space-y-5 flex-1 overflow-y-auto">
            <!-- Conta de Origem -->
            <div>
              <label class="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">Conta de Origem</label>
              <select [(ngModel)]="paymentAccountId"
                class="w-full h-11 px-4 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium text-slate-800 outline-none">
                <option value="">Selecione a conta...</option>
                @for (acc of accounts(); track acc.id) {
                  <option [value]="acc.id">{{ acc.institution_name }} ({{ acc.account_type }})</option>
                }
              </select>
            </div>

            <!-- Details Box -->
            <div class="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div class="flex justify-between items-center px-4 py-3 border-b border-slate-200">
                <p class="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Detalhamento</p>
                <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold"
                  [class.bg-indigo-100]="loanForPayment()!.type === 'interest'"
                  [class.text-indigo-600]="loanForPayment()!.type === 'interest'"
                  [class.bg-slate-200]="loanForPayment()!.type === 'fixed'"
                  [class.text-slate-600]="loanForPayment()!.type === 'fixed'">
                  {{ loanForPayment()!.type === 'interest' ? 'COM JUROS' : 'FIXO SEM JUROS' }}
                </span>
              </div>
              @if (loanForPayment()!.type === 'fixed') {
                <div class="px-4 py-3 space-y-2.5">
                  <p class="text-sm font-bold text-slate-900">Parcela {{ (loanForPayment()!.paid_installments + 1) }}/{{ loanForPayment()!.total_installments }}</p>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500 font-medium">Valor da Parcela</span>
                    <span class="font-bold text-slate-900">R$ {{ loanForPayment()!.installment_amount! | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500 font-medium">Taxas e Encargos</span>
                    <span class="font-bold text-emerald-600">Isento</span>
                  </div>
                </div>
              } @else {
                <div class="px-4 py-3 space-y-2.5">
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500 font-medium">Valor do Pagamento Mínimo</span>
                    <span class="font-bold text-slate-900">R$ {{ interestAmount() | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500 font-medium">Juros Calculados</span>
                    <span class="font-bold text-red-600">R$ {{ interestAmount() | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500 font-medium">Abatimento do Saldo</span>
                    <span class="font-bold text-emerald-600">R$ {{ principalAmount() | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex justify-between text-sm mt-1 pt-2 border-t border-slate-200">
                    <span class="text-slate-500 font-medium">Saldo após pagamento</span>
                    <span class="font-bold text-slate-700">R$ {{ (loanForPayment()!.current_balance - principalAmount()) | number:'1.2-2' }}</span>
                  </div>
                </div>
              }
            </div>

            <!-- Payment Amount -->
            <div class="space-y-4">
              <div>
                <label class="block text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
                  Valor do Pagamento (R$)
                </label>
                <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 h-14">
                  <span class="text-slate-400 text-sm font-bold">R$</span>
                  <input [(ngModel)]="paymentAmount" type="number" step="0.01" min="0"
                    class="flex-1 text-xl font-black text-slate-900 bg-transparent outline-none"
                    (ngModelChange)="updatePrincipal()">
                </div>
                @if (loanForPayment()!.type === 'interest') {
                  <p class="text-xs text-slate-400 mt-1.5 font-medium">Você pode pagar qualquer valor acima do mínimo para amortizar mais rápido.</p>
                }
              </div>

              <!-- Opções de Ajuste (Somente para Fixo com diferença) -->
              @if (showAdjustmentChoice()) {
                <div class="p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div class="flex items-center gap-2 text-amber-700">
                    <mat-icon class="text-lg">error_outline</mat-icon>
                    <span class="text-xs font-bold uppercase tracking-wider">Ajuste de Cronograma</span>
                  </div>
                  <p class="text-[11px] font-medium text-amber-600 leading-relaxed">
                    O valor é diferente do previsto (R$ {{ loanForPayment()!.installment_amount! | number:'1.2-2' }}). como deseja tratar os 
                    <strong class="font-black">R$ {{ (paymentAmount - loanForPayment()!.installment_amount!) | number:'1.2-2' }}</strong> de diferença?
                  </p>
                  
                  <div class="flex flex-col gap-2">
                    <button (click)="adjustmentType.set('redistribute')"
                      [class.bg-amber-500]="adjustmentType() === 'redistribute'"
                      [class.text-white]="adjustmentType() === 'redistribute'"
                      [class.bg-white]="adjustmentType() !== 'redistribute'"
                      class="flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-bold border border-amber-200 transition-all shadow-sm">
                      DILUIR NAS PRÓXIMAS PARCELAS
                      @if (adjustmentType() === 'redistribute') { <mat-icon class="text-sm">check</mat-icon> }
                    </button>
                    <div class="grid grid-cols-2 gap-2">
                      <button (click)="adjustmentType.set('next')"
                        [class.bg-amber-500]="adjustmentType() === 'next'"
                        [class.text-white]="adjustmentType() === 'next'"
                        [class.bg-white]="adjustmentType() !== 'next'"
                        class="flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-bold border border-amber-200 transition-all shadow-sm">
                        NA PRÓXIMA
                      </button>
                      <button (click)="adjustmentType.set('last')"
                        [class.bg-amber-500]="adjustmentType() === 'last'"
                        [class.text-white]="adjustmentType() === 'last'"
                        [class.bg-white]="adjustmentType() !== 'last'"
                        class="flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-bold border border-amber-200 transition-all shadow-sm">
                        NA ÚLTIMA
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Payment Footer -->
          <div class="px-6 py-4 border-t border-slate-100 space-y-2">
            <button (click)="confirmPayment()" [disabled]="isSaving()"
              class="w-full h-12 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              <mat-icon class="text-[18px]">lock</mat-icon>
              Confirmar Pagamento
            </button>
            <button (click)="loanForPayment.set(null)"
              class="w-full h-10 text-slate-500 font-semibold text-sm hover:text-slate-700 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── ACTION MODAL ─── -->
    @if (showActionModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" (click)="closeActionModal()"></div>
        <div class="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          
          <div class="p-6 pb-4 border-b border-slate-50 relative flex items-center justify-between">
            <h2 class="text-lg font-black text-slate-800">Ações do Empréstimo</h2>
            <button (click)="closeActionModal()" class="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center">
              <mat-icon class="text-lg">close</mat-icon>
            </button>
          </div>

          <div class="px-3 py-4 space-y-1">
            <button (click)="openInstallmentsModal(actionModalLoan()!)" class="w-full text-left group flex items-start gap-4 hover:bg-indigo-50 p-3 rounded-2xl transition-colors">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors border border-indigo-100">
                <mat-icon class="text-[20px]">list_alt</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-800">Listar Parcelas</h3>
                <p class="text-[10px] font-black text-indigo-400/80 uppercase tracking-widest mt-0.5">Gerenciar cronograma e valores</p>
              </div>
            </button>

            <button (click)="deleteLoan(actionModalLoan()!)" class="w-full text-left group flex items-start gap-4 hover:bg-red-50 p-3 rounded-2xl transition-colors">
              <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors border border-red-100">
                <mat-icon class="text-[20px]">delete_outline</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-red-600">Excluir Empréstimo</h3>
                <p class="text-[10px] font-black text-red-400/70 uppercase tracking-widest mt-0.5">Esta ação não pode ser desfeita</p>
              </div>
            </button>
          </div>

          <div class="p-4 pt-0">
            <button (click)="closeActionModal()" class="w-full h-12 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">
              FECHAR
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── DELETE CONFIRM MODAL ─── -->
    @if (showDeleteConfirmModal()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" (click)="showDeleteConfirmModal.set(false)"></div>
        <div class="relative bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden p-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
          
          <div class="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-8">
            <mat-icon class="text-red-500 text-4xl leading-none h-auto w-auto">error_outline</mat-icon>
          </div>

          <h2 class="text-2xl font-black text-slate-800 tracking-tight mb-4">Confirmar Exclusão</h2>
          
          <p class="text-sm font-medium text-slate-500 leading-relaxed mb-10">
            Você tem certeza que deseja prosseguir? Esta ação é <span class="text-red-500 font-black">irreversível</span> e todos os dados selecionados serão perdidos permanentemente de nossos servidores.
          </p>

          <div class="grid grid-cols-2 gap-4 w-full">
            <button (click)="showDeleteConfirmModal.set(false)" 
              class="h-14 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button (click)="confirmDelete()" [disabled]="isSaving()"
              class="h-14 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-200 disabled:opacity-50">
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ─── INSTALLMENTS MODAL ─── -->
    @if (showInstallmentsModal()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" (click)="showInstallmentsModal.set(false)"></div>
        <div class="relative bg-white rounded-[32px] w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
          
          <!-- Modal Header -->
          <div class="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h2 class="text-2xl font-black text-slate-800 tracking-tight">Cronograma de Parcelas</h2>
              <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">{{ selectedLoanForInstallments()?.creditor_name }}</p>
            </div>
            <button (click)="showInstallmentsModal.set(false)" class="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="flex-1 overflow-y-auto p-8 pt-4">
            <div class="grid grid-cols-1 gap-4">
              @for (tx of installmentTransactions(); track tx.id) {
                <div class="group relative flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                  <div class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 font-black text-xs flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors">
                    {{ tx.installment_number || 'S/N' }}
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class="text-xs font-black text-slate-800 truncate">{{ tx.description }}</span>
                      @if (tx.status === 'confirmed') {
                        <span class="px-1.5 py-0.5 rounded-md bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase tracking-tighter">PAGO</span>
                      } @else {
                        <span class="px-1.5 py-0.5 rounded-md bg-amber-50 text-[9px] font-black text-amber-600 uppercase tracking-tighter">PENDENTE</span>
                      }
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="text-[11px] font-bold text-slate-400">{{ (tx.date || '').split('T')[0] | date:'dd MMM, yyyy' }}</span>
                    </div>
                  </div>

                  <div class="flex flex-col items-end gap-2">
                    @if (isEditingInstallmentId() === tx.id) {
                      <div class="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 h-10 shadow-sm animate-in fade-in zoom-in-95">
                        <span class="text-xs font-bold text-indigo-400">R$</span>
                        <input [(ngModel)]="editingAmount" type="number" step="0.01" class="w-20 text-sm font-black text-slate-800 bg-transparent outline-none">
                        <button (click)="saveInstallmentAmount(tx)" class="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors">
                          <mat-icon class="text-sm">check</mat-icon>
                        </button>
                        <button (click)="cancelEditInstallment()" class="w-6 h-6 rounded-md bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors">
                          <mat-icon class="text-sm">close</mat-icon>
                        </button>
                      </div>

                      <!-- Opções de Ajuste (Inline) -->
                      @if (showAdjustmentChoiceInList()) {
                        <div class="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-2 animate-in slide-in-from-right-2 duration-300">
                          <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Tratamento da Diferença (R$ {{ (editingAmount() - tx.amount) | number:'1.2-2' }})</p>
                          <div class="flex flex-wrap gap-1.5 justify-end">
                            <button (click)="adjustmentTypeForList.set('redistribute')"
                              [class.bg-amber-500]="adjustmentTypeForList() === 'redistribute'"
                              [class.text-white]="adjustmentTypeForList() === 'redistribute'"
                              [class.bg-white]="adjustmentTypeForList() !== 'redistribute'"
                              class="px-2 h-7 rounded-lg text-[9px] font-black border border-amber-200 transition-all">DILUIR</button>
                            
                            <button (click)="adjustmentTypeForList.set('next')"
                              [class.bg-amber-500]="adjustmentTypeForList() === 'next'"
                              [class.text-white]="adjustmentTypeForList() === 'next'"
                              [class.bg-white]="adjustmentTypeForList() !== 'next'"
                              class="px-2 h-7 rounded-lg text-[9px] font-black border border-amber-200 transition-all">PRÓXIMA</button>
                            
                            <button (click)="adjustmentTypeForList.set('last')"
                              [class.bg-amber-500]="adjustmentTypeForList() === 'last'"
                              [class.text-white]="adjustmentTypeForList() === 'last'"
                              [class.bg-white]="adjustmentTypeForList() !== 'last'"
                              class="px-2 h-7 rounded-lg text-[9px] font-black border border-amber-200 transition-all">ÚLTIMA</button>

                            @if (editingAmount() < tx.amount) {
                              <button (click)="adjustmentTypeForList.set('new_last')"
                                [class.bg-amber-500]="adjustmentTypeForList() === 'new_last'"
                                [class.text-white]="adjustmentTypeForList() === 'new_last'"
                                [class.bg-white]="adjustmentTypeForList() !== 'new_last'"
                                class="px-2 h-7 rounded-lg text-[9px] font-black border border-amber-200 transition-all">GERAR NOVA</button>
                            }
                          </div>
                        </div>
                      }
                    } @else {
                      <div class="text-right">
                        <div class="text-sm font-black text-slate-900">R$ {{ tx.amount | number:'1.2-2' }}</div>
                        <button (click)="startEditInstallment(tx)" class="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                          Editar Valor
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="p-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full bg-indigo-400"></div>
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de {{ installmentTransactions().length }} parcelas encontradas</p>
            </div>
            <button (click)="showInstallmentsModal.set(false)" class="px-6 h-10 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
              Concluído
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class LoansPageComponent implements OnInit {
  private supabase = inject(SupabaseService);

  isLoading = signal(true);
  isSaving = signal(false);
  loans = signal<SupabaseLoan[]>([]);
  accounts = signal<SupabaseAccount[]>([]);
  showAddModal = signal(false);
  loanForPayment = signal<SupabaseLoan | null>(null);
  
  showActionModal = signal(false);
  actionModalLoan = signal<SupabaseLoan | null>(null);
  
  // Delete confirm state
  showDeleteConfirmModal = signal(false);
  loanToDelete = signal<SupabaseLoan | null>(null);
  
  // Installments list state
  showInstallmentsModal = signal(false);
  selectedLoanForInstallments = signal<SupabaseLoan | null>(null);
  installmentTransactions = signal<SupabaseTransaction[]>([]);
  isEditingInstallmentId = signal<string | null>(null);
  editingAmount = signal<number>(0);

  // Payment state
  paymentAccountId = '';
  paymentAmount = 0;
  adjustmentType = signal<'redistribute' | 'next' | 'last'>('redistribute');
  adjustmentTypeForList = signal<'redistribute' | 'next' | 'last' | 'new_last'>('redistribute');

  _principalAmountValue = 0;

  interestAmount = computed(() => {
    const loan = this.loanForPayment();
    if (!loan || loan.type !== 'interest') return 0;
    return parseFloat(((loan.current_balance * (loan.monthly_rate! / 100))).toFixed(2));
  });

  principalAmount = computed(() => {
    const minPay = this.interestAmount();
    const paid = this.paymentAmount || 0;
    return Math.max(0, parseFloat((paid - minPay).toFixed(2)));
  });

  showAdjustmentChoiceInList = computed(() => {
    const editId = this.isEditingInstallmentId();
    if (!editId) return false;
    
    const tx = this.installmentTransactions().find(t => t.id === editId);
    if (!tx) return false;

    const diff = Math.abs(this.editingAmount() - tx.amount);
    return diff > 0.01;
  });

  // Form for new loan
  form: NewLoanForm = this.emptyForm();

  // Summary computed signals
  activeLoans = computed(() => this.loans().filter(l => l.status !== 'paid'));
  totalDebt = computed(() => this.activeLoans().reduce((s, l) => s + l.current_balance, 0));
  totalPaid = computed(() => this.loans().reduce((s, l) => s + l.total_paid, 0));
  paymentProgressWidth = computed(() => {
    const totalInitial = this.loans().reduce((s, l) => s + l.initial_amount, 0);
    if (totalInitial <= 0) return 0;
    return Math.min(100, (this.totalPaid() / totalInitial) * 100);
  });

  nextDueLabel = computed(() => {
    const active = this.activeLoans();
    if (!active.length) return '—';
    const today = new Date();
    const days = active.map(l => {
      const d = new Date(today.getFullYear(), today.getMonth(), l.due_day);
      if (d < today) d.setMonth(d.getMonth() + 1);
      return d;
    });
    days.sort((a, b) => a.getTime() - b.getTime());
    const next = days[0];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${next.getDate()} de ${months[next.getMonth()]}`;
  });

  nextMinimumPayment = computed(() => {
    const active = this.activeLoans();
    if (!active.length) return 0;
    return active.reduce((s, l) => s + this.getMinPayment(l), 0);
  });

  async ngOnInit() {
    await Promise.all([this.loadLoans(), this.loadAccounts()]);
  }

  private async loadLoans() {
    this.isLoading.set(true);
    try {
      const { data } = await this.supabase.getLoans();
      if (data) this.loans.set(data as SupabaseLoan[]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadAccounts() {
    const { data } = await this.supabase.getAccounts();
    if (data) this.accounts.set(data as SupabaseAccount[]);
  }

  openAddModal() {
    this.form = this.emptyForm();
    this.showAddModal.set(true);
  }

  openPaymentModal(loan: SupabaseLoan) {
    this.loanForPayment.set(loan);
    this.paymentAccountId = '';
    this.paymentAmount = loan.type === 'interest'
      ? parseFloat(((loan.current_balance * (loan.monthly_rate! / 100))).toFixed(2))
      : (loan.installment_amount ?? 0);
    this.adjustmentType.set('redistribute');
  }

  showAdjustmentChoice = computed(() => {
    const loan = this.loanForPayment();
    if (!loan || loan.type !== 'fixed') return false;
    
    // Se for a última parcela, não precisa de escolha, apenas quita o que sobrar
    if (loan.paid_installments + 1 >= (loan.total_installments || 0)) return false;

    const expected = loan.installment_amount || 0;
    return Math.abs(this.paymentAmount - expected) > 0.01;
  });

  updatePrincipal() {
    // Computed signal recalculates automatically
  }

  openActionModal(loan: SupabaseLoan) {
    this.actionModalLoan.set(loan);
    this.showActionModal.set(true);
  }

  closeActionModal() {
    this.showActionModal.set(false);
    this.actionModalLoan.set(null);
  }

  async saveLoan() {
    const f = this.form;
    if (!f.creditor_name.trim() || !f.initial_amount || !f.due_day || !f.start_date || !f.account_id) return;
    if (f.type === 'interest' && !f.monthly_rate) return;
    if (f.type === 'fixed' && !f.total_installments) return;

    this.isSaving.set(true);
    try {
      // Build base payload without optional fields to avoid sending undefined to Supabase
      const basePayload = {
        creditor_name: f.creditor_name.trim(),
        type: f.type,
        initial_amount: f.initial_amount!,
        current_balance: f.initial_amount!,
        paid_installments: 0,
        due_day: f.due_day!,
        start_date: f.start_date,
        status: 'active' as const,
        total_paid: 0,
        account_id: f.account_id || undefined,
      };

      // Add type-specific fields only when relevant
      const payload: Partial<SupabaseLoan> = f.type === 'interest'
        ? { ...basePayload, monthly_rate: f.monthly_rate! }
        : {
            ...basePayload,
            total_installments: f.total_installments!,
            installment_amount: parseFloat((f.initial_amount! / f.total_installments!).toFixed(2)),
          };

      const { data, error } = await this.supabase.createLoan(payload);
      if (!error && data) {
        this.loans.update(list => [data as SupabaseLoan, ...list]);
        this.showAddModal.set(false);
      } else if (error) {
        console.error('Error creating loan:', error.message);
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  async confirmPayment() {
    const loan = this.loanForPayment();
    if (!loan) return;

    const accountId = this.paymentAccountId || loan.account_id;
    const amount = this.paymentAmount;
    
    if (amount <= 0 || !accountId) return;

    this.isSaving.set(true);
    try {
      const expectedAmount = loan.type === 'fixed' ? (loan.installment_amount ?? 0) : amount;
      const difference = parseFloat((expectedAmount - amount).toFixed(2));
      const hasDifference = Math.abs(difference) > 0.01 && loan.type === 'fixed';

      const interest = loan.type === 'interest' ? this.interestAmount() : 0;
      const principal = amount - interest;
      const balanceAfter = Math.max(0, loan.current_balance - principal);
      
      const installmentNum = loan.paid_installments + 1;
      const remainingInstallments = (loan.total_installments || 0) - installmentNum;
      
      const newPaidInstallments = loan.type === 'fixed' ? installmentNum : loan.paid_installments;
      const newStatus: SupabaseLoan['status'] = balanceAfter <= 0 ? 'paid' :
        (loan.type === 'fixed' && newPaidInstallments >= (loan.total_installments ?? 0)) ? 'paid' : 'active';

      // 1. Processar Ajustes no Cronograma se houver diferença (apenas FIXO)
      let finalInstallmentAmount = loan.installment_amount;
      const adjType = this.adjustmentType();

      if (hasDifference && remainingInstallments > 0) {
        if (adjType === 'redistribute') {
          // Nova parcela = saldo restante / parcelas restantes
          finalInstallmentAmount = parseFloat((balanceAfter / remainingInstallments).toFixed(2));
          await this.supabase.updateFutureFixedInstallments(loan.id, installmentNum + 1, finalInstallmentAmount);
        } else if (adjType === 'next') {
          await this.supabase.adjustSpecificInstallment(loan.id, installmentNum + 1, difference);
        } else if (adjType === 'last') {
          await this.supabase.adjustSpecificInstallment(loan.id, loan.total_installments!, difference);
        }
      }

      // 2. Vincular ou criar Transação no Extrato
      const { data: existingTx } = await this.supabase.getLoanTransaction(loan.id, installmentNum);

      if (existingTx && existingTx.status === 'pending') {
        await this.supabase.updateTransaction(existingTx.id, {
          status: 'confirmed',
          account_id: accountId,
          amount: amount,
          date: new Date().toLocaleDateString('en-CA')
        });
      } else {
        await this.supabase.createTransaction({
          account_id: accountId,
          description: `Pagamento ${loan.type === 'fixed' ? 'Parcela ' + installmentNum : 'Empréstimo'} - ${loan.creditor_name}`,
          amount: amount,
          date: new Date().toLocaleDateString('en-CA'),
          category: 'Empréstimo',
          type: 'expense',
          status: 'confirmed',
          loan_id: loan.id,
          installment_number: installmentNum
        });
      }

      // 3. Atualizar Saldo da Conta
      const account = this.accounts().find(a => a.id === accountId);
      if (account) {
        const newAccountBalance = parseFloat((account.initial_balance - amount).toFixed(2));
        await this.supabase.updateAccount(accountId, { initial_balance: newAccountBalance });
      }

      // 4. Criar registro histórico de pagamento com rastreabilidade
      await this.supabase.createLoanPayment({
        loan_id: loan.id,
        account_id: accountId,
        payment_date: new Date().toLocaleDateString('en-CA'),
        amount_paid: amount,
        interest_portion: interest,
        principal_portion: principal,
        installment_number: installmentNum,
        balance_before: loan.current_balance,
        balance_after: balanceAfter,
        adjustment_type: hasDifference ? adjType : 'none',
        adjustment_value: hasDifference ? difference : 0
      });

      // 5. Atualizar o contrato do empréstimo
      const { data: updatedLoan } = await this.supabase.updateLoan(loan.id, {
        current_balance: balanceAfter,
        total_paid: loan.total_paid + amount,
        paid_installments: newPaidInstallments,
        installment_amount: finalInstallmentAmount,
        status: newStatus,
      });

      if (updatedLoan) {
        this.loans.update(list =>
          list.map(l => l.id === loan.id ? updatedLoan as SupabaseLoan : l)
        );
      }
      
      await this.loadAccounts();
      this.loanForPayment.set(null);
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteLoan(loan: SupabaseLoan) {
    this.loanToDelete.set(loan);
    this.showDeleteConfirmModal.set(true);
    this.closeActionModal();
  }

  async confirmDelete() {
    const loan = this.loanToDelete();
    if (!loan) return;
    
    this.isSaving.set(true);
    try {
      await this.supabase.deleteLoan(loan.id);
      this.loans.update(list => list.filter(l => l.id !== loan.id));
      this.showDeleteConfirmModal.set(false);
      this.loanToDelete.set(null);
    } finally {
      this.isSaving.set(false);
    }
  }

  async openInstallmentsModal(loan: SupabaseLoan) {
    this.selectedLoanForInstallments.set(loan);
    this.showInstallmentsModal.set(true);
    this.closeActionModal();
    await this.fetchInstallmentTransactions(loan.id);
  }

  async fetchInstallmentTransactions(loanId: string) {
    const { data } = await this.supabase.client
      .from('transactions')
      .select('*')
      .eq('loan_id', loanId)
      .order('installment_number', { ascending: true })
      .order('date', { ascending: true });
    
    if (data) {
      this.installmentTransactions.set(data as SupabaseTransaction[]);
    }
  }

  startEditInstallment(tx: SupabaseTransaction) {
    this.isEditingInstallmentId.set(tx.id);
    this.editingAmount.set(tx.amount);
  }

  async saveInstallmentAmount(tx: SupabaseTransaction) {
    if (this.isSaving()) return;
    
    const originalAmount = tx.amount;
    const newAmount = this.editingAmount();
    const difference = parseFloat((originalAmount - newAmount).toFixed(2));
    const hasDifference = Math.abs(difference) > 0.01;
    const adjType = this.adjustmentTypeForList();

    this.isSaving.set(true);
    try {
      // 1. Aplicar Ajustes se houver diferença
      if (hasDifference) {
        const loanId = tx.loan_id!;
        const currentNum = tx.installment_number!;
        const loan = this.selectedLoanForInstallments();
        const totalNum = loan?.total_installments || 0;
        const remaining = totalNum - currentNum;

        if (adjType === 'redistribute' && remaining > 0) {
          const extraPerParcel = parseFloat((difference / remaining).toFixed(2));
          // Pegamos o valor atual de uma parcela futura para somar
          const { data: futureTxs } = await this.supabase.client.from('transactions')
            .select('amount')
            .eq('loan_id', loanId)
            .eq('status', 'pending')
            .gt('installment_number', currentNum);
          
          if (futureTxs && futureTxs.length > 0) {
            const baseFutureAmount = Number(futureTxs[0].amount);
            await this.supabase.updateFutureFixedInstallments(loanId, currentNum + 1, baseFutureAmount + extraPerParcel);
          }
        } 
        else if (adjType === 'next' && remaining > 0) {
          await this.supabase.adjustSpecificInstallment(loanId, currentNum + 1, difference);
        }
        else if (adjType === 'last' && remaining > 0) {
          await this.supabase.adjustSpecificInstallment(loanId, totalNum, difference);
        }
        else if (adjType === 'new_last' && difference > 0) {
          await this.supabase.addExtraInstallment(loanId, difference);
        }
      }

      // 2. Salvar a transação atual
      const { data: updatedTx, error } = await this.supabase.updateTransaction(tx.id, {
        amount: newAmount
      });

      if (updatedTx && !error) {
        this.isEditingInstallmentId.set(null);
        
        // 3. Recarregar lista e sincronizar contrato
        await this.fetchInstallmentTransactions(tx.loan_id!);
        const { data: updatedLoan } = await this.supabase.syncLoanData(tx.loan_id!);
        
        if (updatedLoan) {
          this.loans.update(list =>
            list.map(l => l.id === tx.loan_id ? updatedLoan as SupabaseLoan : l)
          );
          this.selectedLoanForInstallments.set(updatedLoan as SupabaseLoan);
        }
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  cancelEditInstallment() {
    this.isEditingInstallmentId.set(null);
  }

  getMinPayment(loan: SupabaseLoan): number {
    if (loan.type === 'fixed') return loan.installment_amount ?? 0;
    return parseFloat(((loan.current_balance * (loan.monthly_rate! / 100))).toFixed(2));
  }

  formatNextDue(dueDay: number): string {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (d < today) d.setMonth(d.getMonth() + 1);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${String(d.getDate()).padStart(2, '0')}/${months[d.getMonth()]}/${d.getFullYear()}`;
  }

  getBrandColor(name: string): string {
    const lc = name.toLowerCase();
    if (lc.includes('itau') || lc.includes('itaú')) return '#EC7000';
    if (lc.includes('nubank')) return '#8A05BE';
    if (lc.includes('inter')) return '#FF7A00';
    if (lc.includes('bradesco')) return '#CC092F';
    if (lc.includes('santander')) return '#EC0000';
    if (lc.includes('caixa')) return '#005699';
    if (lc.includes('bb') || lc.includes('brasil')) return '#FFCC00';
    const palette = ['#0F172A', '#1e40af', '#15803d', '#b45309', '#7c3aed', '#be185d'];
    return palette[name.charCodeAt(0) % palette.length];
  }

  private emptyForm(): NewLoanForm {
    return {
      creditor_name: '',
      type: 'interest',
      initial_amount: null,
      monthly_rate: null,
      total_installments: null,
      due_day: null,
      start_date: new Date().toLocaleDateString('en-CA'),
      account_id: '',
    };
  }
}
