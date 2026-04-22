import { Component, OnInit, inject, signal, computed, effect, Input } from '@angular/core';
import { DeleteConfirmModalComponent } from '../../shared/components/delete-confirm-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../core/services/supabase.service';
import { LoadingService } from '../../core/services/loading.service';
import { NavigationService } from '../../core/services/navigation.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-subcategories-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, DeleteConfirmModalComponent],
  template: `
  <div class="px-8 py-6 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans premium-layer-v2">
    <!-- Debug Marker -->
    <div style="display:none">DEBUG_REFACTOR_LOADED_V2</div>

    <!-- Breadcrumbs -->
    <nav class="flex items-center gap-2 mb-8 text-xs font-bold uppercase tracking-widest">
      <button (click)="goBack()" class="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-0 cursor-pointer">
        <mat-icon class="text-sm">arrow_back</mat-icon>
        Voltar para Categorias
      </button>
      <mat-icon class="text-slate-300 text-xs">chevron_right</mat-icon>
      <span class="text-slate-900">{{ currentParent()?.name || 'Carregando...' }}</span>
    </nav>

    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
      <div>
        <h1 class="text-[32px] font-extrabold tracking-tight text-slate-900 leading-tight">
          Subcategorias de {{ currentParent()?.name }}
        </h1>
        <p class="text-slate-400 text-sm mt-2 font-medium">Visualize e gerencie seus gastos específicos desta categoria.</p>
      </div>
      <button 
        (click)="openSidebar()"
        class="bg-[#0F172A] text-white px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 w-fit">
        <mat-icon class="text-lg">add_circle</mat-icon>
        Adicionar Subcategoria
      </button>
    </div>

    <!-- Summary Banner -->
    <div class="bg-[#0B1120] rounded-[32px] p-8 mb-12 relative overflow-hidden text-white shadow-2xl shadow-slate-200">
      <!-- Background Accents -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-slate-800/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
      <div class="absolute bottom-0 left-0 w-48 h-48 bg-slate-800/10 blur-[80px] rounded-full -ml-10 -mb-10"></div>

      <div class="relative flex flex-col lg:flex-row lg:items-center justify-between gap-12">
        <div class="flex items-center gap-10">
          <!-- Main Category Icon -->
          <div class="w-20 h-20 rounded-3xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 flex items-center justify-center shadow-2xl">
            <mat-icon class="text-[32px] w-[32px] h-[32px]" [style.color]="currentParent()?.color">{{ currentParent()?.icon }}</mat-icon>
          </div>

          <div class="flex gap-16">
            <!-- Total Spending Status -->
            <div class="space-y-1.5">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">TOTAL {{ currentParent()?.name }}</p>
              <h2 class="text-2xl font-bold tracking-tight">R$ {{ totalSpending() | number:'1.2-2' }}</h2>
            </div>

            <!-- Budget Limit -->
            <div class="space-y-1.5 border-l border-slate-700/50 pl-16">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">ORÇAMENTO DEFINIDO</p>
              <h2 class="text-2xl font-bold tracking-tight text-emerald-400">R$ {{ budgetLimit() | number:'1.2-2' }}</h2>
            </div>
          </div>
        </div>

        <!-- Budget Progress -->
        <div class="flex-1 lg:max-w-md space-y-4">
          <div class="flex justify-between items-end">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Progresso do Orçamento</p>
            <p class="text-sm font-bold text-white">{{ budgetPercentage() }}%</p>
          </div>
          <div class="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/30">
            <div 
              class="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              [style.width.%]="budgetPercentage()">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      @for (sub of subcategories(); track sub.id) {
        <div class="bg-white rounded-[32px] p-8 border border-slate-100/80 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group cursor-pointer relative flex flex-col">
          <!-- Edit button - appears on hover -->
          <button (click)="openEdit(sub)" class="absolute top-6 right-6 p-2 rounded-xl bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-900 transition-all border-none cursor-pointer">
            <mat-icon class="text-sm">edit</mat-icon>
          </button>

          <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 mb-8 transition-colors group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-lg group-hover:shadow-slate-200">
            <mat-icon class="text-2xl">{{ sub.icon }}</mat-icon>
          </div>

          <p class="text-slate-400 font-bold text-[11px] uppercase tracking-widest mb-1">{{ sub.name }}</p>
          <h3 class="text-2xl font-extrabold text-slate-900 mb-6 tracking-tight">R$ {{ sub.monthly_spending || 0 | number:'1.2-2' }}</h3>

          <div class="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
            <span class="text-[10px] font-bold text-slate-300 uppercase tracking-tight flex items-center gap-1.5">
              <mat-icon class="text-[14px] w-[14px] h-[14px]">update</mat-icon>
              Gasto mensal atual
            </span>
            <button (click)="deleteSub(sub.id); $event.stopPropagation()" class="p-1 text-slate-200 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer">
              <mat-icon class="text-lg">delete_outline</mat-icon>
            </button>
          </div>
        </div>
      }

      <!-- Add New Card -->
      <button 
        (click)="openSidebar()"
        class="bg-transparent border-2 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center group hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer min-h-[220px]">
        <div class="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-slate-900 shadow-sm mb-4 transition-all">
          <mat-icon>add</mat-icon>
        </div>
        <p class="text-slate-400 font-bold text-xs uppercase tracking-widest group-hover:text-slate-900">Nova Subcategoria</p>
      </button>
    </div>

    @if (showDeleteConfirm()) {
      <app-delete-confirm-modal
        title="Excluir Subcategoria"
        message="Deseja realmente excluir esta subcategoria? Esta ação não poderá ser desfeita."
        (confirm)="confirmDeleteSub()"
        (cancel)="cancelDeleteSub()">
      </app-delete-confirm-modal>
    }
  </div>
  `,
  styles: [`
    :host { display: block; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class SubcategoriesPageComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private loadingService = inject(LoadingService);
  private navigationService = inject(NavigationService);
  private route = inject(ActivatedRoute);

  @Input() initialParentId: string | null = null;

  subcategories = signal<any[]>([]);
  currentParent = signal<any>(null);
  
  budgetLimit = signal<number>(0);
  
  totalSpending = computed(() => {
    return this.subcategories().reduce((acc, sub) => acc + (sub.monthly_spending || 0), 0);
  });

  // Deletion state
  showDeleteConfirm = signal(false);
  subToDeleteId = signal<string | null>(null);

  budgetPercentage = computed(() => {
    const total = this.totalSpending();
    const budget = this.budgetLimit();
    if (budget === 0) return 0;
    return Math.min(Math.round((total / budget) * 100), 100);
  });

  private isInitialized = false;

  constructor() {
    // React to navigation signal changes (safe injection context)
    // The guard prevents a redundant second load during initial ngOnInit
    effect(() => {
      const navId = this.navigationService.selectedCategoryId();
      if (navId && this.isInitialized) {
        this.loadData(navId);
      }
    });
  }

  async ngOnInit() {
    await this.loadData();
    this.isInitialized = true;
  }

  async loadData(parentId?: string | null) {
    this.loadingService.show();
    try {
      // Priority: explicit arg > URL queryParam > Input > NavigationService signal
      const qp = this.route.snapshot.queryParamMap.get('categoryId');
      let id = parentId ?? qp ?? this.initialParentId ?? this.navigationService.selectedCategoryId() ?? null;

      if (!id) {
        console.warn('SubcategoriesPage: parentId not found via Input, NavigationService or queryParam');
        return;
      }

      // Fetch parent info
      const { data: parent, error: pError } = await this.supabase.client
        .from('categories')
        .select('*')
        .eq('id', id)
        .single();

      if (pError) throw pError;
      this.currentParent.set(parent);
      this.budgetLimit.set(parent.budget_limit || 0);

      // Fetch subcategories
      const { data: subs, error: subError } = await this.supabase.client
        .from('categories')
        .select('*')
        .eq('parent_id', id);

      if (subError) throw subError;
      this.subcategories.set(subs || []);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    } finally {
      this.loadingService.hide();
    }
  }

  goBack() {
    this.navigationService.navigateTo('categories');
  }

  openSidebar() {
    const categoryId = this.currentParent()?.id ?? this.initialParentId ?? this.navigationService.selectedCategoryId();
    this.navigationService.navigateTo('subcategory-form', { categoryId: categoryId! });
  }

  openEdit(sub: any) {
    const categoryId = this.currentParent()?.id ?? this.initialParentId ?? this.navigationService.selectedCategoryId();
    this.navigationService.navigateTo('subcategory-form', { 
      categoryId: categoryId!, 
      subcategoryId: sub.id 
    });
  }

  deleteSub(id: string) {
    this.subToDeleteId.set(id);
    this.showDeleteConfirm.set(true);
  }

  async confirmDeleteSub() {
    const id = this.subToDeleteId();
    if (!id) return;

    this.loadingService.show('Removendo...');
    try {
      const { error } = await this.supabase.client
        .from('categories')
        .delete()
        .eq('id', id);

      if (!error) {
        this.subcategories.update(subs => subs.filter(s => s.id !== id));
      }
    } finally {
      this.loadingService.hide();
      this.cancelDeleteSub();
    }
  }

  cancelDeleteSub() {
    this.showDeleteConfirm.set(false);
    this.subToDeleteId.set(null);
  }
}
