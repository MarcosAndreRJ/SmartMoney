---
name: smartmoney-architecture
description: |
  Conhecimento arquitetural profundo do projeto SmartMoney.
  Contém padrões de componentes Angular, convenções de código, sistema de navegação,
  e guias de implementação de novas telas e features.
  Use sempre que criar ou alterar componentes, serviços, ou views neste projeto.
---

# SmartMoney — Guia de Arquitetura Frontend

## 🔑 Princípios Fundamentais

1. **Signals-first**: Todo estado reativo usa `signal()` e `computed()` — nunca `Subject/BehaviorSubject`
2. **Inline templates**: Todos os componentes têm `template: \`...\`` inline (sem arquivos `.html` separados)
3. **Standalone apenas**: `standalone: true` em todos os componentes — sem `NgModules`
4. **Tailwind para estilo**: Classes Tailwind diretas no HTML — sem arquivos `.css` por componente
5. **Injeção com `inject()`**: Sempre `private svc = inject(Service)` — nunca construtor

---

## 🧩 Como Criar um Novo Componente

### Template Padrão

```typescript
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-nome-feature',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto space-y-8 pb-20">
      <!-- Header -->
      <div class="flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Título</h1>
          <p class="text-slate-500 mt-1 font-medium">Descrição da tela.</p>
        </div>
        <button class="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
          <mat-icon class="text-lg">add</mat-icon>
          Nova Ação
        </button>
      </div>

      <!-- Loading -->
      @if (isLoading()) {
        <div class="flex items-center justify-center h-40 text-slate-400">
          <mat-icon class="animate-spin mr-2 text-3xl">refresh</mat-icon>
          <span class="font-medium">Carregando...</span>
        </div>
      } @else if (items().length === 0) {
        <!-- Empty State -->
        <div class="flex flex-col items-center justify-center h-56 gap-3 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <mat-icon class="text-[56px]">inbox</mat-icon>
          <p class="font-bold text-lg">Nenhum item encontrado</p>
        </div>
      } @else {
        <!-- Content -->
        @for (item of items(); track item.id) {
          <!-- item row -->
        }
      }
    </div>
  `
})
export class NomeFeatureComponent implements OnInit {
  private supabase = inject(SupabaseService);

  isLoading = signal(true);
  items = signal<any[]>([]);

  async ngOnInit() {
    await this.loadData();
  }

  private async loadData() {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.getItems();
      if (data && !error) this.items.set(data);
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

---

## 🗺️ Como Adicionar uma Nova View/Página

### Passo 1: NavigationService

```typescript
// k:/Trabalho/projetos/SmartMoney/src/app/core/services/navigation.service.ts
export type AppView = '...' | 'nova-view'; // ← adicionar aqui
```

### Passo 2: Sidebar

```typescript
// k:/Trabalho/projetos/SmartMoney/src/app/layout/sidebar.component.ts
navItems = [
  // outros itens...
  { id: 'nova-view', icon: 'icon_name', label: 'Label' }, // ← adicionar aqui
];
```

### Passo 3: App.ts

```typescript
// k:/Trabalho/projetos/SmartMoney/src/app/app.ts
import { NovaViewComponent } from './features/nova/nova-view.component'; // import

@Component({
  imports: [
    // ...
    NovaViewComponent, // ← adicionar no array
  ],
  template: `
    // ...
    } @else if (currentView() === 'nova-view') {
      <app-nova-view></app-nova-view>
    }
  `
})
```

---

## 🏨 Como Criar um Modal

```typescript
// Componente pai — controla abertura
selectedItem = signal<ItemType | null>(null);

// Template do pai
@if (selectedItem()) {
  <app-item-modal
    [item]="selectedItem()!"
    (close)="selectedItem.set(null)"
    (save)="onSave($event)">
  </app-item-modal>
}

// Componente modal
@Component({
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="close.emit()"></div>
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 class="text-lg font-extrabold text-slate-900">Título do Modal</h2>
          <button (click)="close.emit()" class="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors">
            <mat-icon class="text-[18px]">close</mat-icon>
          </button>
        </div>

        <!-- Content -->
        <div class="px-6 py-5 space-y-4">
          <!-- formulário -->
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button (click)="close.emit()" class="flex-1 h-11 border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50">
            Cancelar
          </button>
          <button (click)="onSubmit()" class="flex-1 h-11 bg-[#0F172A] text-white font-bold text-sm rounded-xl hover:bg-slate-800">
            Salvar
          </button>
        </div>
      </div>
    </div>
  `
})
export class ItemModalComponent {
  item = input.required<ItemType>();
  close = output<void>();
  save = output<ItemType>();
}
```

---

## ⚠️ Armadilhas Conhecidas (Anti-Patterns)

### 1. Pipe `currency` sem locale
```typescript
// ❌ ERRO — lança erro em runtime se locale pt-BR não registrado
{{ valor | currency:'BRL':'symbol':'1.2-2' }}

// ✅ CORRETO
R$ {{ valor | number:'1.2-2' }}
```

### 2. Pipe `date` com locale
```typescript
// ❌ ERRO
{{ data | date:'d MMM yyyy':'':'pt-BR' }}

// ✅ CORRETO — usar método TypeScript
formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
```

### 3. `searchQuery` como plain property em `computed()`
```typescript
// ❌ QUEBRA — Angular computed() só reage a Signals
searchQuery = '';
filteredItems = computed(() => items().filter(i => i.name.includes(this.searchQuery)));

// ✅ CORRETO
searchQuery = signal('');
filteredItems = computed(() => items().filter(i => i.name.includes(this.searchQuery())));
// Template: [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
```

### 4. `@for` sem `track`
```typescript
// ❌ ERRO — Angular 18+ exige track
@for (item of items()) { }

// ✅ CORRETO
@for (item of items(); track item.id) { }
```

### 5. Usar `ChangeDetectionStrategy.OnPush` sem Signals
```typescript
// ❌ PROBLEMA — mutations diretas não disparam CD com OnPush
this.items.push(newItem); // não atualiza view!

// ✅ CORRETO — sempre .set() or update()
this.items.update(list => [...list, newItem]);
```

---

## 🔧 Serviços Globais Disponíveis

### ToastService
```typescript
private toast = inject(ToastService);
this.toast.success('Salvo com sucesso!');
this.toast.error('Erro ao carregar.');
this.toast.info('Processando...');
```

### LoadingService
```typescript
private loading = inject(LoadingService);
this.loading.show('Carregando dados...');
this.loading.hide();
```

### PrivacyService
```typescript
private privacy = inject(PrivacyService);
isPrivate = this.privacy.isPrivate; // signal
// No template: {{ privacy.isPrivate() ? '***' : value }}
```

---

## 📐 Sistema de Grid/Layout

### Página padrão
```html
<div class="p-8 max-w-7xl mx-auto space-y-8 pb-20">
```

### Grid de cards (3 colunas)
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
```

### Card de resumo
```html
<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
  <div class="flex justify-between items-start mb-4">
    <h3 class="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Título</h3>
    <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
      <mat-icon class="text-[18px]">trending_up</mat-icon>
    </div>
  </div>
  <p class="text-2xl font-black text-emerald-600">R$ {{ valor | number:'1.2-2' }}</p>
  <p class="text-[10px] font-bold text-slate-400 mt-2">Texto auxiliar</p>
</div>
```

### Tabela / Lista de itens agrupados
```html
<div class="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-gray-50">
  @for (item of items(); track item.id) {
    <div class="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
      <!-- conteúdo -->
    </div>
  }
</div>
```
