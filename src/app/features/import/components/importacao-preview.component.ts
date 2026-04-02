import { Component, EventEmitter, Input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ImportItem, ImportStatus, ImportType } from '../../../core/models/import.interface';
import { SupabaseAccount } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-importacao-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <!-- Header -->
      <div class="mb-2">
        <h2 class="text-2xl font-black text-slate-900 mb-2">Prévia da Importação</h2>
        <p class="text-sm text-slate-500">Revise os dados detectados antes de confirmar a importação.</p>
      </div>

      <!-- Account Selector (Top of Table) -->
      <div class="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div class="flex-1">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Importar para</label>
          <div class="flex gap-3">
            <button 
              (click)="selectedType = ImportType.TRANSACTION"
              class="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              [class.bg-emerald-500]="selectedType === ImportType.TRANSACTION"
              [class.text-white]="selectedType === ImportType.TRANSACTION"
              [class.bg-slate-100]="selectedType !== ImportType.TRANSACTION"
              [class.text-slate-600]="selectedType !== ImportType.TRANSACTION"
            >
              Conta Bancária
            </button>
            <button 
              (click)="selectedType = ImportType.CARD"
              class="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              [class.bg-emerald-500]="selectedType === ImportType.CARD"
              [class.text-white]="selectedType === ImportType.CARD"
              [class.bg-slate-100]="selectedType !== ImportType.CARD"
              [class.text-slate-600]="selectedType !== ImportType.CARD"
            >
              Cartão de Crédito
            </button>
          </div>
        </div>
        <div class="flex-1">
          <label class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Selecione a {{ selectedType === ImportType.TRANSACTION ? 'conta' : 'cartão' }}</label>
          <select 
            [(ngModel)]="selectedTargetId" 
            class="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
          >
            @for (target of filteredTargets; track target.id) {
              <option [value]="target.id">{{ target.institution_name }}</option>
            }
          </select>
        </div>
      </div>

      <!-- Preview Table -->
      <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50">
              <tr>
                <th class="p-4 w-12 text-center">
                  <div class="relative flex items-center justify-center mx-auto w-5 h-5">
                    <input 
                      type="checkbox" 
                      [checked]="isAllSelected" 
                      (change)="toggleAll()"
                      class="peer absolute inset-0 appearance-none rounded-md border-2 border-slate-200 bg-white checked:bg-emerald-500 checked:border-emerald-500 transition-all duration-300 cursor-pointer hover:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                    >
                    <mat-icon class="text-white text-[14px] h-auto w-auto leading-none opacity-0 peer-checked:opacity-100 pointer-events-none z-10 transition-all duration-300">check</mat-icon>
                  </div>
                </th>
                <th class="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th class="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th class="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                <th class="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Categoria</th>
                <th class="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                <th class="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              @for (item of items; track $index) {
                <tr 
                  class="group hover:bg-slate-50 transition-colors"
                  [class.opacity-50]="!item.selected"
                >
                  <td class="p-4 text-center">
                    <div class="relative flex items-center justify-center mx-auto w-5 h-5">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="item.selected"
                        (change)="checkSelection()"
                        [disabled]="item.status === ImportStatus.INVALID"
                        class="peer absolute inset-0 appearance-none rounded-md border-2 border-slate-200 bg-white checked:bg-emerald-500 checked:border-emerald-500 transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                      >
                      <mat-icon class="text-white text-[14px] h-auto w-auto leading-none opacity-0 peer-checked:opacity-100 pointer-events-none z-10 transition-all duration-300">check</mat-icon>
                    </div>
                  </td>
                  <td class="p-4">
                    @switch (item.status) {
                      @case (ImportStatus.VALID) {
                        <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <mat-icon class="text-emerald-600 text-lg">check</mat-icon>
                        </div>
                      }
                      @case (ImportStatus.WARNING) {
                        <div class="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center" [title]="item.errors.join(', ')">
                          <mat-icon class="text-orange-600 text-lg">warning</mat-icon>
                        </div>
                      }
                      @case (ImportStatus.INVALID) {
                        <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center" [title]="item.errors.join(', ')">
                          <mat-icon class="text-red-600 text-lg">error</mat-icon>
                        </div>
                      }
                    }
                  </td>
                  <td class="p-4 text-sm font-medium text-slate-600 whitespace-nowrap">{{ item.date | date:'dd/MM/yyyy' }}</td>
                  <td class="p-4 text-sm font-semibold text-slate-800 capitalize">{{ item.description }}</td>
                  <td class="p-4">
                    <span class="px-3 py-1.5 rounded-full text-xs font-bold" [class]="getCategoryClass(item.category)">
                      {{ item.category || 'Sem categoria' }}
                    </span>
                  </td>
                  <td class="p-4 text-sm font-bold text-right whitespace-nowrap" [class]="item.type === 'income' ? 'text-emerald-600' : 'text-slate-800'">
                    {{ item.type === 'expense' ? '- ' : '+ ' }}R$ {{ item.amount | number:'1.2-2' }}
                  </td>
                  <td class="p-4">
                    <button class="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all">
                      <mat-icon class="text-lg">delete</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Bar (Summary) -->
      <div class="bg-white rounded-3xl shadow-xl shadow-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="flex items-center gap-8">
          <div class="space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Lançamentos</span>
            <div class="text-2xl font-black text-slate-900">{{ selectedCount }}</div>
          </div>
          <div class="h-10 w-px bg-slate-200"></div>
          <div class="space-y-1">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Total</span>
            <div class="text-2xl font-black text-slate-900 whitespace-nowrap">R$ {{ selectedBalance | number:'1.2-2' }}</div>
          </div>
        </div>

        <div class="flex items-center gap-4 w-full md:w-auto">
          <button 
            (click)="cancel.emit()"
            class="flex-1 md:flex-none px-6 py-3.5 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all"
          >
            Cancelar
          </button>
          <button 
            (click)="confirmImport()"
            [disabled]="!selectedTargetId || selectedCount === 0"
            class="flex-[2] md:flex-none px-8 py-3.5 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 transition-all"
          >
            <mat-icon>check_circle</mat-icon>
            Confirmar Importação
          </button>
        </div>
      </div>

      <!-- Footer Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Card 1: Categorização -->
        <div class="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <mat-icon class="text-purple-600">auto_awesome</mat-icon>
            </div>
            <h4 class="text-sm font-bold text-slate-900">Categorização Automática</h4>
          </div>
          <p class="text-xs text-slate-500 leading-relaxed">
            Identificamos {{ categorizedCount() }} categorias a partir das descrições dos lançamentos.
          </p>
        </div>

        <!-- Card 2: Segurança -->
        <div class="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <mat-icon class="text-blue-600">shield</mat-icon>
            </div>
            <h4 class="text-sm font-bold text-slate-900">Segurança na Importação</h4>
          </div>
          <p class="text-xs text-slate-500 leading-relaxed">
            Seus dados são processados localmente com criptografia. Nenhuma informação sensível é armazenada em nossos servidores.
          </p>
        </div>

        <!-- Card 3: Impacto no Fluxo -->
        <div class="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <mat-icon class="text-emerald-600">trending_up</mat-icon>
            </div>
            <h4 class="text-sm font-bold text-slate-900">Impacto no Fluxo de Caixa</h4>
          </div>
          <p class="text-xs text-slate-500 leading-relaxed">
            @if (selectedBalance >= 0) {
              Esta importação adicionará <span class="text-emerald-600 font-bold">R$ {{ selectedBalance | number:'1.2-2' }}</span> ao seu saldo.
            } @else {
              Esta importação representa uma despesa de <span class="text-red-500 font-bold">R$ {{ selectedBalance | number:'1.2-2' }}</span>.
            }
          </p>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
  `]
})
export class ImportacaoPreviewComponent {
  @Input() items: ImportItem[] = [];
  @Input() accounts: SupabaseAccount[] = [];
  
  @Output() confirm = new EventEmitter<{ items: ImportItem[], type: ImportType, targetId: string }>();
  @Output() cancel = new EventEmitter<void>();

  ImportType = ImportType;
  ImportStatus = ImportStatus;

  selectedType = ImportType.TRANSACTION;
  selectedTargetId = '';

  get filteredTargets() {
    const list = this.accounts.filter(a => {
      if (this.selectedType === ImportType.TRANSACTION) {
        return a.account_type !== 'credit_card';
      }
      return a.account_type === 'credit_card';
    });

    if (list.length > 0 && !this.selectedTargetId) {
      this.selectedTargetId = list[0].id;
    }
    return list;
  }

  get selectedCount() {
    return this.items.filter(i => i.selected).length;
  }

  get selectedBalance() {
    return this.items
      .filter(i => i.selected)
      .reduce((sum, i) => sum + (i.type === 'income' ? i.amount : -i.amount), 0);
  }

  get isAllSelected() {
    return this.items.length > 0 && this.items.every(i => i.selected || i.status === ImportStatus.INVALID);
  }

  categorizedCount() {
    const categories = new Set(this.items.filter(i => i.selected && i.category).map(i => i.category));
    return categories.size;
  }

  toggleAll() {
    const target = !this.isAllSelected;
    this.items.forEach(i => {
      if (i.status !== ImportStatus.INVALID) i.selected = target;
    });
  }

  checkSelection() {}

  confirmImport() {
    if (this.selectedTargetId && this.selectedCount > 0) {
      this.confirm.emit({
        items: this.items,
        type: this.selectedType,
        targetId: this.selectedTargetId
      });
    }
  }

  getCategoryClass(category: string): string {
    const catLower = (category || '').toLowerCase();
    const colors: Record<string, string> = {
      alimentacao: 'bg-orange-100 text-orange-700',
      alimentação: 'bg-orange-100 text-orange-700',
      comida: 'bg-orange-100 text-orange-700',
      transporte: 'bg-blue-100 text-blue-700',
      transport: 'bg-blue-100 text-blue-700',
      salario: 'bg-emerald-100 text-emerald-700',
      salary: 'bg-emerald-100 text-emerald-700',
      renda: 'bg-emerald-100 text-emerald-700',
      receita: 'bg-emerald-100 text-emerald-700',
      shopping: 'bg-purple-100 text-purple-700',
      utilities: 'bg-yellow-100 text-yellow-700',
      contas: 'bg-yellow-100 text-yellow-700',
      luz: 'bg-yellow-100 text-yellow-700',
      agua: 'bg-blue-100 text-blue-700',
      internet: 'bg-indigo-100 text-indigo-700',
      saude: 'bg-red-100 text-red-700',
      saúde: 'bg-red-100 text-red-700',
      ocio: 'bg-pink-100 text-pink-700',
      lazer: 'bg-pink-100 text-pink-700',
    };
    return colors[catLower] || 'bg-slate-100 text-slate-600';
  }
}