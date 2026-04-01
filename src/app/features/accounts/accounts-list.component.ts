import { Component, inject, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AccountDetailsModalComponent } from './account-details-modal.component';
import { Account } from '../../core/models/account.model';
import { AccountFormComponent } from './account-form.component';
import { NavigationService } from '../../core/services/navigation.service';

import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal.component';
import { SupabaseService, SupabaseAccount } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, AccountDetailsModalComponent, AccountFormComponent, DeleteConfirmModalComponent],
  templateUrl: './accounts-list.component.html',
  styles: [`
    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
  `]
})
export class AccountsListComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private loadingSrv = inject(LoadingService);
  private navSrv = inject(NavigationService);

  showForm = signal(false);
  isLoading = signal(true);
  accounts = signal<SupabaseAccount[]>([]);
  selectedAccount = signal<Account | null>(null);
  statementAccount = signal<Account | null>(null);
  accountToEdit = signal<SupabaseAccount | null>(null);
  accountToDelete = signal<Account | null>(null);

  @Output() viewStatement = new EventEmitter<Account>();

  // Computed signals for categorization
  bankAccounts = computed(() =>
    this.accounts().filter(a => a.account_type !== 'credit_card')
  );

  creditCards = computed(() =>
    this.accounts().filter(a => a.account_type === 'credit_card')
  );

   // Summary Totals
   totalBalance = computed(() =>
     this.bankAccounts().reduce((sum, a) => sum + (a.initial_balance || 0), 0)
   );

   availableCredit = computed(() =>
     this.creditCards().reduce((sum, a) => sum + (a.initial_balance || 0), 0)
   );

   monthlySpending = signal(0);
   spendingChange = signal(0);

   async ngOnInit() {
     await this.loadAccounts();
   }

  async loadAccounts() {
    this.isLoading.set(true);
    this.loadingSrv.show('Atualizando suas finanças...');
    
    try {
      const { data, error } = await this.supabase.getAccounts();
      if (data && !error) {
        this.accounts.set(data as SupabaseAccount[]);
      }

      // Load dashboard summary for stats
      const summary = await this.supabase.getDashboardSummary();
      if (summary) {
        this.monthlySpending.set(summary.stats.monthlySpending);
        this.spendingChange.set(summary.stats.spendingChange);
      }
    } finally {
      this.isLoading.set(false);
      this.loadingSrv.hide();
    }
  }

  openDetails(account: SupabaseAccount) {
    this.selectedAccount.set({
      id: account.id,
      name: account.institution_name,
      type: account.account_type,
      balance: `R$ ${account.initial_balance.toFixed(2)}`,
      balanceLabel: account.account_type === 'credit_card' ? 'Limite Disponível' : 'Saldo Atual',
      details: this.getAccountTypeLabel(account.account_type),
      icon: account.icon,
      color: account.color,
      iconBgClass: 'bg-slate-50',
      iconColorClass: 'text-slate-900',
      badgeClass: 'bg-slate-100'
    });
  }

  openStatement(account: SupabaseAccount) {
    this.statementAccount.set({
      id: account.id,
      name: account.institution_name,
      type: account.account_type,
      balance: `R$ ${account.initial_balance.toFixed(2)}`,
      balanceLabel: account.account_type === 'credit_card' ? 'Limite Disponível' : 'Saldo Atual',
      details: this.getAccountTypeLabel(account.account_type),
      icon: account.icon,
      color: account.color,
      iconBgClass: 'bg-slate-50',
      iconColorClass: 'text-slate-900',
      badgeClass: 'bg-slate-100'
    });
  }

  async onAccountSaved() {
    await this.loadAccounts();
    this.showForm.set(false);
    this.accountToEdit.set(null);
  }

  openEditForm() {
    const selected = this.selectedAccount();
    if (selected) {
      const fullAccount = this.accounts().find(a => a.id === selected.id);
      if (fullAccount) {
        this.accountToEdit.set(fullAccount);
        this.selectedAccount.set(null);
        this.showForm.set(true);
      }
    }
  }

  confirmDelete() {
    this.accountToDelete.set(this.selectedAccount());
    this.selectedAccount.set(null);
  }

  onViewStatement(account: Account) {
    this.selectedAccount.set(null);
    this.navSrv.navigateTo('statement', { account });
  }

  async executeDelete() {
    const account = this.accountToDelete();
    if (account) {
      this.loadingSrv.show('Removendo conta...');
      try {
        const { error } = await (this.supabase as any).deleteAccount(String(account.id));
        if (!error) {
          await this.loadAccounts();
          this.accountToDelete.set(null);
        }
      } finally {
        this.loadingSrv.hide();
      }
    }
  }

  getAccountTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'checking': 'Conta Corrente',
      'savings': 'Poupança',
      'credit_card': 'Cartão de Crédito',
      'investment': 'Investimento'
    };
    return labels[type] || type;
  }

  getBrandColor(institution: string): string {
    const colors: Record<string, string> = {
      'nubank': '#8A05BE',
      'itau': '#EC7000',
      'inter': '#FF7A00',
      'bradesco': '#CC092F',
      'santander': '#EC0000',
      'xp': '#000000'
    };
    return colors[institution.toLowerCase()] || '#64748b';
  }
}
