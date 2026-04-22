# Frontend / Interface - SmartMoney

## Visão Geral

O frontend é uma aplicação Angular 21 standalone com UI em Angular Material + Tailwind CSS. Este documento cobre a estrutura de interface, bibliotecas, padrões visuais e considerações de manutenção.

---

## 1. Stack de Interface

### 1.1 Bibliotecas UI

| Biblioteca | Versão | Uso |
|------------|-------|-----|
| @angular/core | 21.x | Framework principal |
| @angular/material | 21.x | Componentes Material |
| @angular/cdk | 21.x | Utilitários CDK |
| tailwindcss | 4.x | Utilitários CSS |
| motion | 12.x | Animações |

### 1.2 Componentes Material Usados

| Componente | Uso no App |
|-----------|----------|
| MatButton | Botões (primary, accent, warn) |
| MatCard | Cards de contas, metas |
| MatDialog | Modais (criar, editar, confirmar) |
| MatTable | Listas (transações, categorias) |
| MatPaginator | Paginação |
| MatFormField | Inputs com labels |
| MatInput | Campos de texto |
| MatSelect | Dropdowns |
| MatDatepicker | Datas |
| MatCheckbox | Checkboxes |
| MatRadio | Radio buttons |
| MatSlideToggle | Toggle switches |
| MatSnackBar | Notificações (toasts) |
| MatProgressSpinner | Loading spinner |
| MatProgressBar | Progress bars |
| MatSidenav | Layout responsivo |
| MatToolbar | Toolbar |
| MatIcon | Ícones |
| MatList | Listas de navegação |
| MatMenu | Menus dropdown |
| MatTabs | Tabs |
| MatTooltip | Tooltips |
| MatRipple | Efeito ripple |

---

## 2. Layout Geral

### 2.1 Estrutura de Página

```
┌─────────────────────────────────────────┐
│ Header (toolbar)                         │
├────────────┬────────────────────────────┤
│           │                         │
│ Sidebar   │  Conteúdo principal    │
│ (sidenav) │  (page-container)    │
│           │                         │
│           │                         │
└───────────┴─────────────────────────┘
```

### 2.2 Header

**Arquivo:** `src/app/layout/header.component.ts`

- Logo + título
- Menu do usuário (avatar dropdown)
- Notificações (badge)
- Logout

### 2.3 Sidebar

**Arquivo:** `src/app/layout/sidebar.component.ts`

- Navegação principal
- Itens por módulo
- Collapse/expand
- Badge de notificações

---

## 3. Páginas e Componentes

### 3.1 Dashboard

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| DashboardComponent | dashboard.component.ts | Resumo financeiro |

**Áreas:**
- Stats cards (saldo, gastos, Loans)
- Credit cards summary
- Goals progress
- Category spending
- Recent transactions
- Heritage evolution chart

### 3.2 Accounts

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| AccountsListComponent | accounts-list.component.ts | Lista de contas |
| AccountFormComponent | account-form.component.ts | Criar/editar |
| AccountDetailsModalComponent | account-details-modal.component.ts | Detalhes |
| AccountStatementComponent | account-statement.component.ts | Extrato |

**Templates:**
- Cards grid (ex: 3 colunas)
- Form em modal ou página
- Extrato com filtros

### 3.3 Transactions

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| TransactionsPageComponent | transactions-page.component.ts | Lista mensal |
| TransactionFormComponent | transaction-form.component.ts | Criar transação |
| TransfersComponent | transfers.component.ts | Transferências |
| AllTransfersComponent | all-transfers.component.ts | Todas transfers |
| RecurringTransactionsComponent | recurring-transactions.component.ts | Recorrências |

**Templates:**
- Tabela com paginação
- Filtros por data, tipo, categoria
- Form batch (recurring)

### 3.4 Goals

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| GoalsComponent | goals.component.ts | Lista de metas |
| GoalModalComponent | goal-modal.component.ts | Criar/editar |
| GoalContributionsPageComponent | goal-contributions-page.component.ts | Aportes |
| ContributionModalComponent | contribution-modal.component.ts | Registrar aporte |
| GoalDetailsModalComponent | goal-details-modal.component.ts | Detalhes + progresso |

