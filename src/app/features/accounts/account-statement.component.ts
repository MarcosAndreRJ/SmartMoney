import { Component, input, output, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Account } from './account-details-modal.component';
import { SupabaseService, SupabaseTransaction } from '../../core/services/supabase.service';

interface TransactionGroup {
  label: string;
  date: Date;
  transactions: SupabaseTransaction[];
  total: number;
}

@Component({
  selector: 'app-account-statement',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      
      <!-- Page Header: Bank Info & Actions -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex items-center gap-4">
          <!-- Back button -->
          <button (click)="back.emit()" class="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors">
            <mat-icon>arrow_back</mat-icon>
          </button>

          <!-- Bank Icon (initial-based, colored) -->
          <div 
            class="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg text-xl font-black shrink-0"
            [style.backgroundColor]="getBrandColor(account().name)">
            {{ account().name.charAt(0).toUpperCase() }}
          </div>

          <!-- Bank Info -->
          <div>
            <div class="flex items-center gap-1.5">
              <h1 class="text-xl font-extrabold text-slate-900 tracking-tight">{{ account().name }}</h1>
              <mat-icon class="text-slate-400 text-[18px]">expand_more</mat-icon>
            </div>
            <p class="text-sm font-medium text-slate-500 mt-0.5">Saldo Atual: <span class="text-emerald-600 font-bold">{{ account().balance }}</span></p>
          </div>
        </div>

        <!-- Header Actions -->
        <div class="flex items-center gap-3">
          <button (click)="exportCsv()" class="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <mat-icon class="text-[18px]">download</mat-icon>
            Exportar
          </button>
          <button class="px-5 py-2.5 bg-[#0F172A] text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-md">
            <mat-icon class="text-[18px]">add</mat-icon>
            Nova Transação
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Inflow -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-4">
             <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Total Receitas</h3>
             <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
               <mat-icon class="text-[18px]">trending_up</mat-icon>
             </div>
          </div>
          <p class="text-2xl font-black text-emerald-600">R$ {{ totalIncome() | number:'1.2-2' }}</p>
          <p class="text-[10px] font-bold text-slate-400 mt-2">{{ filteredTransactions().length }} transações no período</p>
        </div>
        
        <!-- Outflow -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-4">
             <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Total Despesas</h3>
             <div class="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
               <mat-icon class="text-[18px]">trending_down</mat-icon>
             </div>
          </div>
          <p class="text-2xl font-black text-red-600">R$ {{ totalExpenses() | number:'1.2-2' }}</p>
          <p class="text-[10px] font-bold text-slate-400 mt-2">Despesas totais</p>
        </div>

        <!-- Net Savings -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="flex justify-between items-start mb-4">
             <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Saldo Líquido</h3>
             <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
               <mat-icon class="text-[18px]">savings</mat-icon>
             </div>
          </div>
          <p class="text-2xl font-black" [class.text-slate-900]="netBalance() >= 0" [class.text-red-600]="netBalance() < 0">R$ {{ netBalance() | number:'1.2-2' }}</p>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
             <div class="bg-slate-900 h-full rounded-full transition-all" [style.width]="netBarWidth() + '%'"></div>
          </div>
        </div>
      </div>

      <!-- Filters Bar (Aligned with Lançamentos) -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-4">
        
        <!-- Top Row: Search & Status -->
        <div class="flex flex-col md:flex-row gap-3 items-center w-full">
          <!-- Search -->
          <div class="relative flex-1 w-full md:max-w-md">
            <mat-icon class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</mat-icon>
            <input 
              type="text" 
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Buscar por descrição ou categoria..."
              class="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all">
          </div>

          <!-- Status Filters (Pills) -->
          <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl overflow-x-auto w-full md:w-auto">
            <button (click)="setStatus('all')" class="h-8 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
              [class.bg-white]="statusFilter() === 'all'" [class.shadow-sm]="statusFilter() === 'all'" [class.text-slate-800]="statusFilter() === 'all'" [class.border]="statusFilter() === 'all'" [class.border-slate-200]="statusFilter() === 'all'"
              [class.text-slate-500]="statusFilter() !== 'all'" [class.hover:text-slate-700]="statusFilter() !== 'all'">Todos</button>
            <button (click)="setStatus('confirmed')" class="h-8 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
              [class.bg-white]="statusFilter() === 'confirmed'" [class.shadow-sm]="statusFilter() === 'confirmed'" [class.text-slate-800]="statusFilter() === 'confirmed'" [class.border]="statusFilter() === 'confirmed'" [class.border-slate-200]="statusFilter() === 'confirmed'"
              [class.text-slate-500]="statusFilter() !== 'confirmed'" [class.hover:text-slate-700]="statusFilter() !== 'confirmed'">Confirmado</button>
            <button (click)="setStatus('pending')" class="h-8 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
              [class.bg-white]="statusFilter() === 'pending'" [class.shadow-sm]="statusFilter() === 'pending'" [class.text-slate-800]="statusFilter() === 'pending'" [class.border]="statusFilter() === 'pending'" [class.border-slate-200]="statusFilter() === 'pending'"
              [class.text-slate-500]="statusFilter() !== 'pending'" [class.hover:text-slate-700]="statusFilter() !== 'pending'">Pendente</button>
            <button (click)="setStatus('cancelled')" class="h-8 px-4 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
              [class.bg-white]="statusFilter() === 'cancelled'" [class.shadow-sm]="statusFilter() === 'cancelled'" [class.text-slate-800]="statusFilter() === 'cancelled'" [class.border]="statusFilter() === 'cancelled'" [class.border-slate-200]="statusFilter() === 'cancelled'"
              [class.text-slate-500]="statusFilter() !== 'cancelled'" [class.hover:text-slate-700]="statusFilter() !== 'cancelled'">Cancelado</button>
          </div>

          <div class="flex-1 hidden md:block"></div>
        </div>

        <!-- Bottom Row: Period, Type, Count -->
        <div class="flex flex-col md:flex-row items-center justify-between pt-3 border-t border-slate-100 gap-4">
          <div class="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <!-- Period Filters -->
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Período:</span>
              <button (click)="setRange(0)" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="dateRange() === 0" [class.bg-slate-100]="dateRange() === 0" [class.px-3]="dateRange() === 0" [class.py-1.5]="dateRange() === 0" [class.rounded-lg]="dateRange() === 0"
                [class.text-slate-500]="dateRange() !== 0" [class.hover:text-slate-800]="dateRange() !== 0">Todos</button>
              <button (click)="setRange(30)" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="dateRange() === 30" [class.bg-slate-100]="dateRange() === 30" [class.px-3]="dateRange() === 30" [class.py-1.5]="dateRange() === 30" [class.rounded-lg]="dateRange() === 30"
                [class.text-slate-500]="dateRange() !== 30" [class.hover:text-slate-800]="dateRange() !== 30">30 dias</button>
              <button (click)="setRange(7)" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="dateRange() === 7" [class.bg-slate-100]="dateRange() === 7" [class.px-3]="dateRange() === 7" [class.py-1.5]="dateRange() === 7" [class.rounded-lg]="dateRange() === 7"
                [class.text-slate-500]="dateRange() !== 7" [class.hover:text-slate-800]="dateRange() !== 7">7 dias</button>
            </div>

            <div class="hidden md:block w-px h-4 bg-slate-200"></div>

            <!-- Type Filters -->
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Tipo:</span>
              <button (click)="setType('all')" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="typeFilter() === 'all'" [class.bg-slate-100]="typeFilter() === 'all'" [class.px-3]="typeFilter() === 'all'" [class.py-1.5]="typeFilter() === 'all'" [class.rounded-lg]="typeFilter() === 'all'"
                [class.text-slate-500]="typeFilter() !== 'all'" [class.hover:text-slate-800]="typeFilter() !== 'all'">Todos</button>
              <button (click)="setType('income')" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="typeFilter() === 'income'" [class.bg-slate-100]="typeFilter() === 'income'" [class.px-3]="typeFilter() === 'income'" [class.py-1.5]="typeFilter() === 'income'" [class.rounded-lg]="typeFilter() === 'income'"
                [class.text-slate-500]="typeFilter() !== 'income'" [class.hover:text-slate-800]="typeFilter() !== 'income'">Receitas</button>
              <button (click)="setType('expense')" class="text-xs font-bold transition-colors"
                [class.text-slate-800]="typeFilter() === 'expense'" [class.bg-slate-100]="typeFilter() === 'expense'" [class.px-3]="typeFilter() === 'expense'" [class.py-1.5]="typeFilter() === 'expense'" [class.rounded-lg]="typeFilter() === 'expense'"
                [class.text-slate-500]="typeFilter() !== 'expense'" [class.hover:text-slate-800]="typeFilter() !== 'expense'">Despesas</button>
            </div>
          </div>

          <!-- Results count -->
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ filteredTransactions().length }} resultado{{ filteredTransactions().length !== 1 ? 's' : '' }} encontrado{{ filteredTransactions().length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Transactions List -->
      @if (isLoading()) {
        <div class="flex items-center justify-center h-40 text-slate-400">
          <mat-icon class="animate-spin mr-2 text-3xl">refresh</mat-icon>
          <span class="font-medium">Carregando transações...</span>
        </div>
      } @else if (groupedTransactions().length === 0) {
        <div class="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <mat-icon class="text-[48px]">receipt_long</mat-icon>
          <p class="font-bold">Nenhuma transação encontrada</p>
          <p class="text-sm">Tente ajustar os filtros ou o período</p>
        </div>
      } @else {
        <div class="space-y-8">
          @for (group of groupedTransactions(); track group.label) {
            <div>
              <div class="flex justify-between items-end border-b border-gray-200 pb-2 mb-4">
                <h4 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{{ group.label }}</h4>
                <span class="text-[11px] font-bold" [class.text-emerald-600]="group.total > 0" [class.text-red-600]="group.total < 0" [class.text-slate-400]="group.total === 0">
                  Total: {{ group.total > 0 ? '+ ' : '' }}R$ {{ (group.total < 0 ? -group.total : group.total) | number:'1.2-2' }}
                </span>
              </div>
              
              <div class="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-gray-50">
                @for (tx of group.transactions; track tx.id) {
                  <div class="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div class="flex items-center gap-4">
                      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" [ngClass]="getTxIcon(tx).bg">
                        <mat-icon [ngClass]="getTxIcon(tx).color">{{ getTxIcon(tx).icon }}</mat-icon>
                      </div>
                      <div>
                        <h5 class="text-sm font-bold text-slate-900 leading-tight">{{ tx.description }}</h5>
                        <p class="text-xs text-slate-500 font-medium mt-0.5">{{ tx.category || tx.type }}</p>
                      </div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1">
                      <span class="text-sm font-bold" [class.text-red-600]="tx.type === 'expense'" [class.text-emerald-600]="tx.type !== 'expense'">
                        {{ tx.type === 'expense' ? '- ' : '+ ' }}R$ {{ tx.amount | number:'1.2-2' }}
                      </span>
                      <span class="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-slate-100 text-slate-500">
                        Confirmado
                      </span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

    </div>
  `
})
export class AccountStatementComponent implements OnInit {
  private supabase = inject(SupabaseService);

  account = input.required<Account>();
  back = output<void>();

  isLoading = signal(true);
  allTransactions = signal<SupabaseTransaction[]>([]);
  searchQuery = signal('');
  dateRange = signal<number>(30); // 0 = all, 7 = last 7 days, 30 = last 30 days
  statusFilter = signal<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  typeFilter = signal<'all' | 'income' | 'expense' | 'transfer'>('all');

  filteredTransactions = computed(() => {
    const all = this.allTransactions();
    const query = this.searchQuery().toLowerCase().trim();
    const range = this.dateRange();
    const status = this.statusFilter();
    const type = this.typeFilter();

    const cutoff = range > 0 
      ? new Date(Date.now() - range * 24 * 60 * 60 * 1000) 
      : null;

    return all.filter(tx => {
      const matchesQuery = !query || tx.description.toLowerCase().includes(query) || (tx.category || '').toLowerCase().includes(query);
      
      const txDateStr = (tx.date || '').split('T')[0];
      const txDate = new Date(txDateStr + 'T12:00:00');
      const matchesDate = !cutoff || txDate >= cutoff;
      
      const matchesStatus = status === 'all' || tx.status === status;
      const matchesType = type === 'all' || tx.type === type;
      
      return matchesQuery && matchesDate && matchesStatus && matchesType;
    });
  });

  groupedTransactions = computed<TransactionGroup[]>(() => {
    const txs = this.filteredTransactions();
    const groups = new Map<string, SupabaseTransaction[]>();

    for (const tx of txs) {
      const key = (tx.date || '').split('T')[0];
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }

    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, transactions]) => {
        const date = new Date(key + 'T12:00:00');
        const total = transactions.reduce((sum, t) => 
          t.type === 'expense' ? sum - t.amount : sum + t.amount, 0);
        return { label: this.formatDateLabel(date), date, transactions, total };
      });
  });

  totalIncome = computed(() =>
    this.filteredTransactions().filter(t => t.type === 'income' || t.type === 'transfer').reduce((s, t) => s + t.amount, 0)
  );

  totalExpenses = computed(() =>
    this.filteredTransactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );

  netBalance = computed(() => this.totalIncome() - this.totalExpenses());

  netBarWidth = computed(() => {
    const inc = this.totalIncome();
    if (inc <= 0) return 0;
    return Math.min(100, Math.round((this.netBalance() / inc) * 100));
  });

  async ngOnInit() {
    await this.loadTransactions();
  }

  private async loadTransactions() {
    this.isLoading.set(true);
    try {
      const accountId = String(this.account().id);
      const { data, error } = await this.supabase.getTransactions(accountId);
      if (data && !error) {
        this.allTransactions.set(data as SupabaseTransaction[]);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  setRange(range: number) {
    this.dateRange.set(range);
  }

  setStatus(s: 'all' | 'confirmed' | 'pending' | 'cancelled') {
    this.statusFilter.set(s);
  }

  setType(t: 'all' | 'income' | 'expense' | 'transfer') {
    this.typeFilter.set(t);
  }

  exportCsv() {
    const txs = this.filteredTransactions();
    if (txs.length === 0) return;

    const headers = ['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor (BRL)'];
    const rows = txs.map(tx => [
      new Date((tx.date || '').split('T')[0] + 'T12:00:00').toLocaleDateString('pt-BR'),
      `"${tx.description}"`,
      tx.category || tx.type,
      tx.type === 'expense' ? 'Despesa' : tx.type === 'income' ? 'Receita' : 'Transferência',
      (tx.type === 'expense' ? -tx.amount : tx.amount).toFixed(2).replace('.', ',')
    ]);

    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extrato_${this.account().name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private formatDateLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const sameDay = (a: Date, b: Date) => 
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    if (sameDay(date, today)) return 'Hoje';
    if (sameDay(date, yesterday)) return 'Ontem';

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  }

  getTxIcon(tx: SupabaseTransaction): { icon: string; bg: string; color: string } {
    const categoryMap: Record<string, { icon: string; bg: string; color: string }> = {
      food: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
      alimentacao: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
      transport: { icon: 'directions_car', bg: 'bg-blue-50', color: 'text-blue-500' },
      transporte: { icon: 'directions_car', bg: 'bg-blue-50', color: 'text-blue-500' },
      income: { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      salary: { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      salario: { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      shopping: { icon: 'shopping_bag', bg: 'bg-purple-50', color: 'text-purple-500' },
      compras: { icon: 'shopping_bag', bg: 'bg-purple-50', color: 'text-purple-500' },
      utilities: { icon: 'bolt', bg: 'bg-yellow-50', color: 'text-yellow-500' },
      contas: { icon: 'bolt', bg: 'bg-yellow-50', color: 'text-yellow-500' },
      saude: { icon: 'local_hospital', bg: 'bg-red-50', color: 'text-red-500' },
      health: { icon: 'local_hospital', bg: 'bg-red-50', color: 'text-red-500' },
      transfer: { icon: 'sync_alt', bg: 'bg-blue-50', color: 'text-blue-500' },
      transferencia: { icon: 'sync_alt', bg: 'bg-blue-50', color: 'text-blue-500' },
      meta: { icon: 'flag', bg: 'bg-emerald-50', color: 'text-emerald-500' },
      metas: { icon: 'flag', bg: 'bg-emerald-50', color: 'text-emerald-500' },
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
      bb: '#c89b00',
      'banco do brasil': '#c89b00',
    };
    const lower = name.toLowerCase();
    for (const key of Object.keys(colors)) {
      if (lower.includes(key)) return colors[key];
    }
    return '#475569';
  }
}
