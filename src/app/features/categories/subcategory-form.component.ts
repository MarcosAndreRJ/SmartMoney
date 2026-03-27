import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ResultModalComponent } from '../../shared/components/result-modal.component';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';
import { NavigationService } from '../../core/services/navigation.service';

@Component({
  selector: 'app-subcategory-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, ResultModalComponent],
  template: `
    <div class="px-8 py-6 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      
      <!-- Result Modal -->
      @if (showResult()) {
        <app-result-modal 
          [isSuccess]="resultSuccess()"
          [message]="resultMessage()"
          (confirm)="onResultConfirm()">
        </app-result-modal>
      }

      <!-- Breadcrumbs -->
      <nav class="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest text-slate-400">
        <span class="hover:text-slate-600 cursor-pointer" (click)="goBackToCategories()">Gerenciar Categorias</span>
        <mat-icon class="text-xs">chevron_right</mat-icon>
        <span class="hover:text-slate-600 cursor-pointer" (click)="goBackToSubcategories()">{{ parentName() }}</span>
        <mat-icon class="text-xs">chevron_right</mat-icon>
        <span class="text-slate-900">{{ isEditing() ? 'Editar' : 'Nova' }} Subcategoria</span>
      </nav>

      <!-- Header Section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 class="text-[32px] font-extrabold tracking-tight text-slate-900 leading-tight">
            {{ isEditing() ? 'Editar' : 'Registrar' }} Subcategoria
          </h1>
          <p class="text-slate-400 text-sm mt-2 font-medium">Organize seus gastos de forma detalhada e personalizada.</p>
        </div>
        <button 
          (click)="goBackToSubcategories()"
          class="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
          <mat-icon class="text-lg">arrow_back</mat-icon>
          Voltar
        </button>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-[32px] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 max-w-4xl mx-auto">
        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-10">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Subcategory Name -->
            <div class="space-y-3">
              <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nome da Subcategoria</label>
              <input 
                type="text" 
                formControlName="name"
                placeholder="Ex: Restaurantes, Supermercado..."
                class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#0F172A] transition-all outline-none placeholder:text-slate-300 font-medium text-slate-900">
            </div>

            <!-- Parent Category -->
            <div class="space-y-3">
              <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Categoria Pai</label>
              <div class="relative">
                <select 
                  formControlName="parent_id"
                  class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#0F172A] appearance-none transition-all outline-none font-medium text-slate-600 cursor-not-allowed">
                  <option [value]="parentId()">{{ parentName() }}</option>
                </select>
                <mat-icon class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</mat-icon>
              </div>
            </div>
          </div>

          <!-- Icon Picker -->
          <div class="space-y-4">
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Escolha um Ícone</label>
            <div class="flex flex-wrap gap-4">
              @for (icon of availableIcons; track icon) {
                <button 
                  type="button"
                  (click)="form.patchValue({ icon: icon })"
                  [class.bg-[#10B981]]="form.get('icon')?.value === icon"
                  [class.text-white]="form.get('icon')?.value === icon"
                  [class.bg-slate-50]="form.get('icon')?.value !== icon"
                  [class.text-slate-400]="form.get('icon')?.value !== icon"
                  [class.border-emerald-500]="form.get('icon')?.value === icon"
                  class="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all border border-transparent shadow-sm outline-none">
                  <mat-icon class="text-xl">{{ icon }}</mat-icon>
                </button>
              }
              <button type="button" class="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all border border-transparent shadow-sm outline-none">
                <mat-icon class="text-xl">more_horiz</mat-icon>
              </button>
            </div>
          </div>

          <!-- Color Picker -->
          <div class="space-y-4">
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Escolha uma Cor</label>
            <div class="flex flex-wrap gap-4">
              @for (color of availableColors; track color) {
                <button 
                  type="button"
                  (click)="form.patchValue({ color: color })"
                  [style.backgroundColor]="color"
                  class="w-10 h-10 rounded-full border-4 transition-all shadow-sm"
                  [class.border-slate-900]="form.get('color')?.value === color"
                  [class.border-transparent]="form.get('color')?.value !== color">
                </button>
              }
            </div>
          </div>

          <!-- Budget Limit -->
          <div class="space-y-3">
            <label class="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Limite Mensal de Gastos (Opcional)</label>
            <div class="relative max-w-xs">
              <span class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
              <input 
                type="number" 
                formControlName="budget_limit"
                placeholder="0,00"
                class="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm focus:ring-2 focus:ring-[#0F172A] transition-all outline-none placeholder:text-slate-300 font-bold text-slate-900">
            </div>
            <p class="text-[10px] text-slate-400 font-medium">Você receberá alertas ao atingir 80% e 100% deste limite.</p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-6 pt-6 border-t border-slate-50">
            <button 
              type="button"
              (click)="goBackToSubcategories()"
              class="text-slate-400 font-bold text-sm hover:text-slate-900 transition-colors">
              Cancelar
            </button>
            <button 
              type="submit"
              [disabled]="form.invalid"
              class="bg-[#10B981] text-white px-10 py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-100 hover:bg-emerald-600 disabled:opacity-50 transition-all transform active:scale-95">
              {{ isEditing() ? 'Salvar Alterações' : 'Salvar Subcategoria' }}
            </button>
          </div>

        </form>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class SubcategoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private loadingService = inject(LoadingService);
  private navigationService = inject(NavigationService);

  parentId = signal<string | null>(null);
  subcategoryId = signal<string | null>(null);
  parentName = signal<string>('Carregando...');
  isEditing = signal<boolean>(false);

  // Result Modal State
  showResult = signal(false);
  resultSuccess = signal(true);
  resultMessage = signal('');

  form = this.fb.group({
    name: ['', [Validators.required]],
    parent_id: [{ value: '', disabled: true }, [Validators.required]],
    icon: ['category', [Validators.required]],
    color: ['#10B981', [Validators.required]],
    budget_limit: [0]
  });

  availableIcons = [
    'restaurant', 'shopping_cart', 'directions_car', 'home', 'add_circle',
    'school', 'open_in_full', 'photo_camera', 'airplanemode_active'
  ];

  availableColors = [
    '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#F59E0B', '#0F172A'
  ];

  async ngOnInit() {
    this.parentId.set(this.navigationService.selectedCategoryId());
    this.subcategoryId.set(this.navigationService.selectedSubcategoryId());

    if (!this.parentId()) {
      alert('Selecione uma categoria principal primeiro.');
      this.goBackToCategories();
      return;
    }

    await this.loadParentData();

    if (this.subcategoryId()) {
      this.isEditing.set(true);
      await this.loadSubcategoryData();
    } else {
      this.form.patchValue({ parent_id: this.parentId()! });
    }
  }

  async loadParentData() {
    try {
      const { data, error } = await this.supabase.client
        .from('categories')
        .select('name')
        .eq('id', this.parentId())
        .single();
      
      if (error) throw error;
      this.parentName.set(data.name);
    } catch (err) {
      console.error('Error loading parent category:', err);
    }
  }

  async loadSubcategoryData() {
    this.loadingService.show();
    try {
      const { data, error } = await this.supabase.client
        .from('categories')
        .select('*')
        .eq('id', this.subcategoryId())
        .single();
      
      if (error) throw error;
      
      this.form.patchValue({
        name: data.name,
        parent_id: data.parent_id,
        icon: data.icon,
        color: data.color,
        budget_limit: data.budget_limit
      });
    } catch (err) {
      console.error('Error loading subcategory:', err);
    } finally {
      this.loadingService.hide();
    }
  }

  async save() {
    if (this.form.invalid) return;

    this.loadingService.show(this.isEditing() ? 'Atualizando...' : 'Salvando...');
    try {
      const formData = this.form.getRawValue();
      const payload = {
        name: formData.name,
        parent_id: formData.parent_id,
        icon: formData.icon,
        color: formData.color,
        budget_limit: formData.budget_limit,
        type: 'expense', // Subcategories are usually expenses, or same as parent
        user_id: (await this.supabase.client.auth.getUser()).data.user?.id
      };

      if (this.isEditing()) {
        const { error } = await this.supabase.client
          .from('categories')
          .update(payload)
          .eq('id', this.subcategoryId());
        if (error) throw error;
      } else {
        const { error } = await this.supabase.client
          .from('categories')
          .insert(payload);
        if (error) throw error;
      }

      this.resultSuccess.set(true);
      this.resultMessage.set('As informações foram atualizadas e salvas no sistema com êxito.');
      this.showResult.set(true);
    } catch (err: any) {
      console.error('Error saving subcategory:', err);
      this.resultSuccess.set(false);
      this.resultMessage.set(err.message || 'Ocorreu um erro inesperado ao salvar os dados.');
      this.showResult.set(true);
    } finally {
      this.loadingService.hide();
    }
  }

  onResultConfirm() {
    this.showResult.set(false);
    if (this.resultSuccess()) {
      this.goBackToSubcategories();
    }
  }

  goBackToCategories() {
    this.navigationService.navigateTo('categories');
  }

  goBackToSubcategories() {
    this.navigationService.navigateTo('subcategories', { categoryId: this.parentId()! });
  }
}
