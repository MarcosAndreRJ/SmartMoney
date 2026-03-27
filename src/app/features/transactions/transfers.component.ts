import { Component, inject, signal, OnInit, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PrivacyService } from '../../core/services/privacy.service';
import { TransferResultModalComponent } from './transfer-result-modal.component';
import { SupabaseService, SupabaseTransaction, SupabaseAccount, SupabaseContact } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-transfers',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, TransferResultModalComponent],
  template: `
    <div class="p-4 sm:p-8 bg-[#F8FAFC] min-h-screen text-slate-900">
      <h1 class="text-2xl font-bold tracking-tight mb-8 text-slate-900">Transferências</h1>
      
      <div class="max-w-7xl mx-auto flex flex-col xl:flex-row gap-8">
        <!-- Left Column -->
        <div class="flex-1 space-y-8">
          
          <!-- Card Form -->
          <div class="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
            <!-- Tabs -->
            <div class="flex border-b border-gray-100">
              <button 
                (click)="activeTab.set('account')"
                class="flex-1 py-4 text-sm font-bold transition-all relative"
                [class.text-emerald-600]="activeTab() === 'account'"
                [class.text-slate-400]="activeTab() !== 'account'">
                Entre contas
                @if (activeTab() === 'account') {
                  <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"></div>
                }
              </button>
              <button 
                (click)="activeTab.set('person')"
                class="flex-1 py-4 text-sm font-bold transition-all relative"
                [class.text-emerald-600]="activeTab() === 'person'"
                [class.text-slate-400]="activeTab() !== 'person'">
                Para pessoa
                @if (activeTab() === 'person') {
                  <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-t-full"></div>
                }
              </button>
            </div>

            <div class="p-6 sm:p-8">
              <div class="flex items-center gap-3 mb-8">
                <mat-icon class="text-emerald-500">send</mat-icon>
                <h2 class="text-xl font-bold text-slate-900">{{ activeTab() === 'account' ? 'Nova Transferência' : 'Enviar para Contato' }}</h2>
              </div>

              <form [formGroup]="transferForm" class="space-y-6">
                <!-- Origem e Destino -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Conta de Origem (sempre visível) -->
                  <div>
                    <label class="block text-sm font-semibold text-slate-900 mb-2">Conta de Origem</label>
                    <div class="relative flex items-center w-full h-14 rounded-xl bg-[#F8FAFC] border border-gray-200 overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                      <select formControlName="fromAccount" class="w-full h-full outline-none text-sm font-medium text-slate-700 px-4 bg-transparent appearance-none cursor-pointer">
                        @for (acc of bankAccounts(); track acc.id) {
                          <option [value]="acc.id">{{ acc.institution_name }} (Saldo: R$ {{ acc.initial_balance.toFixed(2) }})</option>
                        }
                      </select>
                      <mat-icon class="absolute right-3 text-gray-400 pointer-events-none text-sm">expand_more</mat-icon>
                    </div>
                  </div>

                  <!-- Destino condicional -->
                  @if (activeTab() === 'account') {
                    <div>
                      <label class="block text-sm font-semibold text-slate-900 mb-2">Conta de Destino</label>
                      <div class="relative flex items-center w-full h-14 rounded-xl bg-[#F8FAFC] border border-gray-200 overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                        <select formControlName="toAccountSelect" class="w-full h-full outline-none text-sm font-medium text-slate-700 px-4 bg-transparent appearance-none cursor-pointer">
                          <option value="" disabled selected>Selecione a conta destino...</option>
                          @for (acc of bankAccounts(); track acc.id) {
                            @if (acc.id !== transferForm.get('fromAccount')?.value) {
                              <option [value]="acc.id">{{ acc.institution_name }} (Saldo: R$ {{ acc.initial_balance.toFixed(2) }})</option>
                            }
                          }
                        </select>
                        <mat-icon class="absolute right-3 text-gray-400 pointer-events-none text-sm">expand_more</mat-icon>
                      </div>
                    </div>
                  } @else {
                    <div>
                      <label class="block text-sm font-semibold text-slate-900 mb-2">Para Conta/Contato</label>
                      <div class="relative flex items-center w-full h-14 rounded-xl bg-[#F8FAFC] border border-gray-200 overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                        <div class="grid place-items-center h-full w-12 text-gray-400">
                          <mat-icon class="text-[20px]">person_search</mat-icon>
                        </div>
                        <input formControlName="toAccountText" type="text" placeholder="Buscar por nome, CPF ou chave PIX..." class="h-full w-full outline-none text-sm font-medium text-slate-700 bg-transparent pr-4">
                      </div>
                    </div>
                  }
                </div>

                <!-- Valor e Data -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-semibold text-slate-900 mb-2">Valor (R$)</label>
                    <div class="relative flex items-center w-full h-14 rounded-xl bg-[#F8FAFC] border border-gray-200 overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                      <div class="pl-4 pr-2 text-slate-500 text-sm font-bold">R$</div>
                      <input formControlName="amount" type="number" placeholder="0.00" class="h-full w-full outline-none text-sm font-bold text-slate-700 bg-transparent pr-4">
                    </div>
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-slate-900 mb-2">Data</label>
                    <div class="relative flex items-center w-full h-14 rounded-xl bg-[#F8FAFC] border border-gray-200 overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                      <input formControlName="date" type="date" class="h-full w-full outline-none text-sm font-medium text-slate-700 px-4 bg-transparent">
                    </div>
                  </div>
                </div>

                <!-- Descrição e Categoria -->
                <div>
                  <div class="flex justify-between items-center mb-2">
                    <label class="block text-sm font-semibold text-slate-900">Categoria / Descrição</label>
                    <button type="button" class="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider">Gerenciar</button>
                  </div>
                  <div class="flex flex-col sm:flex-row gap-4">
                    <div class="relative flex items-center w-full sm:w-1/3 h-14 rounded-xl bg-[#F8FAFC] border border-gray-200 overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                      <select formControlName="category" class="w-full h-full outline-none text-sm font-medium text-slate-700 px-4 bg-transparent appearance-none cursor-pointer">
                        <option value="Transferência">Transferência</option>
                        <option value="Pagamento">Pagamento</option>
                        <option value="PIX">PIX</option>
                        <option value="Outros">Outros</option>
                      </select>
                      <mat-icon class="absolute right-3 text-gray-400 pointer-events-none text-sm">expand_more</mat-icon>
                    </div>
                    <div class="relative flex items-center flex-1 h-14 rounded-xl bg-[#F8FAFC] border border-gray-200 overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                      <input formControlName="description" type="text" placeholder="Adicione uma nota (opcional)" class="h-full w-full outline-none text-sm form-medium text-slate-700 px-4 bg-transparent">
                    </div>
                  </div>
                </div>

                <!-- Submit Button -->
                <button (click)="confirmTransfer()" type="button" class="w-full h-14 bg-[#0B1120] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 mt-4">
                  {{ activeTab() === 'account' ? 'Confirmar Transferência' : 'Confirmar Envio' }}
                  <mat-icon class="text-[20px]">chevron_right</mat-icon>
                </button>

                <p class="text-center text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5 mt-4">
                  <mat-icon class="text-[14px]">lock</mat-icon>
                  Transação segura com criptografia de ponta a ponta
                </p>
              </form>
            </div>
          </div>

          <!-- Histórico Recente -->
          <div class="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100 mb-8">
            <div class="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
              <h3 class="text-lg font-bold text-slate-900">Histórico Recente</h3>
              <button (click)="seeAll.emit()" class="text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors">Ver Todos</button>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr class="bg-[#F8FAFC] text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-gray-100/50">
                    <th class="px-8 py-5">Destinatário</th>
                    <th class="px-8 py-5">Data</th>
                    <th class="px-8 py-5">Categoria</th>
                    <th class="px-8 py-5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  @for (tx of transactions(); track tx.id) {
                    <tr class="hover:bg-slate-50/50 transition-colors">
                      <td class="px-8 py-5 flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 font-bold border border-slate-200/60 shadow-sm">
                          {{tx.description.charAt(0).toUpperCase()}}
                        </div>
                        <span class="text-sm font-bold text-slate-900">{{ tx.description }}</span>
                      </td>
                      <td class="px-8 py-5 text-sm font-medium text-slate-500">{{ tx.date | date:'dd MMM, yyyy':'UTC' }}</td>
                      <td class="px-8 py-5">
                        <span class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                          {{ tx.category }}
                        </span>
                      </td>
                      <td class="px-8 py-5 text-right text-sm font-bold"
                          [class.text-emerald-600]="tx.type === 'income'"
                          [class.text-red-500]="tx.type !== 'income'">
                        @if (privacy.isPrivate()) {
                          R$ ****
                        } @else {
                          {{ tx.type === 'income' ? '+' : '-' }} {{ tx.amount | currency:'BRL':'symbol':'1.2-2' }}
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="4" class="px-8 py-12 text-center text-slate-400 font-medium">Nenhuma transferência recente.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Column / Sidebar info -->
        <div class="w-full xl:w-[340px] space-y-6 shrink-0 pb-12">
          
          <!-- Transferências Rápidas -->
          <div class="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
            <div class="flex items-center gap-2 mb-8">
              <mat-icon class="text-emerald-500 text-[20px]">bolt</mat-icon>
              <h3 class="font-bold text-base text-slate-900">Transferências Rápidas</h3>
            </div>
            
            <div class="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
              @if (activeTab() === 'account') {
                <button class="flex flex-col items-center gap-2 shrink-0 group">
                  <div class="w-14 h-14 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400 group-hover:border-emerald-500 group-hover:text-emerald-500 transition-colors">
                    <mat-icon>add</mat-icon>
                  </div>
                  <span class="text-[10px] font-bold text-slate-500 uppercase">Novo</span>
                </button>
                @for(acc of quickTransferAccounts(); track acc.id) {
                  <button (click)="selectQuickAccount(acc)" class="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition-transform group-hover:-translate-y-1" [style.backgroundColor]="acc.color || '#0B1120'">
                      <mat-icon>{{acc.icon || 'account_balance'}}</mat-icon>
                    </div>
                    <span class="text-[10px] font-bold text-slate-700 uppercase whitespace-nowrap overflow-hidden text-ellipsis w-[60px] text-center">{{acc.institution_name}}</span>
                  </button>
                }
              } @else {
                @for(contact of favoriteContacts(); track contact.id) {
                  <button (click)="selectQuickContact(contact)" class="flex flex-col items-center gap-2 shrink-0 group cursor-pointer">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center shadow-sm overflow-hidden transition-transform group-hover:-translate-y-1 bg-emerald-50 border border-emerald-100 font-bold text-emerald-600">
                      @if (contact.email) {
                        <img [src]="'https://i.pravatar.cc/150?u=' + contact.email" class="w-full h-full object-cover">
                      } @else {
                        {{ contact.name.charAt(0).toUpperCase() }}
                      }
                    </div>
                    <span class="text-[10px] font-bold text-slate-700 uppercase whitespace-nowrap overflow-hidden text-ellipsis w-[60px] text-center">{{ contact.name }}</span>
                  </button>
                }
              }
            </div>
          </div>

          <!-- Limites Diários -->
          <div class="bg-[#0B1120] rounded-[32px] p-8 shadow-2xl text-white relative overflow-hidden">
            <!-- decorative background elements -->
            <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
            
            <div class="flex items-center gap-2 mb-8 text-white/90 relative z-10">
              <mat-icon class="text-[18px]">insights</mat-icon>
              <h3 class="font-bold text-base text-white">Limites Diários</h3>
            </div>
            
            <div class="space-y-6 relative z-10">
              <div>
                <div class="flex justify-between text-xs font-medium mb-2.5">
                  <span class="text-white/60">Entre Contas</span>
                  <span class="font-bold text-white">R$ 8.500 / R$ 10.000</span>
                </div>
                <div class="w-full bg-white/10 rounded-full h-1.5 border border-white/5">
                  <div class="bg-emerald-400 h-1.5 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style="width: 85%"></div>
                </div>
              </div>
              
              <div>
                <div class="flex justify-between text-xs font-medium mb-2.5">
                  <span class="text-white/60">Para Terceiros</span>
                  <span class="font-bold text-white">R$ 1.200 / R$ 5.000</span>
                </div>
                <div class="w-full bg-white/10 rounded-full h-1.5 border border-white/5">
                  <div class="bg-emerald-400 h-1.5 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style="width: 24%"></div>
                </div>
              </div>
              
              <button class="w-full py-4 mt-4 rounded-xl border border-white/10 text-[11px] font-bold text-white hover:bg-white/5 uppercase tracking-widest transition-colors">
                Aumentar Limites
              </button>
            </div>
          </div>

          <!-- Transferências Seguras -->
          <div class="bg-[#ECFDF5] rounded-[32px] p-8 border border-emerald-100 shadow-sm">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-200">
                <mat-icon class="text-[20px]">verified_user</mat-icon>
              </div>
              <div>
                <h4 class="font-bold text-slate-900 mb-2">Transferências Seguras</h4>
                <p class="text-xs text-slate-600 font-medium leading-relaxed">Todas as transações são protegidas por autenticação multifator e criptografia de nível bancário.</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>

    <!-- Modal de Resultado -->
    <app-transfer-result-modal
      [isOpen]="showResultModal()"
      [isSuccess]="modalData().isSuccess"
      [amount]="modalData().amount"
      [recipient]="modalData().recipient"
      [date]="modalData().date"
      [time]="modalData().time"
      (closeModal)="showResultModal.set(false)"
    />
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      height: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #E2E8F0;
      border-radius: 4px;
    }
    .custom-scrollbar:hover::-webkit-scrollbar-thumb {
      background: #CBD5E1;
    }
  `]
})
export class TransfersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private loading = inject(LoadingService);

  privacy = inject(PrivacyService);
  @Output() seeAll = new EventEmitter<void>();
  @Output() changeView = new EventEmitter<any>();

  activeTab = signal<'account' | 'person'>('account');
  showResultModal = signal(false);
  accounts = signal<SupabaseAccount[]>([]);
  transactions = signal<SupabaseTransaction[]>([]);

  // Computed: only non-credit-card accounts for dropdowns
  get bankAccounts() { return () => this.accounts().filter(a => a.account_type !== 'credit_card'); }

  selectedFromAccountId = signal<string>('');

  quickTransferAccounts = computed(() => {
    const all = this.accounts();
    const fromId = this.selectedFromAccountId();
    return all.filter(acc => 
      acc.account_type !== 'credit_card' && 
      acc.id !== fromId
    );
  });

  modalData = signal({
    isSuccess: true,
    amount: '0,00',
    recipient: '',
    date: '',
    time: ''
  });

  transferForm = this.fb.group({
    fromAccount: ['', Validators.required],
    toAccountSelect: [''],
    toAccountText: [''],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    date: [new Date().toLocaleDateString('en-CA')],
    category: ['Transferência'],
    description: ['']
  });

  contacts = signal<SupabaseContact[]>([]);
  
  favoriteContacts = computed(() => this.contacts().filter(c => c.is_favorite));

  async ngOnInit() {
    await this.loadData();
    
    // Subscribe to form changes to update the quick transfer list
    this.transferForm.get('fromAccount')?.valueChanges.subscribe(val => {
      this.selectedFromAccountId.set(val || '');
    });
    
    // Initial set
    const initialFromId = this.transferForm.get('fromAccount')?.value;
    if (initialFromId) {
      this.selectedFromAccountId.set(initialFromId);
    }
  }

  async loadData() {
    this.loading.show('Acessando dados...');
    try {
      const [accRes, txRes, ctRes] = await Promise.all([
        this.supabase.getAccounts(),
        this.supabase.getTransactions(),
        this.supabase.getContacts()
      ]);

      if (accRes.data) {
        this.accounts.set(accRes.data as SupabaseAccount[]);
        const bank = (accRes.data as SupabaseAccount[]).filter(a => a.account_type !== 'credit_card');
        if (bank.length > 0) {
          this.transferForm.patchValue({ fromAccount: bank[0].id });
        }
      }

      if (txRes.data) {
        // Filter transfers: by explicitly set type OR by the default 'Transferência' category
        const allTx = txRes.data as SupabaseTransaction[];
        const transferTx = allTx.filter(t => 
          t.type === 'transfer' || 
          t.category === 'Transferência' || 
          t.description.toLowerCase().includes('transferência')
        );
        this.transactions.set(transferTx);
      }

      if (ctRes.data) {
        this.contacts.set(ctRes.data as SupabaseContact[]);
      }
    } finally {
      this.loading.hide();
    }
  }

  async confirmTransfer() {
    const isInternal = this.activeTab() === 'account';
    const formVals = this.transferForm.value;

    const toAccountVal = isInternal ? formVals.toAccountSelect : formVals.toAccountText;

    // Dynamic Validation Check
    if (!formVals.fromAccount || !toAccountVal || !formVals.amount || formVals.amount <= 0) {
      this.modalData.set({ isSuccess: false, amount: '0,00', recipient: '', date: '', time: '' });
      this.showResultModal.set(true);
      return;
    }

    this.loading.show('Processando transferência...');
    const now = new Date();

    try {
      if (isInternal) {
        // Find destination account details for the description
        const destAccount = this.accounts().find(a => a.id === formVals.toAccountSelect);
        const fromAccount = this.accounts().find(a => a.id === formVals.fromAccount);
        const destName = destAccount ? destAccount.institution_name : 'Conta';
        const fromName = fromAccount ? fromAccount.institution_name : 'Sua Conta';

        // 1. Create Expense on fromAccount
        const { error: err1 } = await this.supabase.createTransaction({
          account_id: formVals.fromAccount!,
          description: formVals.description || `Transferência para ${destName}`,
          amount: formVals.amount!,
          date: formVals.date || new Date().toLocaleDateString('en-CA'),
          category: formVals.category!,
          type: 'expense'
        });

        if (err1) throw err1;

        // 2. Create Income on toAccount
        const { error: err2 } = await this.supabase.createTransaction({
          account_id: formVals.toAccountSelect!,
          description: `Transferência recebida de ${fromName}`,
          amount: formVals.amount!,
          date: formVals.date || new Date().toLocaleDateString('en-CA'),
          category: formVals.category!,
          type: 'income'
        });

        if (err2) throw err2;

        // 3. Update account balances
        const fromAcc = this.accounts().find(a => a.id === formVals.fromAccount);
        const toAcc   = this.accounts().find(a => a.id === formVals.toAccountSelect);
        if (fromAcc) {
          await this.supabase.updateAccount(fromAcc.id, {
            initial_balance: parseFloat((fromAcc.initial_balance - formVals.amount!).toFixed(2))
          });
        }
        if (toAcc) {
          await this.supabase.updateAccount(toAcc.id, {
            initial_balance: parseFloat((toAcc.initial_balance + formVals.amount!).toFixed(2))
          });
        }

      } else {
        // External Transfer
        const { error } = await this.supabase.createTransaction({
          account_id: formVals.fromAccount!,
          description: formVals.description || `Enviado para: ${formVals.toAccountText}`,
          amount: formVals.amount!,
          date: formVals.date || new Date().toLocaleDateString('en-CA'),
          category: formVals.category!,
          type: 'expense'
        });

        if (error) throw error;
      }

      // Success Setup
      this.modalData.set({
        isSuccess: true,
        amount: formVals.amount.toFixed(2),
        recipient: isInternal ?
          (this.accounts().find(a => a.id === formVals.toAccountSelect)?.institution_name || 'Conta') :
          (formVals.toAccountText || 'Contato'),
        date: now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });

      this.transferForm.reset({
        fromAccount: this.accounts()[0]?.id || '',
        toAccountSelect: '',
        toAccountText: '',
        date: new Date().toLocaleDateString('en-CA'),
        category: 'Transferência',
        amount: null
      });

      await this.loadData();
    } catch (err) {
      this.modalData.set({ isSuccess: false, amount: '0,00', recipient: '', date: '', time: '' });
    } finally {
      this.showResultModal.set(true);
      this.loading.hide();
    }
  }

  selectQuickAccount(acc: SupabaseAccount) {
    // If it's the same as from account, we don't do anything or we could swap? 
    // For now, just set as destination if different.
    if (this.transferForm.get('fromAccount')?.value !== acc.id) {
       this.activeTab.set('account');
       this.transferForm.patchValue({ toAccountSelect: acc.id });
    }
  }

  selectQuickContact(contact: any) {
    this.activeTab.set('person');
    this.transferForm.patchValue({ toAccountText: contact.name });
  }
}

