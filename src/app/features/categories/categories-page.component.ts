import { Component, OnInit, inject, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../core/services/supabase.service';
import { Category, CategoryWithStats } from '../../core/models/category.model';
import { LoadingService } from '../../core/services/loading.service';
import { NavigationService } from '../../core/services/navigation.service';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="p-8 bg-[#F8FAFC] min-h-screen text-slate-900">
      <!-- Header Area -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">Gerenciar Categorias</h1>
          <p class="text-slate-500 text-sm mt-1 font-medium">Organize seus gastos e receitas por grupos.</p>
        </div>
        <button 
          (click)="openSidebar()"
          class="bg-[#0F172A] text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
          <mat-icon class="text-lg">add</mat-icon>
          Adicionar Categoria
        </button>
      </div>

      <!-- Main Layout -->
      <div class="flex gap-8 relative">
        <div class="flex-1">
          <!-- Navigation Tabs -->
          <div class="flex gap-8 border-b border-slate-200 mb-8">
            <button 
              (click)="activeTab.set('expense')"
              [class.border-[#0F172A]]="activeTab() === 'expense'"
              [class.text-slate-900]="activeTab() === 'expense'"
              [class.text-slate-400]="activeTab() !== 'expense'"
              class="pb-4 border-b-2 border-transparent font-bold text-sm transition-all outline-none">
              Despesas
            </button>
            <button 
              (click)="activeTab.set('income')"
              [class.border-[#0F172A]]="activeTab() === 'income'"
              [class.text-slate-900]="activeTab() === 'income'"
              [class.text-slate-400]="activeTab() !== 'income'"
              class="pb-4 border-b-2 border-transparent font-bold text-sm transition-all outline-none">
              Receitas
            </button>
          </div>

          <!-- Categories Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (cat of filteredCategories(); track cat.id) {
              <div class="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <!-- Color Indicator -->
                <div 
                  class="absolute top-0 left-0 w-1.5 h-full"
                  [style.backgroundColor]="cat.color">
                </div>

                <div class="flex items-start justify-between mb-6">
                  <div 
                    class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                    [style.backgroundColor]="cat.color + '15'"
                    [style.color]="cat.color">
                    <mat-icon class="text-2xl">{{ cat.icon }}</mat-icon>
                  </div>
                  <button 
                    (click)="deleteCategory(cat.id)"
                    class="text-slate-300 hover:text-red-500 transition-colors">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>

                <h3 class="font-bold text-xl mb-1 tracking-tight">{{ cat.name }}</h3>
                
                <!-- Open Subcategories Page -->
                <button 
                  (click)="viewSubcategories(cat.id)"
                  class="text-slate-400 text-xs font-bold mb-6 hover:text-[#0F172A] transition-colors flex items-center gap-1 group/link">
                  <span>{{ cat.subcategories_count || 0 }} subcategorias</span>
                  <mat-icon class="text-sm opacity-0 group-hover/link:opacity-100 transition-opacity">chevron_right</mat-icon>
                </button>

                <div class="flex items-end justify-between">
                  <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gasto este mês</p>
                    <p class="font-bold text-lg text-slate-900">R$ {{ (cat.monthly_spending || 0) | number:'1.2-2' }} <span class="text-[10px] text-slate-400 normal-case ml-1 font-medium">este mês</span></p>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="mt-5 h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-700"
                    [style.width.%]="getProgressBarWidth(cat)"
                    [style.backgroundColor]="cat.color">
                  </div>
                </div>
              </div>
            }

            <!-- Add New Placeholder Card -->
            <button 
              (click)="openSidebar()"
              class="border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-all group min-h-[220px]">
              <div class="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform text-slate-400">
                <mat-icon class="text-3xl">add</mat-icon>
              </div>
              <span class="font-bold text-base">Nova Categoria</span>
            </button>
          </div>
        </div>

        <!-- Right Side Panel (Sidebar Form) -->
        @if (isSidebarOpen()) {
          <div class="fixed top-0 right-0 h-full w-[400px] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.05)] p-10 animate-in slide-in-from-right duration-500 z-[100] flex flex-col text-slate-900">
            <div class="flex justify-between items-center mb-10">
              <h2 class="text-2xl font-bold tracking-tight">{{ editingCategoryId() ? 'Editar Categoria' : 'Nova Categoria' }}</h2>
              <button (click)="closeSidebar()" class="text-slate-300 hover:text-slate-600 transition-colors">
                <mat-icon class="text-2xl">close</mat-icon>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto no-scrollbar pr-2 -mr-2">
              <div class="flex bg-slate-100 p-1.5 rounded-2xl mb-10">
                <button 
                  (click)="formType.set('expense')"
                  [class.bg-[#0F172A]]="formType() === 'expense'"
                  [class.text-white]="formType() === 'expense'"
                  [class.text-slate-500]="formType() !== 'expense'"
                  class="flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm">
                  Despesa
                </button>
                <button 
                  (click)="formType.set('income')"
                  [class.bg-[#0F172A]]="formType() === 'income'"
                  [class.text-white]="formType() === 'income'"
                  [class.text-slate-500]="formType() !== 'income'"
                  class="flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all">
                  Receita
                </button>
              </div>

              <div class="space-y-8">
                <!-- Name Input -->
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Nome da Categoria</label>
                  <input 
                    type="text" 
                    [(ngModel)]="formName"
                    placeholder="Ex: Mercado, Aluguel..."
                    class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#0F172A] transition-all outline-none placeholder:text-slate-300 font-medium text-slate-900">
                </div>

                <!-- Parent Selection -->
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Categoria Pai (Opcional)</label>
                  <div class="relative text-slate-900">
                    <select 
                      [(ngModel)]="formParentId"
                      class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#0F172A] appearance-none transition-all outline-none font-medium text-slate-600">
                      <option [ngValue]="null">Nenhuma (Categoria Principal)</option>
                      @for (c of categories(); track c.id) {
                        <option [value]="c.id">{{ c.name }}</option>
                      }
                    </select>
                    <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
                  </div>
                </div>

                <!-- Icon Picker -->
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 text-slate-900">Ícone</label>
                  <div class="grid grid-cols-5 gap-3">
                    @for (icon of availableIcons; track icon) {
                      <button 
                        (click)="formIcon.set(icon)"
                        [class.bg-[#0F172A]]="formIcon() === icon"
                        [class.text-white]="formIcon() === icon"
                        [class.bg-slate-50]="formIcon() !== icon"
                        [class.text-slate-400]="formIcon() !== icon"
                        class="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all shadow-sm border-none outline-none">
                        <mat-icon class="text-xl">{{ icon }}</mat-icon>
                      </button>
                    }
                  </div>
                </div>

                <!-- Color Picker -->
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Cor Identificadora</label>
                  <div class="flex flex-wrap gap-4">
                    @for (color of availableColors; track color) {
                      <button 
                        (click)="formColor.set(color)"
                        [style.backgroundColor]="color"
                        class="w-8 h-8 rounded-full border-4 transition-all shadow-sm"
                        [class.border-slate-900]="formColor() === color"
                        [class.border-transparent]="formColor() !== color">
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Actions -->
            <div class="pt-8 mt-auto space-y-4 bg-white border-t border-slate-50">
              <button 
                (click)="saveCategory()"
                [disabled]="!formName"
                class="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-bold text-base shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all transform active:scale-[0.98]">
                {{ editingCategoryId() ? 'Salvar Alterações' : 'Criar Categoria' }}
              </button>
              <button 
                (click)="closeSidebar()"
                class="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-800 transition-all underline underline-offset-8 decoration-slate-200">
                Cancelar
              </button>
            </div>
          </div>

          <!-- Backdrop -->
          <div class="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[90]" (click)="closeSidebar()"></div>
        }
      </div>
    </div>
  `
})
export class CategoriesPageComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private loadingSrv = inject(LoadingService);
  private navSrv = inject(NavigationService);

  @Output() changeView = new EventEmitter<{ view: string, parentId?: string }>();

  activeTab = signal<'expense' | 'income'>('expense');
  isSidebarOpen = signal(false);
  categories = signal<any[]>([]);

  formName = '';
  formType = signal<'expense' | 'income'>('expense');
  formParentId = null;
  formIcon = signal('category');
  formColor = signal('#10B981');
  editingCategoryId = signal<string | null>(null);

  filteredCategories = computed(() =>
    this.categories().filter(c => c.type === this.activeTab())
  );

  availableIcons = [
    'shopping_cart', 'restaurant', 'flight', 'directions_car', 'home',
    'pets', 'school', 'build', 'redeem', 'category'
  ];

  availableColors = [
    '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'
  ];

  async ngOnInit() {
    await this.loadCategories();
  }

  async loadCategories() {
    this.loadingSrv.show('Carregando categorias...');
    try {
      const { data, error } = await this.supabase.getCategories();

      if (error) {
        console.error('Supabase getCategories error:', error);
        alert('Erro ao carregar do Supabase: ' + error.message);
      }

      if (data) {
        this.categories.set(data.map((c: any) => ({
          ...c,
          subcategories_count: c.subcategories?.[0]?.count || 0,
          monthly_spending: 0
        })));
      }
    } finally {
      this.loadingSrv.hide();
    }
  }

  viewSubcategories(parentId: string) {
    this.navSrv.navigateTo('subcategories', { categoryId: parentId });
  }

  editCategory(cat: any) {
    this.editingCategoryId.set(cat.id);
    this.formName = cat.name;
    this.formType.set(cat.type);
    this.formParentId = cat.parent_id || null;
    this.formIcon.set(cat.icon);
    this.formColor.set(cat.color);
    this.isSidebarOpen.set(true);
  }

  getProgressBarWidth(cat: any): number {
    const spending = cat.monthly_spending || 0;
    if (spending <= 0) return 0;
    // Sem um limite/orçamento definido no banco, 
    // a barra visualiza o saldo limitando a preencher em gastos altíssimos,
    // ou usamos um limite arbitrário visual de R$ 5000 para refletir progressão.
    return Math.min(100, Math.max(5, (spending / 5000) * 100));
  }

  openSidebar() {
    this.isSidebarOpen.set(true);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
    this.resetForm();
  }

  resetForm() {
    this.formName = '';
    this.formParentId = null;
    this.formIcon.set('category');
    this.formColor.set('#10B981');
    this.formType.set(this.activeTab());
    this.editingCategoryId.set(null);
  }

  async saveCategory() {
    this.loadingSrv.show('Salvando categoria...');
    try {
      const categoryData = {
        name: this.formName,
        type: this.formType(),
        icon: this.formIcon(),
        color: this.formColor(),
        parent_id: this.formParentId
      };

      if (this.editingCategoryId()) {
        const { error } = await this.supabase.updateCategory(this.editingCategoryId()!, categoryData);
        if (!error) {
          await this.loadCategories();
          this.closeSidebar();
        } else {
          alert('Erro ao atualizar categoria: ' + error.message);
        }
      } else {
        const { error } = await this.supabase.createCategory(categoryData);
        if (!error) {
          await this.loadCategories();
          this.closeSidebar();
        } else {
          alert('Erro ao criar categoria: ' + error.message);
        }
      }
    } finally {
      this.loadingSrv.hide();
    }
  }

  async deleteCategory(id: string) {
    if (confirm('Deseja realmente excluir esta categoria?')) {
      this.loadingSrv.show('Removendo...');
      try {
        const { error } = await this.supabase.deleteCategory(id);
        if (!error) {
          await this.loadCategories();
        }
      } finally {
        this.loadingSrv.hide();
      }
    }
  }
}
