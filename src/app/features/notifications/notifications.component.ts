import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, Notification } from './notifications.service';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    template: `
    <div class="p-8 max-w-4xl mx-auto space-y-8">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-[#0B1120] rounded-2xl flex items-center justify-center text-white shadow-lg">
            <mat-icon>notifications</mat-icon>
          </div>
          <h1 class="text-3xl font-bold text-slate-900">Notificações</h1>
        </div>
        <div class="flex items-center gap-4">
          <button (click)="markAllAsRead()"
            class="px-6 py-3 bg-[#0B1120] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            Marcar tudo como lido
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex gap-4">
        @for (filter of filters; track filter) {
          <button (click)="activeFilter.set(filter)"
            class="px-6 py-2.5 rounded-full text-sm font-bold transition-all"
            [class.bg-[#0B1120]]="activeFilter() === filter"
            [class.text-white]="activeFilter() === filter"
            [class.bg-slate-100]="activeFilter() !== filter"
            [class.text-slate-500]="activeFilter() !== filter">
            {{ filter }}
          </button>
        }
      </div>

      <!-- Notifications List -->
      <div class="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div class="divide-y divide-gray-50">
          @for (notification of filteredNotifications(); track notification.id) {
            <div class="p-6 flex gap-6 hover:bg-slate-50 transition-colors relative group cursor-pointer"
              [class.bg-slate-50/50]="!notification.is_read"
              (click)="markAsRead(notification.id)">
              
              <!-- Icon -->
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                [style.backgroundColor]="notification.bg_color"
                [style.color]="notification.color">
                <mat-icon>{{ notification.icon }}</mat-icon>
              </div>

              <!-- Content -->
              <div class="flex-1 space-y-1">
                <div class="flex justify-between items-start">
                  <h3 class="font-bold text-slate-900">{{ notification.title }}</h3>
                  <span class="text-xs font-medium text-slate-400">{{ formatTime(notification.created_at) }}</span>
                </div>
                <p class="text-sm text-slate-500 leading-relaxed">{{ notification.description }}</p>
              </div>

              <!-- Status Indicator -->
              <div class="flex items-center px-2">
                @if (!notification.is_read) {
                  <div class="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-200"></div>
                } @else {
                  <mat-icon class="text-slate-300 text-lg">done_all</mat-icon>
                }
              </div>
            </div>
          }
        </div>
        <div class="p-12 text-center">
          <p class="text-sm font-medium text-slate-400">Você chegou ao fim das suas notificações.</p>
        </div>
      </div>
    </div>
  `
})
export class NotificationsComponent {
    private notificationService = inject(NotificationService);

    filters = ['Todas', 'Informação', 'Alerta', 'Sucesso'];
    activeFilter = signal('Todas');

    // Use computed signal for filtered notifications
    filteredNotifications = computed(() => {
        const filter = this.activeFilter();
        const allNotifs = this.notificationService.notifications();
        
        if (filter === 'Todas') return allNotifs;
        
        const typeMap: Record<string, string> = { 'Informação': 'info', 'Alerta': 'alert', 'Sucesso': 'success' };
        return allNotifs.filter(n => n.type === typeMap[filter]);
    });

    async markAllAsRead() {
        await this.notificationService.markAllAsRead();
    }
    
    async markAsRead(id: string) {
        await this.notificationService.markAsRead(id);
    }
    
    formatTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        }
    }
}
