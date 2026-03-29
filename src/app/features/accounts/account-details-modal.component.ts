import { Component, input, output, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { SupabaseService, SupabaseTransaction } from '../../core/services/supabase.service';

export interface Account {
  id: string | number;
  name: string;
  type: string;
  balance: string;
  balanceLabel: string;
  details: string;
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
  badgeClass: string;
  color?: string;
}

@Component({
  selector: 'app-account-details-modal',
  standalone: true,
  imports: [MatIconModule, CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <!-- Backdrop -->
      <div 
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        (click)="closeModal.emit()"
        (keydown.escape)="closeModal.emit()"
        tabindex="0"
        role="button"
        aria-label="Fechar modal"></div>

      <!-- Modal Panel -->
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <!-- Bank Icon with colored initial -->
            <div 
              class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md text-white text-lg font-black"
              [style.backgroundColor]="account().color || getBrandColor(account().name)">
              {{ account().name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 class="text-lg font-extrabold text-slate-900">{{ account().name }}</h3>
              <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Detalhes da Conta</p>
            </div>
          </div>
          <button (click)="closeModal.emit()" class="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <mat-icon class="text-[18px]">close</mat-icon>
          </button>
        </div>

        <!-- Balance & Type -->
        <div class="px-6 py-5 grid grid-cols-2 gap-4 bg-slate-50/50">
          <div>
            <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{{ account().balanceLabel }}</p>
            <p class="text-2xl font-black text-slate-900">{{ account().balance }}</p>
          </div>
          <div>
            <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Tipo de Conta</p>
            <p class="text-base font-bold text-slate-900 capitalize">{{ account().details || account().type }}</p>
          </div>
        </div>

        <!-- Quick Statement Section -->
        <div class="px-6 pb-6">
          <div class="flex items-center justify-between mb-4 border-t border-gray-100 pt-5">
            <div class="flex items-center gap-2">
              <mat-icon class="text-emerald-500 text-[18px]">history</mat-icon>
              <h4 class="text-sm font-extrabold text-slate-900">Extrato Rápido</h4>
            </div>
            <button (click)="viewStatement.emit()" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
              Ver tudo
              <mat-icon class="text-[14px]">arrow_forward</mat-icon>
            </button>
          </div>
          
          <!-- Transactions list -->
          <div class="space-y-1 min-h-[120px]">
            @if (isLoadingTx()) {
              <div class="flex items-center justify-center h-20 text-slate-400">
                <mat-icon class="animate-spin mr-2">refresh</mat-icon>
                <span class="text-xs">Carregando...</span>
              </div>
            } @else if (recentTransactions().length === 0) {
              <div class="flex flex-col items-center justify-center h-20 gap-1 text-slate-400">
                <mat-icon class="text-[28px]">receipt_long</mat-icon>
                <p class="text-xs font-medium">Nenhuma transação encontrada</p>
              </div>
            } @else {
              @for (tx of recentTransactions(); track tx.id) {
                <div class="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500" [ngClass]="getTxIcon(tx).bg">
                      <mat-icon class="text-[16px]" [ngClass]="getTxIcon(tx).color">{{ getTxIcon(tx).icon }}</mat-icon>
                    </div>
                    <div>
                      <p class="text-xs font-bold text-slate-900">{{ tx.description }}</p>
                      <p class="text-[10px] font-medium text-slate-400">{{ formatDate(tx.date) }}</p>
                    </div>
                  </div>
                  <span class="text-xs font-bold" [class.text-red-600]="tx.type === 'expense'" [class.text-emerald-600]="tx.type !== 'expense'">
                    {{ tx.type === 'expense' ? '- ' : '+ ' }}R$ {{ tx.amount | number:'1.2-2' }}
                  </span>
                </div>
              }
            }
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 border-t border-gray-100 flex gap-3 bg-white">
          <button (click)="editAccount.emit()" class="flex-1 h-11 bg-[#0F172A] text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center">
            Editar Conta
          </button>
          <button (click)="deleteAccount.emit()" class="px-5 h-11 border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
            <mat-icon class="text-[18px]">delete_outline</mat-icon>
            Excluir
          </button>
        </div>

      </div>
    </div>
  `
})
export class AccountDetailsModalComponent implements OnInit {
  private supabase = inject(SupabaseService);

  account = input.required<Account>();
  closeModal = output<void>();
  editAccount = output<void>();
  deleteAccount = output<void>();
  viewStatement = output<void>();

  isLoadingTx = signal(true);
  recentTransactions = signal<SupabaseTransaction[]>([]);

  async ngOnInit() {
    await this.loadRecentTransactions();
  }

  private async loadRecentTransactions() {
    this.isLoadingTx.set(true);
    try {
      const accountId = String(this.account().id);
      const { data, error } = await this.supabase.getTransactions(accountId);
      if (data && !error) {
        this.recentTransactions.set((data as SupabaseTransaction[]).slice(0, 3));
      }
    } finally {
      this.isLoadingTx.set(false);
    }
  }

  getTxIcon(tx: SupabaseTransaction): { icon: string; bg: string; color: string } {
    const categoryMap: Record<string, { icon: string; bg: string; color: string }> = {
      food: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
      transport: { icon: 'directions_car', bg: 'bg-blue-50', color: 'text-blue-500' },
      income: { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      salary: { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      shopping: { icon: 'shopping_bag', bg: 'bg-purple-50', color: 'text-purple-500' },
      utilities: { icon: 'bolt', bg: 'bg-yellow-50', color: 'text-yellow-500' },
      transfer: { icon: 'sync_alt', bg: 'bg-blue-50', color: 'text-blue-500' },
    };
    const cat = (tx.category || tx.type || '').toLowerCase();
    return categoryMap[cat] || { icon: 'receipt', bg: 'bg-slate-100', color: 'text-slate-500' };
  }

  getBrandColor(name: string): string {
    const colors: Record<string, string> = {
      nubank: '#8A05BE',
      itau: '#EC7000',
      itaú: '#EC7000',
      inter: '#FF7A00',
      bradesco: '#CC092F',
      santander: '#EC0000',
      xp: '#1a1a2e',
      caixa: '#005699',
      bb: '#FFCC00',
      'banco do brasil': '#FFCC00',
    };
    const lower = name.toLowerCase();
    for (const key of Object.keys(colors)) {
      if (lower.includes(key)) return colors[key];
    }
    return '#475569';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
}
