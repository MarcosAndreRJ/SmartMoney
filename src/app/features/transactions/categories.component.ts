import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, MatIconModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="p-8 bg-[#F8FAFC] min-h-screen">
      <!-- Header Area -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Gerenciar Categorias</h1>
          <p class="text-slate-500 text-sm mt-1">Organize seus gastos e receitas por grupos.</p>
        </div>
        <button 
          (click)="openSidebar()"
          class="bg-[#0F172A] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
          <mat-icon class="text-lg">add</mat-icon>
          Adicionar Categoria
        </button>
      </div>

      <!-- Tabs & Grid -->
      <div class="flex gap-8 relative">
        <div class="flex-1">
          <!-- Navigation Tabs -->
          <div class="flex gap-8 border-b border-slate-200 mb-8">
            <button 
              (click)="activeTab.set('expense')"
              [class.border-[#0F172A]]="activeTab() === 'expense'"
              [class.text-slate-900]="activeTab() === 'expense'"
              [class.text-slate-400]="activeTab() !== 'expense'"
              class="pb-4 border-b-2 border-transparent font-bold text-sm transition-all">
              Despesas
            </button>
            <button 
              (click)="activeTab.set('income')"
              [class.border-[#0F172A]]="activeTab() === 'income'"
              [class.text-slate-900]="activeTab() === 'income'"
              [class.text-slate-400]="activeTab() !== 'income'"
              class="pb-4 border-b-2 border-transparent font-bold text-sm transition-all">
              Receitas
            </button>
          </div>

          <!-- Categories Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (cat of filteredCategories(); track cat.id) {
              <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <!-- Color Indicator -->
                <div 
                  class="absolute top-0 left-0 w-1.5 h-full"
                  [style.backgroundColor]="cat.color">
                </div>

                <div class="flex items-start justify-between mb-4">
                  <div 
                    class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                    [style.backgroundColor]="cat.color + '15'"
                    [style.color]="cat.color">
                    <mat-icon>{{ cat.icon }}</mat-icon>
                  </div>
                  <button 
                    (click)="deleteCategory(cat.id)"
                    class="text-slate-300 hover:text-red-500 transition-colors">
                    <mat-icon class="text-xl">delete_outline</mat-icon>
                  </button>
                </div>

                <h3 class="font-bold text-slate-900 text-lg mb-1">{{ cat.name }}</h3>
                <p class="text-slate-400 text-xs mb-4">
                  {{ cat.subcategories_count || 0 }} subcategorias
                </p>

                <div class="flex items-end justify-between">
                  <div>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gasto este mês</p>
                    <p class="font-bold text-slate-900">R$ {{ (cat.monthly_spending || 0) | number:'1.2-2' }}</p>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-500"
                    [style.width.%]="45"
                    [style.backgroundColor]="cat.color">
                  </div>
                </div>
              </div>
            }

            <!-- Add New Placeholder -->
            <button 
              (click)="openSidebar()"
              class="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-all group">
              <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <mat-icon>add</mat-icon>
              </div>
              <span class="font-bold text-sm">Nova Categoria</span>
            </button>
          </div>
        </div>

        <!-- Create Sidebar Overlay (Sticky on right) -->
        @if (isSidebarOpen()) {
          <div class="w-96 bg-white rounded-3xl border border-slate-100 shadow-2xl p-8 sticky top-8 h-fit animate-in slide-in-from-right duration-300 z-30 ml-4">
            <div class="flex justify-between items-center mb-8">
              <h2 class="text-xl font-bold text-slate-900">Nova Categoria</h2>
              <button (click)="closeSidebar()" class="text-slate-300 hover:text-slate-600">
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <!-- Type Toggle -->
            <div class="flex bg-slate-100 p-1 rounded-xl mb-8">
              <button 
                (click)="newCategory.update(v => ({...v, type: 'expense'}))"
                [class.bg-[#0F172A]]="newCategory().type === 'expense'"
                [class.text-white]="newCategory().type === 'expense'"
                [class.text-slate-500]="newCategory().type !== 'expense'"
                class="flex-1 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all">
                Despesa
              </button>
              <button 
                (click)="newCategory.update(v => ({...v, type: 'income'}))"
                [class.bg-[#0F172A]]="newCategory().type === 'income'"
                [class.text-white]="newCategory().type === 'income'"
                [class.text-slate-500]="newCategory().type !== 'income'"
                class="flex-1 py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all">
                Receita
              </button>
            </div>

            <div class="space-y-6">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nome da Categoria</label>
                <input 
                  type="text" 
                  [(ngModel)]="catName"
                  placeholder="Ex: Mercado, Aluguel..."
                  class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 transition-all outline-none">
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Categoria Pai (Opcional)</label>
                <select 
                  [(ngModel)]="parentId"
                  class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 appearance-none transition-all outline-none">
                  <option [ngValue]="null">Nenhuma (Categoria Principal)</option>
                  @for (c of categories(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ícone</label>
                <div class="grid grid-cols-5 gap-3">
                  @for (icon of availableIcons; track icon) {
                    <button 
                      (click)="selectedIcon.set(icon)"
                      [class.bg-slate-900]="selectedIcon() === icon"
                      [class.text-white]="selectedIcon() === icon"
                      [class.bg-slate-50]="selectedIcon() !== icon"
                      [class.text-slate-400]="selectedIcon() !== icon"
                      class="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all">
                      <mat-icon class="text-lg">{{ icon }}</mat-icon>
                    </button>
                  }
                </div>
              </div>

              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cor Identificadora</label>
                <div class="flex flex-wrap gap-3">
                  @for (color of availableColors; track color) {
                    <button 
                      (click)="selectedColor.set(color)"
                      [style.backgroundColor]="color"
                      class="w-6 h-6 rounded-full border-2 transition-all shadow-sm"
                      [class.border-slate-900]="selectedColor() === color"
                      [class.border-transparent]="selectedColor() !== color">
                    </button>
                  }
                </div>
              </div>

              <div class="pt-4 space-y-3">
                <button 
                  (click)="saveCategory()"
                  [disabled]="!catName()"
                  class="w-full bg-[#0F172A] text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all">
                  Criar Categoria
                </button>
                <button 
                  (click)="closeSidebar()"
                  class="w-full py-3 text-slate-500 font-bold text-sm hover:text-slate-800 transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class CategoriesComponent implements OnInit {
  private supabase = inject(SupabaseService);

  activeTab = signal<'expense' | 'income'>('expense');
  isSidebarOpen = signal(false);
  categories = signal<any[]>([]);

  // Form Fields as individual signals for easy ngModel binding
  catName = signal('');
  parentId = signal<string | null>(null);
  selectedIcon = signal('category');
  selectedColor = signal('#3b82f6');
  
  newCategory = signal({
    type: 'expense'
  });

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
    const { data, error } = await this.supabase.getCategories();
    if (data) {
      this.categories.set(data.map((c: any) => ({
        ...c,
        subcategories_count: c.subcategories?.[0]?.count || 0,
        monthly_spending: 0 
      })));
    }
  }

  openSidebar() {
    this.isSidebarOpen.set(true);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
    this.resetForm();
  }

  resetForm() {
    this.catName.set('');
    this.parentId.set(null);
    this.selectedIcon.set('category');
    this.selectedColor.set('#3b82f6');
  }

  async saveCategory() {
    const categoryData = {
      name: this.catName(),
      type: this.activeTab() as any,
      icon: this.selectedIcon(),
      color: this.selectedColor(),
      parent_id: this.parentId()
    };

    const { data, error } = await this.supabase.createCategory(categoryData);
    if (!error) {
      await this.loadCategories();
      this.closeSidebar();
    }
  }

  async deleteCategory(id: string) {
    if (confirm('Deseja realmente excluir esta categoria?')) {
      const { error } = await this.supabase.deleteCategory(id);
      if (!error) {
        await this.loadCategories();
      }
    }
  }
}
