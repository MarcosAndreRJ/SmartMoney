# Padrões e Convenções - SmartMoney

## Propósito

Este documento registra as convenções adotadas no código para que outra IA possa:
- Entender o estilo sem precisar ler tudo
- Contribuir seguindo padrões existentes
- Evitar reinventar a roda

---

## 1. Estrutura de Componentes (Angular)

### Standalone Components

Todos os componentes usam modo standalone:

```typescript
@Component({
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  selector: 'app-accounts-list',
  templateUrl: './accounts-list.component.html',
  styleUrl: './accounts-list.component.css'
})
export class AccountsListComponent {
  // ...
}
```

**Importação direta** — não há módulos Angular (NgModule), só imports nos componentes.

### Signals + RxJS

O projeto usa **sinais** para estado reativo local:

```typescript
export class DashboardComponent {
  private supabase = inject(SupabaseService);
  
  // Signal para estado
  summary = signal<DashboardSummary | null>(null);
  
  // Computed
  hasData = computed(() => this.summary() !== null);
  
  // Effect (raro)
  effect(() => {
    console.log('summary changed', this.summary());
  });
}
```

**Quando usar:**
- `signal()` — estado que muda com tempo
- `computed()` — derivado de signals
- `rxBehaviorSubject()` — apenas para streams complexas
- `effect()` — só para side effects (analytics, etc.)

### Injeção de Dependência

```typescript
export class AccountsListComponent {
  private supabase = inject(SupabaseService);
  private featureAccess = inject(FeatureAccessService);
  private toast = inject(ToastService);
  
  // ...
}
```

**Ordem sugerida:**
1. SupabaseService (dados)
2. Serviços de domínio (FeatureAccess, etc.)
3. Serviços utilitários (Toast, Loading)

---

## 2. Padrão de Services

### Service Layer

Cada domínio tem seu próprio service:

```
services/
├── supabase.service.ts      # DB acesso principal
├── billing.service.ts      # Billing/stripe
├── feature-access.service.ts # Feature flags
├── goal.service.ts        # Goals (separado do core)
├── investments.service.ts # Investments
├── import.service.ts      # Import batch
├── import-parser.service.ts # Parser XLSX
├── admin.service.ts      # Admin
├── recurring-scheduler.service.ts # Recorrências
└── [outros]
```

### Métodos de Service

**Padrão CRUD:**

```typescript
async getItems(): Promise<Item[]> { /* ... */ }
async createItem(data: Partial<Item>): Promise<Item> { /* ... */ }
async updateItem(id: string, data: Partial<Item>): Promise<Item> { /* ... */ }
async deleteItem(id: string): Promise<void> { /* ... */ }
```

**Assinatura padrão:**

```typescript
async busca(): Promise<{ data: T[], error: Error | null }> {
  const user = await this.supabase.getUser();
  if (!user) return { data: [], error: new Error('Not authenticated') };
  return await this.supabase.from('tabela').select('*').eq('user_id', user.id);
}
```

**Nota:** Todos os métodos retornam `{ data, error }` (estilo Supabase) ou throws exceptions.

---

## 3. Padrão de Componentes de Página

### Estrutura Típica

```typescript
@Component({
  standalone: true,
  imports: [CommonModule /* + material imports */],
  selector: 'app-accounts-list',
  templateUrl: './accounts-list.component.html',
  styleUrl: './accounts-list.component.css'
})
export class AccountsListComponent implements OnInit {
  // Dependências
  private supabase = inject(SupabaseService);
  
  // Estado
  accounts = signal<Account[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Lifecycle
  ngOnInit() {
    this.load();
  }
  
  // Ações
  async load() {
    this.loading.set(true);
    const { data } = await this.supabase.getAccounts();
    this.accounts.set(data || []);
    this.loading.set(false);
  }
  
  async create() { /* ... */ }
  async delete(id: string) { /* ... */ }
}
```

### Template

```html
<div class="page-container">
  <header class="page-header">
    <h1>Minhas Contas</h1>
    <button mat-raised-button color="primary" (click)="create()">
      + Nova Conta
    </button>
  </header>

  @if (loading()) {
    <app-loading-overlay />
  } @else {
    <div class="cards-grid">
      @for (account of accounts(); track account.id) {
        <app-account-card [account]="account"
          (edit)="edit($event)"
          (delete)="delete($event)" />
      } @empty {
        <p class="empty-state">Nenhuma conta ainda.</p>
      }
    </div>
  }
</div>
```