### 3.5 Investments

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| InvestmentsComponent | investments.component.ts | Portfólio |
| InvestmentFormComponent | investment-form.component.ts | Criar/editar |
| InvestmentContributionComponent | investment-contribution.component.ts | Aporte |

### 3.6 Loans

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| LoansPageComponent | loans-page.component.ts | Lista de empréstimos |

### 3.7 Credit Cards

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| CreditCardsPageComponent | credit-cards-page.component.ts | Lista de cartões |

### 3.8 Categories

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| CategoriesPageComponent | categories-page.component.ts | Categorias |
| SubcategoriesPageComponent | subcategories-page.component.ts | Subcategorias |
| SubcategoryFormComponent | subcategory-form.component.ts | Criar subcategoria |

### 3.9 Import

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| ImportacaoPageComponent | importacao-page.component.ts | Página principal |
| ImportacaoUploadComponent | importacao-upload.component.ts | Upload de arquivo |
| ImportacaoPreviewComponent | importacao-preview.component.ts | Preview de dados |

### 3.10 Subscription

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| SubscriptionPageComponent | subscription-page.component.ts | Gestão de plano |
| SubscriptionCheckoutComponent | subscription-checkout.component.ts | Checkout |
| SubscriptionStatusComponent | subscription-status.component.ts | Status |

### 3.11 Admin

| Componente | Arquivo | Funcionalidade |
|-----------|--------|-------------|
| AdminDashboardComponent | admin-dashboard.component.ts | Dashboard admin |
| AdminUsersComponent | admin-users-list.component.ts | Lista usuários |
| AdminPlansComponent | admin-plans.component.ts | CRUD planos |
| AdminSubscriptionsComponent | admin-subscriptions.component.ts | Lista assinaturas |
| AdminTransactionsComponent | admin-transactions.component.ts | Busca transações |
| AdminNotificationsComponent | admin-notifications.component.ts | Enviar notificação |

---

## 4. Componentes Reusáveis

### 4.1 Modais

| Componente | Arquivo | Uso |
|-----------|--------|-----|
| ConfirmModalComponent | confirm-modal.component.ts | Confirmação genérica |
| DeleteConfirmModalComponent | delete-confirm-modal.component.ts | Confirma delete |
| ResultModalComponent | result-modal.component.ts | Resultado de operação |
| LoadingOverlayComponent | loading-overlay.component.ts | Overlay de loading |

### 4.2 Feedback

| Serviço | Arquivo | Uso |
|---------|--------|-----|
| ToastService | toast.service.ts | Notificações toast |
| LoadingService | loading.service.ts | Loading global |

---

## 5. Padrões de Interface

### 5.1 Estrutura de Página

```html
<div class="page-container">
  <header class="page-header">
    <h1>{{ título }}</h1>
    <button mat-raised-button color="primary">
      + Novo
    </button>
  </header>

  @if (loading()) {
    <app-loading-overlay />
  } @else {
    <div class="page-content">
      <!-- conteúdo -->
    </div>
  }
</div>
```

### 5.2 Card de Entidade

```html
<mat-card class="entity-card">
  <mat-card-header>
    <mat-card-title>{{ name }}</mat-card-title>
    <mat-card-subtitle>{{ type }}</mat-card-subtitle>
  </mat-card-header>
  <mat-card-content>
    <p>{{ balance | currency }}</p>
  </mat-card-content>
  <mat-card-actions>
    <button mat-button>Editar</button>
    <button mat-button>Excluir</button>
  </mat-card-actions>
</mat-card>
```

### 5.3 Formulário

```html
<form [formGroup]="form" (ngSubmit)="save()">
  <mat-form-field appearance="outline">
    <mat-label>Nome</mat-label>
    <input matInput formControlName="name">
    <mat-error *ngIf="hasError('name', 'required')">
      Obrigatório
    </mat-error>
  </mat-form-field>

  <button mat-raised-button color="primary" type="submit"
    [disabled]="form.invalid || saving()">
    Salvar
  </button>
</form>
```

### 5.4 Tabela

