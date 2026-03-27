import { Component, inject, signal, output, OnInit, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PrivacyService } from '../core/services/privacy.service';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../core/services/supabase.service';
import { NotificationService } from '../features/notifications/notifications.service';
import { AdminService } from '../core/services/admin.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatIconModule, CommonModule],
  template: `
    <header class="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
      <!-- Search -->
      <div class="flex-1 max-w-xl">
        <div class="relative flex items-center w-full h-10 rounded-2xl bg-[#F1F3F6] overflow-hidden">
          <div class="grid place-items-center h-full w-12 text-slate-400">
            <mat-icon class="text-xl">search</mat-icon>
          </div>
          <input
            class="peer h-full w-full outline-none text-sm text-slate-600 pr-2 bg-transparent placeholder-slate-400"
            type="text"
            id="search"
            placeholder="Search transactions, reports..." />
        </div>
      </div>

      <!-- Actions & Profile -->
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-5 text-slate-400">
          <button 
            (click)="privacy.togglePrivacy()"
            class="hover:text-slate-900 transition-colors"
            [title]="privacy.isPrivate() ? 'Desativar Modo Furtivo' : 'Ativar Modo Furtivo'">
            <mat-icon>{{ privacy.isPrivate() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          
          <div class="relative">
            <button 
              (click)="toggleNotifications()"
              class="relative hover:text-slate-900 transition-colors outline-none">
              <mat-icon>notifications</mat-icon>
              @if (notificationService.unreadCount() > 0) {
                <span class="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              }
            </button>

            <!-- Notifications Dropdown -->
            @if (isNotificationsOpen()) {
              <div class="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div class="px-4 py-3 border-b border-gray-50 flex justify-between items-center">
                  <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Notificações</p>
                  @if (notificationService.unreadCount() > 0) {
                    <span class="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-full">{{ notificationService.unreadCount() }} Novas</span>
                  }
                </div>
                
                <div class="max-h-96 overflow-y-auto">
                  @for (notif of recentNotifications(); track notif.id) {
                    <button 
                      (click)="handleNotificationClick(notif.id)"
                      class="w-full flex gap-3 px-4 py-4 hover:bg-slate-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      [class.bg-slate-50]="!notif.is_read">
                      <div 
                        class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        [style.backgroundColor]="notif.bg_color"
                        [style.color]="notif.color">
                        <mat-icon class="text-lg">{{ notif.icon }}</mat-icon>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-slate-900 truncate">{{ notif.title }}</p>
                        <p class="text-xs text-slate-500 line-clamp-2 mt-0.5">{{ notif.description }}</p>
                        <p class="text-[10px] text-slate-400 mt-1">{{ formatTime(notif.created_at) }}</p>
                      </div>
                      @if (!notif.is_read) {
                        <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2"></div>
                      }
                    </button>
                  }
                  
                  @if (recentNotifications().length === 0) {
                    <div class="px-4 py-8 text-center">
                      <p class="text-sm text-slate-500">Nenhuma notificação.</p>
                    </div>
                  }
                </div>
                
                <button 
                  (click)="navigateToNotifications()"
                  class="w-full py-3 text-center text-xs font-bold text-slate-900 hover:bg-slate-50 transition-colors border-t border-gray-50">
                  Ver todas as notificações
                </button>
              </div>

              <!-- Backdrop to close notifications -->
              <div 
                class="fixed inset-0 z-40" 
                (click)="closeNotifications()"
                (keydown.escape)="closeNotifications()"
                tabindex="-1"></div>
            }
          </div>
          <button class="hover:text-gray-900 transition-colors">
            <mat-icon>mail</mat-icon>
          </button>
        </div>
        
        <div class="w-px h-8 bg-gray-200"></div>

        <!-- Profile with Dropdown -->
        <div class="relative">
          <div 
            (click)="toggleMenu()"
            (keydown.enter)="toggleMenu()"
            (keydown.space)="toggleMenu()"
            tabindex="0"
            class="flex items-center gap-3 cursor-pointer group outline-none">
            <div class="text-right">
              <p class="text-sm font-bold text-slate-900 group-hover:text-slate-600 transition-colors flex items-center gap-2">
                {{ supabase.currentUserProfile()?.name || 'Carregando...' }}
                @if (isAdmin()) {
                  <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">ADMIN</span>
                }
              </p>
              <p class="text-[11px] text-slate-400 truncate max-w-[150px]">{{ supabase.currentUserProfile()?.email }}</p>
            </div>
            <div class="relative">
              <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-gray-200 overflow-hidden">
                @if (supabase.currentUserProfile()?.avatar) {
                  <img
                    [src]="supabase.currentUserProfile()?.avatar"
                    alt="Profile"
                    referrerpolicy="no-referrer"
                    class="w-full h-full object-cover"
                  />
                } @else {
                  <mat-icon class="text-slate-400">person</mat-icon>
                }
              </div>
              <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-gray-100 flex items-center justify-center">
                <mat-icon class="text-[10px] text-gray-400">expand_more</mat-icon>
              </div>
            </div>
          </div>

          <!-- Dropdown Menu -->
          @if (isMenuOpen()) {
            <div class="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div class="px-4 py-3 border-b border-gray-50 mb-1">
                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Conta</p>
              </div>
              
              <button 
                (click)="navigateToProfile()"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                <mat-icon class="text-slate-400">person</mat-icon>
                <span class="font-medium">Meu Perfil</span>
              </button>
              
              <button class="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                <mat-icon class="text-slate-400">settings</mat-icon>
                <span class="font-medium">Configurações</span>
              </button>
              
              <button class="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                <mat-icon class="text-slate-400">help_outline</mat-icon>
                <span class="font-medium">Centro de Ajuda</span>
              </button>
              
              <div class="h-px bg-gray-50 my-1"></div>
              
              <button 
                (click)="logout()"
                class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors text-left">
                <mat-icon class="text-red-400">logout</mat-icon>
                <span class="font-bold">Sair</span>
              </button>
            </div>

            <!-- Backdrop to close menu -->
            <div 
              class="fixed inset-0 z-40" 
              (click)="closeMenu()"
              (keydown.escape)="closeMenu()"
              tabindex="-1"></div>
          }
        </div>
      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit {
  privacy = inject(PrivacyService);
  supabase = inject(SupabaseService);
  notificationService = inject(NotificationService);
  private adminService = inject(AdminService);

  isMenuOpen = signal(false);
  isNotificationsOpen = signal(false);
  isAdmin = signal(false);
  viewChange = output<string>();

  // Get top 5 most recent notifications
  recentNotifications = computed(() => {
    return this.notificationService.notifications().slice(0, 5);
  });

  async ngOnInit() {
    await this.supabase.getUser();
    this.isAdmin.set(await this.adminService.isAdmin());
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
        return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    }
  }

  handleNotificationClick(id: string) {
    this.notificationService.markAsRead(id);
    this.navigateToNotifications();
  }

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
    if (this.isMenuOpen()) this.isNotificationsOpen.set(false);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  toggleNotifications() {
    this.isNotificationsOpen.update(v => !v);
    if (this.isNotificationsOpen()) this.isMenuOpen.set(false);
  }

  closeNotifications() {
    this.isNotificationsOpen.set(false);
  }

  navigateToProfile() {
    this.viewChange.emit('profile');
    this.closeMenu();
  }

  navigateToNotifications() {
    this.viewChange.emit('notifications');
    this.closeNotifications();
  }

  async logout() {
    await this.supabase.signOut();
    this.closeMenu();
  }
}