### Style

```css
:host {
  display: block;
}

.page-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
```

---

## 4. Padrão de Rotas

### Definição em app.routes.ts

```typescript
export const routes: Routes = [
  {
    path: 'accounts',
    component: AccountsListComponent,
    data: { title: 'Minhas Contas', pageId: PageId.ACCOUNTS }
  },
  // rotas filhas
  {
    path: 'account/:id',
    component: AccountDetailsComponent,
    data: { title: 'Detalhes da Conta' }
  }
];
```

### Rota com Parâmetro

```typescript
// Navegação
router.navigate(['/account', account.id]);

// Leitura no componente
private route = inject(ActivatedRoute);
id = this.route.snapshot.paramMap.get('id');
```

### Proteções (guards)

```typescript
{
  path: 'admin-users',
  component: AdminUsersComponent,
  canActivate: [adminGuard],
  data: { title: 'Gestão de Usuários' }
}
```

---

## 5. Padrão de HTML/Template

### Control Flow (@if, @for)

O projeto usa **novo control flow** do Angular 17+:

```html
@if (condition) {
  <div>_true</div>
} @else if (other) {
  <div>other</div>
} @else {
  <div>false</div>
}

@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
} @empty {
  <p>Nenhum item.</p>
}
```

**Não usar** `*ngIf`, `*ngFor` velhos, usar só novo `@control flow`.

### Two-way binding

```html
<input [ngModel]="value" (ngModelChange)="value = $event" />
<!-- ou -->
<input [(ngModel)]="value" />
```

### Eventos

```html
<button (click)="save()" [disabled]="saving()">Salvar</button>
```

---

## 6. Padrão de Estilo (CSS)

### Tailwind + Componentes

O projeto usa **Tailwind CSS** + alguns styles custom.

```html
<button class="btn btn-primary">
  <span class="btn-text">Salvar</span>
</button>
```

### CSS Componente

Para cada componente:

```css
/* accounts-list.component.css */
:host {
  display: block;
}

.page-container {
  /* estilos */
}
```

---

## 7. Padrão de Requisições ao Backend

### Consulta Base (Supabase SDK)

```typescript
async getAccounts() {
  const user = await this.getUser();
  if (!user) return { data: [], error: new Error('Not authenticated') };
  
  return await this.supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
}
```

### Inserção

```typescript
async createAccount(data: Partial<SupabaseAccount>) {
  const user = await this.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };
  
  return await this.supabase
    .from('accounts')
    .insert([{ ...data, user_id: user.id }])
    .select()
    .single(); // retorna apenas 1 registro
}
```

### Atualização

```typescript
async updateAccount(id: string, updates: Partial<SupabaseAccount>) {
  const user = await this.getUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };
  
  return await this.supabase
    .from('accounts')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id) // dupla validação
    .select()
    .single();
}
```

### Deleção

```typescript
async deleteAccount(id: string) {
  const user = await this.getUser();
  if (!user) return { error: new Error('Not authenticated') };
  
  return await this.supabase
    .from('accounts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
}
```

---

## 8. Padrão de Edge Functions

### Arquitetura

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validação de autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth');
    
    const token = authHeader.replace('Bearer ', '').trim();
    
    // Validação de entrada
    const { priceId } = await req.json();
    if (!priceId) throw new Error('priceId required');
    
    // Lógica
    // ...
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

### Chamada do Frontend

```typescript
const { data, error } = await supabase.functions.invoke('create-checkout', {
  body: { priceId },
  headers: { Authorization: `Bearer ${session.access_token}` }
});
```

---

## 9. Padrão de Models

### Interfaces

```typescript
// src/app/core/models/account.model.ts
export interface Account {
  id: string | number;
  name: string;
  type: string;
  balance: string;
  balanceLabel: string;
  details: string;
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
  badgeClass: string;
  color?: string;
  agencyNumber?: string;
  accountNumber?: string;
  cardName?: string;
  cardNumber?: string;
  cardExpiration?: string;
  cardCvv?: string;
}
```

### Tipos Supabase (DB)

```typescript
// No service
export interface SupabaseAccount {
  id: string;
  user_id: string;
  institution_name: string;
  account_type: string;
  initial_balance: number;
  credit_limit?: number;
  // ...
}
```

