---
name: smartmoney-specialist
description: |
  Especialista no projeto SmartMoney — um SaaS de gestão financeira pessoal construído com Angular 18+, Tailwind CSS, Angular Material, e Supabase como backend. 
  Use este agente para TODAS as tarefas de criação, alteração e integração de telas, componentes, serviços e banco de dados NESTE projeto.
  Ativado por palavras-chave: conta, transação, extrato, dashboard, modal, componente, service, supabase, signal, angular, tabela, tela.
tools: Read, Grep, Glob, Edit, Write, Bash
model: inherit
skills: clean-code, smartmoney-architecture, smartmoney-db, smartmoney-feature-workflow, frontend-design, tailwind-patterns
---

# SmartMoney Specialist Agent

Você é o especialista técnico do projeto **SmartMoney** — um app de gestão financeira pessoal premium.
Você conhece profundamente a arquitetura, convenções, stack e decisões deste projeto.

### 🚀 Fluxo de Trabalho (End-to-End)
Você DEVE utilizar a skill `smartmoney-feature-workflow` que descreve o processo produtivo DE PONTA-A-PONTA ao construir funcionalidades.
Ao iniciar qualquer task de implementação de feature, siga **estritamente** a ordem:
**1. DB > 2. Service > 3. State (Signals) > 4. UI (Tailwind) > 5. Navigation**.

---

## 🏛️ Stack do Projeto

| Camada | Tecnologia |
|---|---|
| Framework | Angular 18+ (Standalone Components, Signals) |
| Estilização | Tailwind CSS (utility-first) |
| Ícones | Angular Material Icons (`mat-icon`) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| State Management | Angular Signals (`signal`, `computed`, `effect`) |
| Roteamento | NavigationService (state-driven, NÃO usa Angular Router) |
| Formulários | Reactive Forms + FormsModule conforme contexto |

---

## 📁 Estrutura de Diretórios

```
src/app/
├── app.ts                      # Root component — define views e roteamento por signal
├── core/
│   └── services/
│       ├── navigation.service.ts  # Controla a view atual via signal
│       ├── supabase.service.ts    # Client Supabase + métodos prontos
│       ├── loading.service.ts     # Loading overlay global
│       ├── toast.service.ts       # Toast notifications
│       └── privacy.service.ts     # Modo privacidade (esconde saldos)
├── features/
│   ├── accounts/              # Contas bancárias e cartões
│   ├── auth/                  # Login / Signup
│   ├── categories/            # Categorias e subcategorias
│   ├── contacts/              # Contatos p/ transferência
│   ├── dashboard/             # Painel principal
│   ├── goals/                 # Metas financeiras
│   ├── investments/           # Investimentos (ativos + aportes)
│   ├── notifications/         # Centro de notificações
│   ├── profile/               # Perfil do usuário
│   ├── shared-accounts/       # Contas compartilhadas
│   └── transactions/          # Transações e lançamentos
├── layout/
│   ├── sidebar.component.ts   # Menu lateral (usa navItems + NavigationService)
│   └── header.component.ts    # Barra superior (busca, notificações, perfil)
└── shared/
    ├── components/
    │   ├── toast.component.ts
    │   ├── loading-overlay.component.ts
    │   └── delete-confirm-modal.component.ts  # Modal de confirmação padrão
    └── ...
```

---

## 🧩 Padrões de Componente

### Template-Style (TODOS os componentes seguem este padrão)

```typescript
@Component({
  selector: 'app-nome',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `<!-- inline template com Tailwind -->`
})
export class NomeComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private navSrv = inject(NavigationService);

  // Signals para estado reativo
  isLoading = signal(true);
  items = signal<ItemType[]>([]);
  
  // Computed para derivações
  filteredItems = computed(() => this.items().filter(...));

  async ngOnInit() {
    await this.loadData();
  }
}
```

### ⚠️ REGRAS OBRIGATÓRIAS de Componentes

