import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { UserProfile } from '../../../core/models/admin.models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Gerenciar Usuários</h1>
          <p class="text-slate-500 mt-1">Lista de todos os usuários cadastrados</p>
        </div>
        <button (click)="loadUsers()" class="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2">
          <mat-icon>refresh</mat-icon>
          Atualizar
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
      
      <!-- Tabela de Usuários -->
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
      
      <!-- Modal de Edição -->
      @if (showEditModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h2 class="text-xl font-bold text-slate-900 mb-4">Editar Usuário</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input type="text" [(ngModel)]="editingUser.name"
                       class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select [(ngModel)]="editingUser.role"
                        class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="closeEditModal()"
                      class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button (click)="saveUser()"
                      class="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                Salvar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);
  
  users = signal<UserProfile[]>([]);
  filteredUsers = signal<UserProfile[]>([]);
  loading = signal(true);
  
  searchQuery = '';
  roleFilter = 'all';
  
  showEditModal = signal(false);
  editingUser: Partial<UserProfile> = {};
  
  async ngOnInit() {
    await this.loadUsers();
  }
  
  async loadUsers() {
    this.loading.set(true);
    const users = await this.adminService.getAllUsers();
    this.users.set(users);
    this.filterUsers();
    this.loading.set(false);
  }
  
  filterUsers() {
    let result = this.users();
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      );
    }
    
    if (this.roleFilter !== 'all') {
      result = result.filter(u => u.role === this.roleFilter);
    }
    
    this.filteredUsers.set(result);
  }
  
  editUser(user: UserProfile) {
    this.editingUser = { ...user };
    this.showEditModal.set(true);
  }
  
  closeEditModal() {
    this.showEditModal.set(false);
    this.editingUser = {};
  }
  
  async saveUser() {
    if (!this.editingUser.id) return;
    
    const success = await this.adminService.updateUserProfile(this.editingUser.id, {
      name: this.editingUser.name,
      role: this.editingUser.role as 'user' | 'admin'
    });
    
    if (success) {
      await this.loadUsers();
      this.closeEditModal();
    }
  }
  
  async toggleRole(user: UserProfile) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const success = await this.adminService.updateUserRole(user.id!, newRole);
    
    if (success) {
      await this.loadUsers();
    }
  }
  
  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }
}