---

## 10. Padrão de Feature Access

### Serviço

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureAccessService {
  private billingService = inject(BillingService);

  async hasFeature(featureKey: string): Promise<boolean> {
    // Tenta dinámico
    try {
      const { resources } = await this.billingService.getUserPlan();
      if (resources && resources[featureKey] === true) {
        return true;
      }
    } catch (e) { /* fallback */ }

    // Fallback estático
    const activePlan = await this.billingService.getCurrentPlan();
    return PLAN_FEATURES[activePlan]?.includes(featureKey) ?? false;
  }
}
```

### Uso no Componente

```typescript
async ngOnInit() {
  const canUseGoals = await this.featureAccess.hasFeature('goals');
  if (!canUseGoals) {
    this.router.navigate(['/subscription']);
  }
}
```

---

## 11. Padrão de Parsing (Import)

### Parser (Client)

```typescript
async parseExcelFile(file: File): Promise<ImportItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      // mapear...
      resolve(items);
    };
    reader.readAsArrayBuffer(file);
  });
}
```

---

## 12. Nomenclatura de Arquivos

### Componentes

| Tipo | Padrão | Exemplo |
|------|-------|--------|
| Página | `<nome>.component.ts` | `dashboard.component.ts` |
| Lista | `<nome>-list.component.ts` | `accounts-list.component.ts` |
| Form | `<nome>-form.component.ts` | `account-form.component.ts` |
| Modal | `<nome>-modal.component.ts` | `confirm-modal.component.ts` |
| Page (lista) | `<nome>-page.component.ts` | `transactions-page.component.ts` |

### Services

`<nome>.service.ts` — sempre suffix `.service.ts`

### Models

`<nome>.model.ts` — sempre suffix `.model.ts`

### Interfaces

`<nome>.interface.ts` — usa `.interface.ts` para coleções de interfaces.

---

## 13. Testes

### Estrutura de Testes

O projeto usa **Vitest** + Angular Testkit.

```typescript
// transactions-page.component.spec.ts
import { describe, it, expect } from 'vitest';

describe('TransactionsPage', () => {
  it('should create', () => {
    // render + expect
  });
});
```

**Local:** `src/app/features/transactions/__tests__/`

---

## 14. Configurações de Ambiente

### Variáveis

| Variável | Onde Usar | Descrição |
|---------|----------|-----------|
| `SUPABASE_URL`, `SUPABASE_KEY` | `supabase.service.ts` (hardcoded) | DB endpoint |
| `STRIPE_SECRET_KEY` | Edge Functions (.env) | Stripe |
| `SERVICE_ROLE_KEY` | Edge Functions (.env) | Admin DB |
| `APP_URL` | Edge Functions | URL do app |

**Nota:** `SUPABASE_URL` e key estão **hardcoded** no service. Não usar `.env`.

---

## 15. Erros e Exceções

### Padrão de Erro

```typescript
try {
  const result = await operation();
  if (!result.data) throw result.error;
} catch (err) {
  const message = err instanceof Error ? err.message : 'Erro';
  this.toast.error(message);
}
```

### Toast Usage

```typescript
this.toast.success('Conta criada com sucesso!');
this.toast.error('Erro ao criar conta');
this.toast.info('Operação em andamento');
```

---

## 16. O Que Evitar

- **Não usar NgModules** — só standalone components
- **Não usar *ngIf/*ngFor velhos** — usar `@if/@for`
- **Não expor STRIPE_SECRET_KEY** — só em Edge Functions
- **Não fazer queries sem .eq('user_id', user.id)** — RLS depende
- **Não usar var** — usar `const`/`let` com types
- **Não usar `any`** sem reason — usar `unknown` ou criar interface
- **Não criar serviço sem entender escopo** — cada um com responsabilidade

---

## Resumo

| Padrão | Onde Aplicar |
|--------|-------------|
| Standalone + Signals | Componentes |
| Service Layer | Services |
| { data, error } return | Métodos de DB |
| @if/@for | Templates |
| Tailwind + CSS | Estilos |
| hasFeature() | Feature access |
| Edge Functions | Operações sensíveis |

---

**Fim da etapa 1.** Estes 5 documentos cobrem visão geral, arquitetura, estrutura, módulos e padrões.

Próxima etapa deve cobrir entidades, endpoints, triggers/procedures/views, regras de negócio identificadas.