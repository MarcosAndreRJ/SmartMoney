import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { NavigationService } from '../../../core/services/navigation.service';
import { UserProfile } from '../../../core/models/admin.models';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-8">
        <button (click)="navigateTo('admin-dashboard')" 
                class="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
          <mat-icon class="text-slate-600">arrow_back</mat-icon>
        </button>
        <div class="flex-1">
          <h1 class="text-3xl font-bold text-slate-900">Gerenciar Usuários</h1>
          <p class="text-slate-500 mt-1">Lista de todos os usuários cadastrados</p>
        </div>
        <button (click)="openCreateModal()" 
                class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2">
          <mat-icon>person_add</mat-icon>
          Novo Usuário
        </button>
      </div>
      
      <!-- Filtros -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6">
        <div class="flex gap-4">
          <div class="flex-1">
            <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="filterUsers()"
                   placeholder="Buscar por nome ou email..."
                   class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
          </div>
          <select [(ngModel)]="roleFilter" (ngModelChange)="filterUsers()"
                  class="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
            <option value="all">Todos os Roles</option>
            <option value="user">Usuários</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
      </div>
      
      <!-- Loading -->
      @if (loading()) {
        <div class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      } @else {
        <!-- Lista de Usuários -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table class="w-full">
            <thead class="bg-slate-50">
              <tr>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Usuário</th>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Role</th>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Cadastro</th>
                <th class="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (user of filteredUsers(); track user.id) {
                <tr class="hover:bg-slate-50">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        @if (user.avatar) {
                          <img [src]="user.avatar" class="w-10 h-10 rounded-full object-cover">
                        } @else {
                          <mat-icon class="text-slate-400">person</mat-icon>
                        }
                      </div>
                      <div>
                        <p class="font-medium text-slate-900">{{ user.name }}</p>
                        <p class="text-sm text-slate-500">{{ user.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span [class]="user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'"
                          class="px-3 py-1 rounded-full text-xs font-medium">
                      {{ user.role === 'admin' ? 'Admin' : 'Usuário' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-slate-500">
                    {{ formatDate(user.created_at) }}
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <button (click)="editUser(user)"
                              class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button (click)="toggleRole(user)"
                              [class]="user.role === 'admin' ? 'text-amber-500 hover:text-amber-600' : 'text-purple-500 hover:text-purple-600'"
                              class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              [title]="user.role === 'admin' ? 'Remover admin' : 'Tornar admin'">
                        <mat-icon>swap_vert</mat-icon>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-6 py-8 text-center text-slate-400">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      
      <!-- Sidebar de Edição (Direita) -->
      @if (showEditSidebar()) {
        <div class="fixed inset-0 z-50 flex justify-end">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/50" (click)="closeEditSidebar()"></div>
          
          <!-- Sidebar (Direita) -->
          <div class="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-slate-900">Editar Usuário</h2>
                <button (click)="closeEditSidebar()" class="p-2 hover:bg-slate-100 rounded-lg">
                  <mat-icon>close</mat-icon>
                </button>
              </div>
              
              <!-- Avatar -->
              <div class="flex justify-center mb-6">
                <div class="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                  @if (editingUser()?.avatar) {
                    <img [src]="editingUser()?.avatar" class="w-20 h-20 rounded-full object-cover">
                  } @else {
                    <mat-icon class="text-3xl text-slate-400">person</mat-icon>
                  }
                </div>
              </div>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input type="text" [(ngModel)]="editForm.name"
                         class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" [value]="editingUser()?.email" disabled
                         class="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500">
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select [(ngModel)]="editForm.role"
                          class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              
              <div class="flex gap-3 mt-6">
                <button (click)="closeEditSidebar()"
                        class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button (click)="saveUser()" [disabled]="saving()"
                        class="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50">
                  @if (saving()) {
                    <mat-icon class="animate-spin">sync</mat-icon>
                  } @else {
                    Salvar
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- Modal de Criar Usuário -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-slate-900">Criar Novo Usuário</h2>
              <button (click)="closeCreateModal()" class="p-2 hover:bg-slate-100 rounded-lg">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" [(ngModel)]="createForm.email"
                       placeholder="usuario@email.com"
                       class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input type="text" [(ngModel)]="createForm.name"
                       placeholder="Nome completo"
                       class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input type="password" [(ngModel)]="createForm.password"
                       placeholder="Mínimo 6 caracteres"
                       class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select [(ngModel)]="createForm.role"
                        class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="closeCreateModal()"
                      class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button (click)="createUser()" [disabled]="creating()"
                      class="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50">
                @if (creating()) {
                  <mat-icon class="animate-spin">sync</mat-icon>
                } @else {
                  Criar Usuário
                }
              </button>
            </div>
            
            @if (createError()) {
              <div class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {{ createError() }}
              </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  private navSrv = inject(NavigationService);
  private loadingSrv = inject(LoadingService);
  
  users = signal<UserProfile[]>([]);
  filteredUsers = signal<UserProfile[]>([]);
  loading = signal(true);
  saving = signal(false);
  creating = signal(false);
  createError = signal<string | null>(null);
  
  searchQuery = '';
  roleFilter = 'all';
  
  showEditSidebar = signal(false);
  editingUser = signal<UserProfile | null>(null);
  editForm = { name: '', role: 'user' };
  
  showCreateModal = signal(false);
  createForm = { email: '', name: '', password: '', role: 'user' };
  
  async ngOnInit() {
    await this.loadUsers();
  }
  
  async loadUsers() {
    this.loading.set(true);
    console.log('Carregando usuários...');
    const users = await this.adminService.getAllUsers();
    console.log('Usuários carregados:', users);
    this.users.set(users);
    this.filterUsers();
    this.loading.set(false);
  }
  
  filterUsers() {
    let result = this.users();
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(u => 
        (u.name || '').toLowerCase().includes(query) || 
        (u.email || '').toLowerCase().includes(query)
      );
    }
    
    if (this.roleFilter !== 'all') {
      result = result.filter(u => u.role === this.roleFilter);
    }
    
    this.filteredUsers.set(result);
  }
  
  navigateTo(view: string) {
    this.navSrv.navigateTo(view as any);
  }
  
  editUser(user: UserProfile) {
    this.editingUser.set(user);
    this.editForm = { name: user.name || '', role: user.role || 'user' };
    this.showEditSidebar.set(true);
  }
  
  closeEditSidebar() {
    this.showEditSidebar.set(false);
    this.editingUser.set(null);
  }
  
  async saveUser() {
    const user = this.editingUser();
    if (!user?.id) return;
    
    this.saving.set(true);
    const success = await this.adminService.updateUserProfile(user.id, {
      name: this.editForm.name,
      role: this.editForm.role as 'user' | 'admin'
    });
    
    if (success) {
      await this.loadUsers();
      this.closeEditSidebar();
    }
    this.saving.set(false);
  }
  
  async toggleRole(user: UserProfile) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const success = await this.adminService.updateUserRole(user.id!, newRole);
    
    if (success) {
      await this.loadUsers();
    }
  }
  
  openCreateModal() {
    this.createForm = { email: '', name: '', password: '', role: 'user' };
    this.createError.set(null);
    this.showCreateModal.set(true);
  }
  
  closeCreateModal() {
    this.showCreateModal.set(false);
    this.createError.set(null);
  }
  
  async createUser() {
    if (!this.createForm.email || !this.createForm.password) {
      this.createError.set('Email e senha são obrigatórios');
      return;
    }
    
    if (this.createForm.password.length < 6) {
      this.createError.set('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    this.creating.set(true);
    this.createError.set(null);
    
    try {
      // Criar usuário via Supabase Auth Admin
      const { data, error } = await this.adminService.createUserWithEmail(
        this.createForm.email,
        this.createForm.password,
        {
          full_name: this.createForm.name,
          role: this.createForm.role
        }
      );
      
      if (error) {
        this.createError.set(error);
      } else {
        await this.loadUsers();
        this.closeCreateModal();
      }
    } catch (e: any) {
      this.createError.set(e.message || 'Erro ao criar usuário');
    }
    
    this.creating.set(false);
  }
  
  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }
}
