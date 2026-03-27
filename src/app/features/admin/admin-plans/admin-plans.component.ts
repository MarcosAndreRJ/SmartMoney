import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { Plan } from '../../../core/models/admin.models';

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8">
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900">Gerenciar Planos</h1>
          <p class="text-slate-500 mt-1">Crie e edite os planos de assinatura</p>
        </div>
        <button (click)="openCreateModal()" 
                class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2">
          <mat-icon>add</mat-icon>
          Novo Plano
        </button>
      </div>
      
      <!-- Lista de Planos -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        @for (plan of plans(); track plan.id) {
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-bold text-slate-900">{{ plan.name }}</h3>
                <p class="text-3xl font-black text-emerald-600 mt-2">
                  R$ {{ plan.price.toFixed(2) }}
                  <span class="text-sm font-normal text-slate-400">/mês</span>
                </p>
              </div>
              <span [class]="plan.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                    class="px-3 py-1 rounded-full text-xs font-medium">
                {{ plan.is_active ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
            
            <p class="text-sm text-slate-500 mb-4">{{ plan.description }}</p>
            
            <div class="space-y-2 mb-6">
              @for (feature of plan.features; track feature) {
                <div class="flex items-center gap-2 text-sm text-slate-600">
                  <mat-icon class="text-emerald-500 text-sm">check_circle</mat-icon>
                  {{ feature }}
                </div>
              }
            </div>
            
            <div class="flex gap-2">
              <button (click)="editPlan(plan)"
                      class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                Editar
              </button>
              <button (click)="togglePlanStatus(plan)"
                      [class]="plan.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'"
                      class="px-4 py-2 border border-slate-200 rounded-lg transition-colors">
                {{ plan.is_active ? 'Desativar' : 'Ativar' }}
              </button>
            </div>
          </div>
        } @empty {
          <div class="col-span-3 text-center py-8 text-slate-400">
            Nenhum plano encontrado
          </div>
        }
      </div>
      
      <!-- Modal de Criar/Editar Plano -->
      @if (showModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 class="text-xl font-bold text-slate-900 mb-4">
              {{ editingPlan()?.id ? 'Editar Plano' : 'Criar Plano' }}
            </h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input type="text" [(ngModel)]="planForm.name"
                       class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea [(ngModel)]="planForm.description" rows="2"
                          class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"></textarea>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                <input type="number" [(ngModel)]="planForm.price" step="0.01"
                       class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Limite de Transações</label>
                <input type="number" [(ngModel)]="planForm.limits.transactions"
                       class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Limite de Contas</label>
                <input type="number" [(ngModel)]="planForm.limits.accounts"
                       class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Recursos (um por linha)</label>
                <textarea [(ngModel)]="featuresText" rows="4" placeholder="Recurso 1&#10;Recurso 2&#10;Recurso 3"
                          class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"></textarea>
              </div>
              
              <div class="flex items-center gap-2">
                <input type="checkbox" [(ngModel)]="planForm.is_active" id="isActive"
                       class="w-4 h-4 text-emerald-500 rounded">
                <label for="isActive" class="text-sm text-slate-700">Plano ativo</label>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="closeModal()"
                      class="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button (click)="savePlan()"
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
export class AdminPlansComponent implements OnInit {
  private adminService = inject(AdminService);
  
  plans = signal<Plan[]>([]);
  showModal = signal(false);
  editingPlan = signal<Plan | null>(null);
  
  planForm: any = {
    name: '',
    description: '',
    price: 0,
    features: [],
    limits: { transactions: 1000, accounts: 10 },
    is_active: true
  };
  featuresText = '';
  
  async ngOnInit() {
    await this.loadPlans();
  }
  
  async loadPlans() {
    this.plans.set(await this.adminService.getPlans());
  }
  
  openCreateModal() {
    this.editingPlan.set(null);
    this.planForm = {
      name: '',
      description: '',
      price: 0,
      features: [],
      limits: { transactions: 1000, accounts: 10 },
      is_active: true
    };
    this.featuresText = '';
    this.showModal.set(true);
  }
  
  editPlan(plan: Plan) {
    this.editingPlan.set(plan);
    this.planForm = {
      name: plan.name,
      description: plan.description,
      price: plan.price,
      features: plan.features,
      limits: { ...plan.limits },
      is_active: plan.is_active
    };
    this.featuresText = plan.features.join('\n');
    this.showModal.set(true);
  }
  
  closeModal() {
    this.showModal.set(false);
    this.editingPlan.set(null);
  }
  
  async savePlan() {
    const features = this.featuresText.split('\n').filter(f => f.trim());
    
    const planData = {
      ...this.planForm,
      features,
      limits: {
        transactions: Number(this.planForm.limits.transactions),
        accounts: Number(this.planForm.limits.accounts)
      }
    };
    
    let success: boolean;
    
    if (this.editingPlan()?.id) {
      success = await this.adminService.updatePlan(this.editingPlan()!.id, planData);
    } else {
      success = await this.adminService.createPlan(planData);
    }
    
    if (success) {
      await this.loadPlans();
      this.closeModal();
    }
  }
  
  async togglePlanStatus(plan: Plan) {
    const success = await this.adminService.updatePlan(plan.id, { is_active: !plan.is_active });
    if (success) {
      await this.loadPlans();
    }
  }
}