```html
<table mat-table [dataSource]="dataSource">
  <ng-container matColumnDef="date">
    <th mat-header-cell *matHeaderCellDef>Data</th>
    <td mat-cell *matCellDef="let row">{{ row.date | date }}</td>
  </ng-container>

  <ng-container matColumnDef="amount">
    <th mat-header-cell *matHeaderCellDef>Valor</th>
    <td mat-cell *matCellDef="let row">
      {{ row.amount | currency }}
    </td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
</table>

<mat-paginator [pageSizeOptions]="[10, 25, 100]"></mat-paginator>
```

---

## 6. Estilo Visual

### 6.1 Cores

O app usa cores do tema Material:

```
primary: #1976d2 (blue)
accent: #ff4081 (pink)
warn: #f44336 (red)
```

Plus cores customizadas em algumas entidades.

### 6.2 Tailwind CSS

Tailwind usados para:
- Layouts flex/grid
- Spacing
- Typography
- Cores custom

### 6.3 CSS Componente

Cada componente tem seu próprio CSS:

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
```

---

## 7. Responsividade

### 7.1 Breakpoints

- Mobile: < 600px
- Tablet: 600px - 959px
- Desktop: ≥ 960px

### 7.2 Sidebar

Sidebar colapsa em mobile (hamburger menu).

### 7.3 Tables

Tables usam paginator em telas pequenas.

---

## 8. Animações

### 8.1 motion library

Usado para transições sutis:

```typescript
import { animate } from 'motion';

animate(element, { opacity: 0 }, { duration: 0.3 });
```

### 8.2 Angular Animations

Também disponível:

```typescript
@Component({
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-10px)', opacity: 0 }),
        animate('300ms ease-out')
      ])
    ])
  ]
})
```

---

## 9. Validações de Interface

### 9.1 Form Validation

| Validador | Uso |
|----------|-----|
| required | Campo obrigatório |
| email | Email válido |
| minLength | Mínimo N caracteres |
| maxLength | Máximo N caracteres |
| pattern | Regex |
| custom | Função específica |

### 9.2 Feedback de Erro

```html
<mat-form-field>
  <input matInput formControlName="email">
  <mat-error *ngIf="hasError('email', 'required')">
    Email é obrigatório
  </mat-error>
  <mat-error *ngIf="hasError('email', 'email')">
    Email inválido
  </mat-error>
</mat-form-field>
```

---

## 10. Acessibilidade

### 10.1 ARIA

- Labels em botões
- Tags semânticas (nav, main, section)
- Roles quando necessário

### 10.2 Keyboard

- Tab navigation
- Enter para submit
- Escape para fechar modais

---

## 11. Risco de Manutenção

### 11.1 Frágil

| Item | Risco | Mitigação |
|------|-------|----------|
| Hardcoded URLs | Mudar todas as instâncias | Variáveis de ambiente |
| Cores em strings | Inconsistência | Design tokens |
| CSS inline | Dificuldade manutenção | Tailwind ou tokens |

### 11.2 Pontos de Atenção

| Item | Problema |
|------|----------|
| Many *ngIf/*ngFor velhos | Migrar para @if/@for |
| Any type | TypeScript strict |
| Repetição de código (modais) | Componente genérico |

---

## 12. Considerações para Evolução

### 12.1 Novos Componentes

1. Criar em `src/app/features/<modulo>/`
2. Usar standalone
3. Registrar rota em `app.routes.ts`
4. Adicionar menu em sidebar

### 12.2 Novos Módulos

1. Criar diretório
2. Adicionar rote3. Adicionar menu item
4. Adicionar service
5. Adicionar RBAC

### 12.3 Testes

O projeto tem Vitest configurado:

```bash
npm run test
```

Templates em `__tests__/`:

- multi-user-transfer.spec.ts
- dashboard-summary.service.spec.ts
- transfers.component.spec.ts
- transactions-page.component.spec.ts

---

## Resumo

| Aspecto | Detalhe |
|--------|----------|
| Framework | Angular 21 standalone |
| UI Library | Angular Material |
| CSS | Tailwind + CSS componente |
| Layout | Sidenav + Toolbar |
| Formulários | Mat-form-field + validações |
| Listas | Mat-table + paginator |
| Modais | Mat dialog |
| Feedback | Toast + loading overlay |
| Animações | motion library |
| Testes | Vitest |

---

**Próximo passo:** Setup e ambiente.