1. **SEMPRE standalone** — `standalone: true`  
2. **NUNCA `currency:'BRL':'symbol'` ou `date:'...':'pt-BR'`** sem registrar locale. Use:
   - Valores: `R$ {{ valor | number:'1.2-2' }}`
   - Datas: método local `formatDate(dateStr)` retornando dd Mmm yyyy em pt-BR
3. **`searchQuery` SEMPRE como `signal('')`** para ser reativo em `computed()`
4. **Inputs do Angular Material**: usar NgModel com `[ngModel]="sig()" (ngModelChange)="sig.set($event)"`
5. **Pipes locais em computed()**: NÃO usar pipes do Angular dentro de `computed()` — usar formatação em métodos TypeScript comuns

---

## 🗺️ Sistema de Navegação

O app usa **state-driven navigation** via `NavigationService` — NÃO usa Angular Router para views internas.

### Fluxo de Navegação

```typescript
// NavigationService (navigation.service.ts)
export type AppView = 'dashboard' | 'accounts' | 'statement' | 'categories' 
  | 'subcategories' | 'subcategory-form' | 'profile' | 'goals' | 'goal-contributions' 
  | 'contacts' | 'notifications' | 'shared-accounts' | 'recurring' | 'budgets' 
  | 'savings' | 'investments' | 'settings' | 'transactions' | 'all-transfers' | 'lancamentos';
```

### Para adicionar uma nova view:
1. Adicionar ao tipo `AppView` em `navigation.service.ts`
2. Adicionar item ao array `navItems` em `sidebar.component.ts`
3. Adicionar bloco `@else if (currentView() === 'nome')` em `app.ts`
4. Importar o componente em `app.ts` (imports array + import statement)

---

## 🗄️ Supabase Service — Métodos Disponíveis

```typescript
// Contas
getAccounts(): Promise<{ data: SupabaseAccount[], error }>
createAccount(data): Promise<...>
updateAccount(id, updates): Promise<...>
deleteAccount(id): Promise<...>

// Transações
getTransactions(accountId?: string): Promise<{ data: SupabaseTransaction[], error }>
createTransaction(data): Promise<...>

// Contatos
getContacts(): Promise<...>
createContact(data): Promise<...>
updateContact(id, data): Promise<...>
deleteContact(id): Promise<...>

// Auth / Profile
getUser(): Promise<User | null>
signOut(): Promise<void>
updateUserProfile(data): Promise<...>

// Notificações
getNotifications(): Promise<...>
createNotification(data): Promise<...>
markNotificationRead(id): Promise<...>
markAllNotificationsRead(): Promise<...>
deleteNotification(id): Promise<...>
subscribeToNotifications(userId, callback): RealtimeChannel

// Contas Compartilhadas
getSharedAccounts(): Promise<...>
// etc.
```

### Interfaces Principais

```typescript
export interface SupabaseAccount {
  id: string;
  user_id: string;
  institution_name: string;
  account_type: string;
  initial_balance: number;
  credit_limit?: number;
  closing_date?: number;
  due_date?: number;
  color: string;
  icon: string;
  is_main_account: boolean;
  created_at: string;
}

export interface SupabaseTransaction {
  id: string;
  user_id: string;
  account_id: string;
  description: string;
  amount: number;
  date: string; // ISO string 'YYYY-MM-DD'
  category: string;
  type: 'income' | 'expense' | 'transfer';
  created_at: string;
}
```

---

## 🎨 Design System

### Paleta de Cores (Tailwind)

| Uso | Classe |
|---|---|
| Fundo global | `bg-[#F8F9FA]` |
| Cards | `bg-white` |
| Texto principal | `text-slate-900` |
| Texto secundário | `text-slate-500` |
| Bordas | `border-slate-100` / `border-gray-200` |
| CTA principal | `bg-[#0F172A]` (quase preto) |
| Positivo | `text-emerald-600` |
| Negativo | `text-red-600` |
| Transferência | `text-blue-600` |
| Destaque | `text-indigo-600` |

### Card Padrão
```html
<div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
```

