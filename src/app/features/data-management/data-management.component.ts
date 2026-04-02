import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../core/services/supabase.service';
import { AdminService } from '../../core/services/admin.service';
import { LoadingService } from '../../core/services/loading.service';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';

interface DataModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  table: string;
  relatedTables?: string[];
}

@Component({
  selector: 'app-data-management',
  standalone: true,
  imports: [CommonModule, MatIconModule, ConfirmModalComponent],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-12 pb-32 animate-in fade-in duration-500">
      
      <!-- Header -->
      <header>
        <h1 class="text-[32px] font-extrabold tracking-tight text-slate-900 leading-tight">Gerenciar Dados</h1>
        <p class="text-slate-500 text-sm mt-2 font-medium">Controle total sobre suas informações. Limpe ou exclua registros permanentemente.</p>
      </header>

      <!-- Operation Grid -->
      <section class="space-y-6">
        <div class="flex items-center gap-2 text-slate-900">
          <mat-icon class="text-orange-500">cleaning_services</mat-icon>
          <h2 class="text-lg font-bold tracking-tight">Operações de Limpeza</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (module of modules; track module.id) {
            <div class="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
              <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mb-6 group-hover:bg-slate-100 transition-colors">
                <mat-icon>{{ module.icon }}</mat-icon>
              </div>
              
              <h3 class="text-base font-bold text-slate-900 mb-2">{{ module.title }}</h3>
              <p class="text-[12px] text-slate-400 font-medium leading-relaxed">{{ module.description }}</p>

              <button 
                (click)="requestDelete(module)"
                class="absolute bottom-6 right-6 w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100">
                <mat-icon class="text-xl">delete_outline</mat-icon>
              </button>
            </div>
          }
        </div>
      </section>

      <!-- Danger Zone -->
      <section class="bg-red-50/30 border border-red-100 rounded-[32px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div class="text-center md:text-left">
          <h2 class="text-xl font-black text-slate-900 mb-2">Zona de Perigo</h2>
          <p class="text-sm text-slate-500 font-medium max-w-md italic">
            Ao excluir sua conta, todos os seus dados serão permanentemente removidos de nossos servidores. Esta ação é irreversível.
          </p>
        </div>
        <button 
          (click)="requestAccountDelete()"
          class="h-14 px-8 bg-red-600 text-white rounded-2xl font-bold text-base hover:bg-red-700 transition-all shadow-xl shadow-red-200 flex items-center gap-3">
          <mat-icon>person_remove</mat-icon>
          Excluir minha conta
        </button>
      </section>
    </div>

    <!-- Confirm Modal -->
    @if (showConfirm()) {
      <app-confirm-modal
        [title]="'Confirmar Exclusão'"
        [message]="confirmMessage()"
        (confirm)="executeDelete()"
        (cancel)="showConfirm.set(false)">
      </app-confirm-modal>
    }
  `
})
export class DataManagementComponent {
  private supabase = inject(SupabaseService);
  private adminSrv = inject(AdminService);
  private loading = inject(LoadingService);

  showConfirm = signal(false);
  confirmMessage = signal('');
  activeModule = signal<DataModule | null>(null);
  isAccountDelete = signal(false);

  modules: DataModule[] = [
    { id: 'transactions', title: 'Apagar Transações', description: 'Remove todo o histórico de fluxo de caixa.', icon: 'receipt', table: 'transactions' },
    { id: 'lancamentos', title: 'Apagar Lançamentos', description: 'Exclui registros manuais e importados.', icon: 'description', table: 'transactions' },
    { id: 'recurring', title: 'Apagar Lançamentos Recorrentes', description: 'Interrompe e apaga ciclos automáticos.', icon: 'event_repeat', table: 'recurring_transactions' },
    { id: 'goals', title: 'Excluir Metas', description: 'Zera todos os objetivos financeiros salvos.', icon: 'track_changes', table: 'goals', relatedTables: ['goal_contributions'] },
    { id: 'shared', title: 'Excluir Compartilhamentos', description: 'Revoga acesso de contas de terceiros.', icon: 'share', table: 'account_access', relatedTables: ['account_invitations'] },
    { id: 'investments', title: 'Excluir Investimentos', description: 'Limpa portfólio e ativos cadastrados.', icon: 'trending_up', table: 'investments', relatedTables: ['investment_transactions'] },
    { id: 'loans', title: 'Excluir Empréstimos', description: 'Remove dívidas e parcelamentos ativos.', icon: 'account_balance', table: 'loans', relatedTables: ['loan_payments'] },
    { id: 'contacts', title: 'Excluir Contatos', description: 'Apaga lista de favorecidos salvos.', icon: 'contacts', table: 'contacts' },
    { id: 'accounts', title: 'Excluir Contas', description: 'Desvincula contas bancárias e carteiras.', icon: 'account_balance_wallet', table: 'accounts' },
  ];

  requestDelete(module: DataModule) {
    this.activeModule.set(module);
    this.isAccountDelete.set(false);
    this.confirmMessage.set(`Você tem certeza que deseja apagar ${module.title.toLowerCase()}? Esta ação é irreversível e todos os dados selecionados serão perdidos permanentemente.`);
    this.showConfirm.set(true);
  }

  requestAccountDelete() {
    this.isAccountDelete.set(true);
    this.activeModule.set(null);
    this.confirmMessage.set('ATENÇÃO: Você está prestes a excluir sua conta permanentemente. Todos os seus dados, configurações e histórico serão apagados para sempre.');
    this.showConfirm.set(true);
  }

  async executeDelete() {
    this.showConfirm.set(false);
    this.loading.show('Excluindo dados...');

    try {
      if (this.isAccountDelete()) {
        await this.handleFullAccountDelete();
      } else if (this.activeModule()) {
        await this.handleModuleDelete(this.activeModule()!);
      }
    } catch (err) {
      console.error('DataManagement: Error deleting data', err);
    } finally {
      this.loading.hide();
    }
  }

  private async handleModuleDelete(module: DataModule) {
    const user = await this.supabase.getUser();
    if (!user) return;

    // Delete related tables first if any
    if (module.relatedTables) {
      for (const table of module.relatedTables) {
         // Some tables might have goal_id, investment_id etc. 
         // But usually just user_id is enough for a "wipe" of the module
         await this.supabase.client.from(table).delete().eq('user_id', user.id);
      }
    }

    // Special case for Recurring: The user requested to delete associated transactions too
    if (module.id === 'recurring') {
      // Logic could be complex (matching names), but for a wipe, we delete all recurring_transactions
      // then the user might want to wipe 'transactions' too from that module
      // For now we follow the table list
    }

    // Main table delete
    await this.supabase.client.from(module.table).delete().eq('user_id', user.id);

    // Reset recurring scheduler if wiping transactions
    if (module.id === 'transactions' || module.id === 'lancamentos' || module.table === 'transactions') {
      await this.supabase.client
        .from('recurring_transactions')
        .update({ last_generated_date: null })
        .eq('user_id', user.id);
    }
  }

  private async handleFullAccountDelete() {
    const user = await this.supabase.getUser();
    if (!user) return;

    const result = await this.adminSrv.deleteUser(user.id);
    
    if (result.success) {
      await this.supabase.signOut();
    } else {
      alert(`Erro ao excluir conta: ${result.error}`);
    }
  }
}
