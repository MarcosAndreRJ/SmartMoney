import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { UserProfile } from '../../../core/models/admin.models';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Enviar Notificações</h1>
          <p class="text-slate-500 mt-1">Envie notificações para os usuários</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Formulário de Envio -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 class="text-lg font-bold text-slate-900 mb-4">Nova Notificação</h2>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Destinatários</label>
              <select [(ngModel)]="notificationForm.target"
                      class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                <option value="all">Todos os Usuários</option>
                <option value="admins">Apenas Administradores</option>
                <option value="users">Apenas Usuários Comuns</option>
                <option value="specific">Usuário Específico</option>
              </select>
            </div>
            
            @if (notificationForm.target === 'specific') {
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Selecionar Usuário</label>
                <select [(ngModel)]="notificationForm.userId"
                        class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option value="">Selecione...</option>
                  @for (user of users(); track user.id) {
                    <option [value]="user.id">{{ user.name }} ({{ user.email }})</option>
                  }
                </select>
              </div>
            }
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Título</label>
              <input type="text" [(ngModel)]="notificationForm.title"
                     placeholder="Ex: Nova funcionalidade disponível"
                     class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Mensagem</label>
              <textarea [(ngModel)]="notificationForm.message" rows="4"
                        placeholder="Digite sua mensagem..."
                        class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tipo de Notificação</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2">
                  <input type="radio" [(ngModel)]="notificationForm.type" value="in_app" 
                         class="w-4 h-4 text-emerald-500">
                  <span class="text-sm text-slate-700">No App</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="radio" [(ngModel)]="notificationForm.type" value="email" 
                         class="w-4 h-4 text-emerald-500">
                  <span class="text-sm text-slate-700">Email</span>
                </label>
              </div>
            </div>
          </div>
          
          <button (click)="sendNotification()" [disabled]="sending()"
                  class="w-full mt-6 px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            @if (sending()) {
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Enviando...
            } @else {
              <mat-icon>send</mat-icon>
              Enviar Notificação
            }
          </button>
          
          @if (sendResult()) {
            <div [class]="sendResult()?.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
                 class="mt-4 p-4 rounded-lg text-sm">
              {{ sendResult()?.message }}
            </div>
          }
        </div>
        
        <!-- Histórico de Notificações -->
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-bold text-slate-900">Histórico de Notificações</h2>
            <button (click)="loadHistory()" class="text-slate-400 hover:text-slate-600">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
          
          <div class="space-y-3 max-h-[500px] overflow-y-auto">
            @for (notification of notificationHistory(); track notification.id) {
              <div class="p-4 bg-slate-50 rounded-lg">
                <div class="flex justify-between items-start">
                  <h3 class="font-medium text-slate-900">{{ notification.title }}</h3>
                  <span [class]="notification.status === 'sent' ? 'text-green-600' : 'text-red-600'"
                        class="text-xs font-medium">
                    {{ notification.status === 'sent' ? 'Enviada' : 'Falhou' }}
                  </span>
                </div>
                <p class="text-sm text-slate-500 mt-1">{{ notification.message }}</p>
                <div class="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>{{ getTypeLabel(notification.type) }}</span>
                  <span>{{ formatDate(notification.created_at) }}</span>
                </div>
              </div>
            } @empty {
              <p class="text-center text-slate-400 py-8">Nenhuma notificação enviada</p>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminNotificationsComponent implements OnInit {
  private adminService = inject(AdminService);
  
  users = signal<UserProfile[]>([]);
  notificationHistory = signal<any[]>([]);
  sending = signal(false);
  sendResult = signal<{ success: boolean; message: string } | null>(null);
  
  notificationForm = {
    target: 'all',
    userId: '',
    title: '',
    message: '',
    type: 'in_app'
  };
  
  async ngOnInit() {
    await this.loadUsers();
    await this.loadHistory();
  }
  
  async loadUsers() {
    const users = await this.adminService.getAllUsers();
    this.users.set(users);
  }
  
  async loadHistory() {
    const history = await this.adminService.getNotificationHistory();
    this.notificationHistory.set(history);
  }
  
  async sendNotification() {
    if (!this.notificationForm.title || !this.notificationForm.message) {
      this.sendResult.set({ success: false, message: 'Preencha o título e a mensagem' });
      return;
    }
    
    this.sending.set(true);
    this.sendResult.set(null);
    
    try {
      let count = 0;
      
      if (this.notificationForm.target === 'specific' && this.notificationForm.userId) {
        const success = await this.adminService.sendNotification({
          user_id: this.notificationForm.userId,
          title: this.notificationForm.title,
          message: this.notificationForm.message,
          type: this.notificationForm.type as any
        });
        count = success ? 1 : 0;
      } else if (this.notificationForm.target === 'all') {
        count = await this.adminService.sendBroadcastNotification({
          title: this.notificationForm.title,
          message: this.notificationForm.message,
          type: this.notificationForm.type as any
        });
      } else {
        const targetRole = this.notificationForm.target === 'admins' ? 'admin' : 'user';
        const filteredUsers = this.users().filter(u => u.role === targetRole);
        count = await this.adminService.sendBulkNotification(
          filteredUsers.map(u => u.id!),
          {
            title: this.notificationForm.title,
            message: this.notificationForm.message,
            type: this.notificationForm.type as any
          }
        );
      }
      
      this.sendResult.set({ 
        success: true, 
        message: `Notificação enviada para ${count} usuário(s)` 
      });
      
      this.notificationForm.title = '';
      this.notificationForm.message = '';
      
      await this.loadHistory();
    } catch (error) {
      this.sendResult.set({ 
        success: false, 
        message: 'Erro ao enviar notificação' 
      });
    } finally {
      this.sending.set(false);
    }
  }
  
  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'in_app': 'No App',
      'email': 'Email',
      'push': 'Push'
    };
    return labels[type] || type;
  }
  
  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }
}