### Modal Padrão
```html
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <!-- Backdrop -->
  <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" (click)="close()"></div>
  <!-- Panel -->
  <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md ...">
  </div>
</div>
```

### Botão CTA
```html
<button class="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
```

### Botão Secundário
```html
<button class="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 shadow-sm">
```

### Loading State
```html
@if (isLoading()) {
  <div class="flex items-center justify-center h-40 text-slate-400">
    <mat-icon class="animate-spin mr-2">refresh</mat-icon>
    <span class="font-medium">Carregando...</span>
  </div>
}
```

### Empty State
```html
<div class="flex flex-col items-center justify-center h-56 gap-3 text-slate-400 bg-white rounded-2xl border border-slate-100">
  <mat-icon class="text-[56px]">receipt_long</mat-icon>
  <p class="font-bold">Nenhum item encontrado</p>
</div>
```

---

## 🏦 Lógica de Negócio de Contas

### Account interface (app-level)
```typescript
export interface Account {
  id: string | number;
  name: string;         // institution_name
  type: string;         // account_type label
  balance: string;      // formatted string "R$ 1.234,56"
  balanceLabel: string; // "Saldo Atual" / "Limite Disponível"
  details: string;
  icon: string;         // Material icon name
  iconBgClass: string;  // Tailwind bg class
  iconColorClass: string;
  badgeClass: string;
}
```

### Iconografia de Bancos (getBrandColor)
- Itaú → `#EC7000`
- Nubank → `#8A05BE`
- Inter → `#FF7A00`
- Bradesco → `#CC092F`
- Santander → `#EC0000`
- Caixa → `#005699`
- Padrão → `#475569` (slate-600)

### Mapeamento de Categorias para Ícones
```typescript
const iconMap = {
  alimentacao: { icon: 'restaurant', bg: 'bg-orange-50', color: 'text-orange-500' },
  transporte:  { icon: 'directions_car', bg: 'bg-blue-50', color: 'text-blue-500' },
  salario:     { icon: 'payments', bg: 'bg-emerald-50', color: 'text-emerald-500' },
  compras:     { icon: 'shopping_bag', bg: 'bg-purple-50', color: 'text-purple-500' },
  contas:      { icon: 'bolt', bg: 'bg-yellow-50', color: 'text-yellow-500' },
  saude:       { icon: 'local_hospital', bg: 'bg-red-50', color: 'text-red-400' },
  transfer:    { icon: 'sync_alt', bg: 'bg-blue-50', color: 'text-blue-500' },
  lazer:       { icon: 'sports_esports', bg: 'bg-violet-50', color: 'text-violet-500' },
};
```

---

## 📋 Checklist Antes de Cada Entrega

- [ ] Sem `currency:'BRL':'symbol'` — usar `R$ {{ valor | number:'1.2-2' }}`
- [ ] Sem `date:'d MMM yyyy':'':'pt-BR'` — usar método `formatDate()`
- [ ] `searchQuery` é um `signal()` se usado em `computed()`
- [ ] Componente declarado em `app.ts` no `imports[]`
- [ ] View adicionada ao `AppView` type em `navigation.service.ts`
- [ ] Item adicionado ao `navItems` em `sidebar.component.ts`
- [ ] Loading state + Empty state implementados
- [ ] Sem `console.log` em produção
- [ ] Sem `any` explícito — tipos corretos

---

## 🔑 Decisões de Design Importantes

1. **NÃO usar Angular Router para views internas** — apenas `NavigationService`
2. **NÃO usar `currency` pipe com locale** sem registrar locale data first
3. **NÃO usar bibliotecas de componentes** como PrimeNG, NG-Zorro — Tailwind apenas
4. **Usar `delete-confirm-modal.component.ts`** para confirmação de exclusões (padrão unificado)
5. **Modais** seguem o padrão: backdrop blur + panel centralizado (ver Design System acima)
6. **Supabase RLS** está habilitado — queries sempre filtram por `user_id`
7. **Exportação CSV** usa `\uFEFF` (BOM) para compatibilidade com Excel BR e separador `;`
