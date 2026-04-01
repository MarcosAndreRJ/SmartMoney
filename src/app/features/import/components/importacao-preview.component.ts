import { Component, EventEmitter, Input, Output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImportItem, ImportStatus, ImportType } from '../../../core/models/import.interface';
import { SupabaseAccount } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-importacao-preview',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <!-- Header & Destination -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
        <div class="space-y-1">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Confirme os Lançamentos</h3>
          <p class="text-sm text-slate-500">Selecione o destino e revise os dados antes de importar.</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 min-w-[300px]">
          <div class="flex-1 space-y-1.5">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Tipo de Destino</label>
            <select 
              [(ngModel)]="selectedType" 
              (ngModelChange)="onTypeChange()"
              class="w-full h-11 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium transition-all"
            >
              <option [value]="ImportType.TRANSACTION">Conta Bancária</option>
              <option [value]="ImportType.CARD">Cartão de Crédito</option>
            </select>
          </div>

          <div class="flex-1 space-y-1.5">
            <label class="text-xs font-bold uppercase tracking-wider text-slate-400">Selecionar {{ selectedType === ImportType.TRANSACTION ? 'Conta' : 'Cartão' }}</label>
            <select 
              [(ngModel)]="selectedTargetId" 
              class="w-full h-11 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium transition-all"
            >
              <option *ngFor="let target of filteredTargets" [value]="target.id">
                {{ target.institution_name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Preview Table -->
      <div class="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50/50 dark:bg-slate-800/50">
              <tr>
                <th class="p-4 w-12">
                  <div class="relative flex items-center">
                    <input 
                      type="checkbox" 
                      [checked]="isAllSelected" 
                      (change)="toggleAll()"
                      class="peer h-5 w-5 appearance-none rounded-md border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-emerald-500 checked:border-emerald-500 transition-all duration-200 cursor-pointer"
                    >
                    <span class="material-symbols-rounded absolute text-white text-xs opacity-0 peer-checked:opacity-100 pointer-events-none left-1">check</span>
                  </div>
                </th>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                <th class="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                <th class="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr 
                *ngFor="let item of items" 
                class="group hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors"
                [class.opacity-50]="!item.selected"
              >
                <td class="p-4">
                  <div class="relative flex items-center">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="item.selected"
                      (change)="checkSelection()"
                      [disabled]="item.status === ImportStatus.INVALID"
                      class="peer h-5 w-5 appearance-none rounded-md border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-emerald-500 checked:border-emerald-500 transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                    <span class="material-symbols-rounded absolute text-white text-xs opacity-0 peer-checked:opacity-100 pointer-events-none left-1">check</span>
                  </div>
                </td>
                <td class="p-4">
                  <div [ngSwitch]="item.status">
                    <span *ngSwitchCase="ImportStatus.VALID" class="flex items-center text-emerald-500 p-1.5 rounded-lg bg-emerald-500/10 w-fit">
                      <span class="material-symbols-rounded text-lg">check_circle</span>
                    </span>
                    <span *ngSwitchCase="ImportStatus.WARNING" class="flex items-center text-orange-500 p-1.5 rounded-lg bg-orange-500/10 w-fit" [title]="item.errors.join(', ')">
                      <span class="material-symbols-rounded text-lg">warning</span>
                    </span>
                    <span *ngSwitchCase="ImportStatus.INVALID" class="flex items-center text-red-500 p-1.5 rounded-lg bg-red-500/10 w-fit" [title]="item.errors.join(', ')">
                      <span class="material-symbols-rounded text-lg">error</span>
                    </span>
                  </div>
                </td>
                <td class="p-4 text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{{ item.date | date:'dd/MM/yyyy' }}</td>
                <td class="p-4 text-sm font-semibold text-slate-900 dark:text-white capitalize">{{ item.description }}</td>
                <td class="p-4">
                  <div class="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl w-fit group-hover:border-emerald-500/50 transition-colors">
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">{{ item.category || 'Selecionar' }}</span>
                    <span class="material-symbols-rounded text-sm text-slate-400 group-hover:text-emerald-500 transition-colors">expand_more</span>
                  </div>
                </td>
                <td class="p-4 text-sm font-bold text-right" [class]="item.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'">
                  {{ item.type === 'expense' ? '-' : '+' }} {{ item.amount | currency:'BRL' }}
                </td>
                <td class="p-4">
                  <button class="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 transition-all">
                    <span class="material-symbols-rounded text-lg">delete</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-900 text-white p-6 rounded-3xl shadow-2xl transition-all duration-300">
        <div class="flex items-center space-x-8">
          <div class="space-y-1">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Selecionado</span>
            <div class="text-2xl font-black text-white">{{ selectedBalance | currency:'BRL' }}</div>
          </div>
          <div class="h-10 w-px bg-slate-800"></div>
          <div class="space-y-1">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Lançamentos</span>
            <div class="text-2xl font-black text-white">{{ selectedCount }} <span class="text-sm font-medium text-slate-500">de {{ items.length }}</span></div>
          </div>
        </div>

        <div class="flex items-center gap-4 w-full sm:w-auto">
          <button 
            (click)="cancel.emit()"
            class="flex-1 sm:flex-none px-6 py-3.5 h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold transition-all"
          >
            Voltar
          </button>
          <button 
            (click)="confirmImport()"
            [disabled]="!selectedTargetId || selectedCount === 0"
            class="flex-[2] sm:flex-none px-8 py-3.5 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 font-bold text-slate-950 flex items-center justify-center space-x-2 transition-all"
          >
            <span class="material-symbols-rounded">check_circle</span>
            <span>Importar Agora</span>
          </button>
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
    const typeStr = this.selectedType === ImportType.TRANSACTION ? 'checking' : 'credit_card';
    const list = this.accounts.filter(a => {
      // Logic for checking/savings vs credit_card
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

  onTypeChange() {
    this.selectedTargetId = '';
    const list = this.filteredTargets;
    if (list.length > 0) {
      this.selectedTargetId = list[0].id;
    }
  }

  toggleAll() {
    const target = !this.isAllSelected;
    this.items.forEach(i => {
      if (i.status !== ImportStatus.INVALID) i.selected = target;
    });
  }

  checkSelection() {
    // Handled by Signal computed equivalent in get syntax
  }

  confirmImport() {
    if (this.selectedTargetId && this.selectedCount > 0) {
      this.confirm.emit({
        items: this.items,
        type: this.selectedType,
        targetId: this.selectedTargetId
      });
    }
  }
}
