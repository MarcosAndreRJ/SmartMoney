import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InviteMemberModalComponent } from './invite-member-modal.component';
import { SharedAccountService } from './shared-accounts.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal.component';

@Component({
  selector: 'app-shared-accounts',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, InviteMemberModalComponent, ConfirmModalComponent],
  template: `
    @if (showInviteModal()) {
      <app-invite-member-modal 
        (closeRequest)="showInviteModal.set(false)"
        (invite)="handleInvite($event)">
      </app-invite-member-modal>
    }

    @if (showDeleteConfirm()) {
      <app-confirm-modal
        [title]="'Remover Acesso'"
        [message]="'Tem certeza que deseja remover o acesso deste membro? Ele não poderá mais visualizar ou editar as transações desta conta.'"
        (confirm)="executeRemoveMember()"
        (cancel)="showDeleteConfirm.set(false)">
      </app-confirm-modal>
    }

    <div class="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
      <!-- Left Sidebar -->
      <div class="lg:col-span-4 space-y-8">
        <!-- Suas Contas -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-6 border-b border-gray-50">
            <h2 class="font-bold text-slate-900">Suas Contas</h2>
            <p class="text-xs text-slate-400 mt-1">Selecione uma conta para gerenciar acessos</p>
          </div>
          <div class="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            @for (account of accounts(); track account.id) {
              <button 
                (click)="selectAccount(account)"
                class="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left group relative"
                [class.bg-slate-50]="selectedAccountId() === account.id">
                @if (selectedAccountId() === account.id) {
                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-slate-900"></div>
                }
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white group-hover:opacity-90 transition-all shadow-sm"
                     [style.backgroundColor]="account.color || '#64748b'">
                  <mat-icon>{{ account.icon || 'account_balance' }}</mat-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-slate-900 truncate">{{ account.institution_name }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">{{ account.account_type }}</p>
                </div>
                <mat-icon class="text-slate-300 text-lg">chevron_right</mat-icon>
              </button>
            } @empty {
              <div class="p-8 text-center text-slate-400 text-xs italic">Nenhuma conta encontrada.</div>
            }
          </div>
        </div>

        <!-- Convites Pendentes -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-6 border-b border-gray-50 flex justify-between items-center">
            <h2 class="font-bold text-slate-900 text-sm">Convites Pendentes</h2>
            <span class="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
              {{ invitations().length }} Convites
            </span>
          </div>
          <div class="divide-y divide-gray-50">
            @for (invite of invitations(); track invite.id) {
              <div class="p-4 flex items-center gap-3 group">
                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <mat-icon class="text-lg">person</mat-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-slate-700 truncate">{{ invite.email }}</p>
                  <p class="text-[10px] text-slate-400 italic">Enviado {{ invite.created_at | date:'shortDate':'UTC' }}</p>
                </div>
                <button (click)="cancelInvite(invite.id)" class="text-slate-300 hover:text-red-500 transition-colors">
                  <mat-icon class="text-lg">cancel</mat-icon>
                </button>
              </div>
            } @empty {
              <div class="p-6 text-center text-slate-400 text-[11px] italic font-medium">Não há convites pendentes para esta conta.</div>
            }
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="lg:col-span-8 space-y-8">
        @if (selectedAccountId()) {
          <!-- Quem tem acesso? -->
          <div class="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-8 border-b border-gray-50 flex justify-between items-start">
              <div>
                <h2 class="text-xl font-bold text-slate-900">Quem tem acesso?</h2>
                <p class="text-sm text-slate-400 mt-1">{{ selectedAccountName() }}</p>
              </div>
              <button 
                (click)="showInviteModal.set(true)"
                class="px-6 py-2.5 bg-[#0B1120] text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all flex items-center gap-2">
                <mat-icon class="text-sm">person_add</mat-icon>
                Convidar Membro
              </button>
            </div>
            
            <div class="divide-y divide-gray-50">
              @for (member of members(); track member.id) {
                <div class="p-8 flex items-center gap-6">
                  <div class="w-12 h-12 rounded-full overflow-hidden border border-gray-100 shrink-0 bg-slate-50 flex items-center justify-center">
                    <img *ngIf="member.profiles?.avatar_url" [src]="member.profiles?.avatar_url" [alt]="member.profiles?.full_name" class="w-full h-full object-cover">
                    <mat-icon *ngIf="!member.profiles?.avatar_url" class="text-slate-300">person</mat-icon>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="font-bold text-slate-900">{{ member.profiles?.full_name || 'Usuário SmartMoney' }}</p>
                      @if (isCurrentUser(member.user_id)) {
                        <span class="px-1.5 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded uppercase tracking-wider">VOCÊ</span>
                      }
                    </div>
                    <p class="text-sm text-slate-400">{{ member.profiles?.email }}</p>
                  </div>
                  
                  <div class="flex items-center gap-4">
                    @if (member.role === 'Owner') {
                      <span class="text-sm font-bold text-slate-700 px-4">Proprietário</span>
                    } @else {
                      <div class="relative">
                        <select 
                          [value]="member.role"
                          (change)="updateRole(member.id, $event)"
                          [disabled]="!isOwner()"
                          class="appearance-none bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 pr-10 text-sm font-bold text-slate-700 outline-none focus:border-slate-300 transition-all disabled:opacity-50">
                          <option value="Editor">Editor</option>
                          <option value="Viewer">Visualizador</option>
                        </select>
                        <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</mat-icon>
                      </div>
                      <button 
                        *ngIf="isOwner()"
                        (click)="confirmRemoveMember(member)"
                        class="text-slate-300 hover:text-red-500 transition-colors">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Convidar Novo Membro (Inline Form - matching design guide) -->
          <div class="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-8">
              <h2 class="text-xl font-bold text-slate-900 mb-8">Convidar novo membro</h2>
              
              <form [formGroup]="inviteForm" (ngSubmit)="sendInvite()" class="space-y-8">
                <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div class="md:col-span-6 space-y-2">
                    <label for="inviteEmail" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço de E-mail</label>
                    <div class="relative">
                      <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-lg">mail_outline</mat-icon>
                      <input 
                        id="inviteEmail"
                        formControlName="email"
                        type="email" 
                        placeholder="exemplo@email.com" 
                        class="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:border-slate-300 transition-all">
                    </div>
                  </div>
                  
                  <div class="md:col-span-3 space-y-2">
                    <label for="permissionLevel" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nível de Permissão</label>
                    <div class="relative">
                      <select 
                        id="permissionLevel"
                        formControlName="role"
                        class="w-full h-12 px-4 appearance-none bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all">
                        <option value="Viewer">Visualizador</option>
                        <option value="Editor">Editor</option>
                      </select>
                      <mat-icon class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</mat-icon>
                    </div>
                  </div>

                  <div class="md:col-span-3 flex items-end">
                    <button 
                      type="submit"
                      [disabled]="inviteForm.invalid"
                      class="w-full h-12 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:shadow-none">
                      Enviar Convite
                    </button>
                  </div>
                </div>

                <!-- Guia de Permissões -->
                <div class="bg-emerald-50/50 rounded-2xl p-6 flex gap-4">
                  <div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    <mat-icon class="text-sm">info</mat-icon>
                  </div>
                  <div class="space-y-2">
                    <p class="text-xs font-bold text-emerald-700">Guia de Permissões</p>
                    <ul class="space-y-1">
                      <li class="text-[11px] text-emerald-600 leading-relaxed">
                        <span class="font-bold">Visualizador:</span> Pode apenas visualizar saldo e histórico de transações.
                      </li>
                      <li class="text-[11px] text-emerald-600 leading-relaxed">
                        <span class="font-bold">Editor:</span> Pode iniciar transferências e gerenciar lançamentos.
                      </li>
                    </ul>
                  </div>
                </div>
              </form>
            </div>
          </div>
        } @else {
          <div class="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
             <div class="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 mb-4">
                <mat-icon class="text-3xl">account_balance</mat-icon>
             </div>
             <h3 class="text-lg font-bold text-slate-800">Selecione uma conta</h3>
             <p class="text-slate-500 max-w-xs mt-2 text-sm italic">Escolha uma conta na barra lateral para gerenciar quem tem acesso e convidar novos membros.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class SharedAccountsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(SharedAccountService);
  private supabase = inject(SupabaseService);

  showInviteModal = signal(false);
  showDeleteConfirm = signal(false);
  memberToRemove = signal<any | null>(null);

  accounts = this.service.accounts;
  members = this.service.members;
  invitations = this.service.invitations;
  
  selectedAccountId = signal<string | null>(null);
  selectedAccountName = signal<string>('');
  currentUserId = signal<string | null>(null);

  inviteForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['Viewer', Validators.required]
  });

  constructor() {
    effect(async () => {
      const id = this.selectedAccountId();
      if (id) {
        try {
          await this.service.loadAccountMembers(id);
          await this.service.loadPendingInvitations(id);
        } catch (err) {
          console.error('Error loading account details:', err);
        }
      }
    });
  }

  async ngOnInit() {
    const user = await this.supabase.getUser();
    if (user) {
      this.currentUserId.set(user.id);
    }
    await this.service.loadAccounts();
    if (this.accounts().length > 0) {
      this.selectAccount(this.accounts()[0]);
    }
  }

  selectAccount(account: any) {
    this.selectedAccountId.set(account.id);
    this.selectedAccountName.set(account.institution_name);
  }

  isCurrentUser(userId: string): boolean {
    return this.currentUserId() === userId;
  }

  isOwner(): boolean {
    const me = this.members().find(m => m.user_id === this.currentUserId());
    if (me?.role === 'Owner') return true;
    
    // Also check if I am the literal owner of the account record
    const selectedAccount = this.accounts().find(a => a.id === this.selectedAccountId());
    return selectedAccount?.user_id === this.currentUserId();
  }

  async handleInvite(data: {email: string, role: string}) {
    const id = this.selectedAccountId();
    if (id) {
      await this.service.sendInvitation(id, data.email, data.role as any);
      this.showInviteModal.set(false);
    }
  }

  async sendInvite() {
    if (this.inviteForm.valid) {
      const { email, role } = this.inviteForm.value;
      const id = this.selectedAccountId();
      if (id && email && role) {
        await this.service.sendInvitation(id, email, role as any);
        this.inviteForm.reset({ role: 'Viewer' });
      }
    }
  }

  async cancelInvite(inviteId: string) {
    await this.service.cancelInvitation(inviteId);
  }

  async updateRole(memberId: string, event: any) {
    const newRole = event.target.value;
    await this.service.updateMemberRole(memberId, newRole);
  }

  confirmRemoveMember(member: any) {
    this.memberToRemove.set(member);
    this.showDeleteConfirm.set(true);
  }

  async executeRemoveMember() {
    const member = this.memberToRemove();
    if (member) {
      await this.service.removeMember(member.id);
      this.showDeleteConfirm.set(false);
      this.memberToRemove.set(null);
    }
  }
}
