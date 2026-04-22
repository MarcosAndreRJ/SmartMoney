# Módulos e Responsabilidades - SmartMoney

## Mapa de Routes → Componentes

Cada rota mapeia para um componente que gerencia uma página.

```
/dashboard              → DashboardComponent
/accounts             → AccountsListComponent
/statement            → AccountStatementComponent
/categories           → CategoriesPageComponent
/subcategories        → SubcategoriesPageComponent
/subcategory-form     → SubcategoryFormComponent
/profile              → ProfileComponent
/goals                → GoalsComponent
/goal-contributions   → GoalContributionsPageComponent
/contacts            → ContactsComponent
/notifications       → NotificationsComponent
/shared-accounts     → SharedAccountsComponent
/recurring           → RecurringTransactionsComponent
/investments          → InvestmentsComponent
/loans               → LoansPageComponent
/credit-cards         → CreditCardsPageComponent
/data-management     → DataManagementComponent
/subscription       → SubscriptionPageComponent
/transactions        → TransfersComponent
/all-transfers       → AllTransfersComponent
/lancamentos        → TransactionsPageComponent
/importacao          → ImportacaoPageComponent
/subscription-checkout → SubscriptionCheckoutComponent
/subscription-status → SubscriptionStatusComponent

/admin-dashboard     → AdminDashboardComponent
/admin-users         → AdminUsersComponent
/admin-plans        → AdminPlansComponent
/admin-subscriptions → AdminSubscriptionsComponent
/admin-transactions → AdminTransactionsComponent
/admin-notifications → AdminNotificationsComponent
```

## Módulos Funcionais

### 1. Dashboard

**Rota:** `/dashboard`
**Componente:** `dashboard.component.ts`
**Responsabilidade:** Exibir resumo financeiro agregado.

**Dados que exibe:**
- Saldo total
- Gastos mensais
- Saldo predito (com pendências)
- Total loans
- Evolução patrimonial (6 meses)
- Goals com progresso
- Gastos por categoria (30 dias)
- Transações recentes

**Dependências:**
- `SupabaseService.getDashboardSummary()` → aggregation de 8 queries paralelas

**Local:** `src/app/features/dashboard/`

---

### 2. Accounts

**Rotas:** `/accounts`, `/statement`
**Componentes:**
- `accounts-list.component.ts` — lista + criar
- `account-form.component.ts` — criar/editar
- `account-details-modal.component.ts` — detalhes
- `account-statement.component.ts` — extrato filtrado

**Responsabilidade:** CRUD de contas bancárias e cartões.

**Entidade DB:** `accounts`

**Dados por tipo:**
| Tipo | Campos relevantes |
|------|----------------|
| `checking` | agency_number, account_number |
| `savings` | agency_number, account_number |
| `credit_card` | card_name, card_number, card_expiration, card_cvv, credit_limit, closing_date, due_date |
| `investment` | (genérico) |

**Dependências:**
- `SupabaseService.getAccounts()`, `.createAccount()`, `.updateAccount()`, `.deleteAccount()`

**Local:** `src/app/features/accounts/`

---

### 3. Transactions

**Rotas:** `/lancamentos`, `/transactions`, `/all-transfers`, `/recurring`
**Componentes:**
- `transactions-page.component.ts` — lista mensal
- `transaction-form.component.ts` — criar/editar
- `transfers.component.ts` — transferências
- `all-transfers.component.ts` — todas as transfers
- `recurring-transactions.component.ts` — recorrências

**Responsabilidade:** CRUD de lançamentos, transferências, transações recorrentes.

**Entidades DB:**
- `transactions` — principal
- `recurring_transactions` — template

**Campos críticos:**
| Campo | Valores possiveis |
|-------|-----------------|
| `type` | `income`, `expense`, `transfer` |
| `status` | `confirmed`, `pending`, `cancelled` |
| `recurring_source_id` | referencia para recurring se gerada automaticamente |

**Regras:**
- Transferências criam duas transactions (débito + crédito)
- Transações recorrentes geram automaticamente (como? scheduler)

**Dependências:**
- `SupabaseService.getTransactions()`, `.createTransaction()`
- `RecurringSchedulerService`

**Local:** `src/app/features/transactions/`

---

### 4. Goals

**Rotas:** `/goals`, `/goal-contributions`
**Componentes:**
- `goals.component.ts` — lista metas
- `goal-modal.component.ts` — criar/editar meta
- `goal-contributions-page.component.ts` — aportes
- `contribution-modal.component.ts` — registrar aporte
- `goal-details-modal.component.ts` — detalhes + progresso

**Responsabilidade:** Metas financeiras (sonhos com ahorro).

**Entidades DB:**
- `goals` — meta (nome, target_amount, target_date, icon, color)
- `goal_contributions` — aportes (goal_id, amount, date)

**Regras:**
- Progresso = sum(contributions) / target_amount * 100
- Meta pode estar incompleta (progresso < 100%)
- Aporte cria transaction automaticamente? (não verificado)

**Dependências:**
- `GoalService.getGoals()`, `.createGoal()`, `.createContribution()`

**Local:** `src/app/features/goals/`

---

### 5. Investments

**Rota:** `/investments`
**Componentes:**
- `investments.component.ts` — portfólio
- `investment-form.component.ts` — criar/editar
- `investment-contribution.component.ts` — aporte

**Responsabilidade:** Portfólio de investimentos.

**Entidade DB:** `investments`

**Campos:**
| Campo | Descrição |
|-------|----------|
| `name` | Nome do investimento |
| `type` | Tipo (renda fixa, variável, etc.) |
| `amount` | Valor atual |
| `amount_invested` | Valor investido |
| `yield` | Rendimento |

**Regras:**
- Calcula yield = amount - amount_invested
- Yield pode ser negativo

**Dependências:**
- `InvestmentsService.getInvestments()`, `.createInvestment()`

**Local:** `src/app/features/investments/`

---

### 6. Loans

**Rota:** `/loans`
**Componente:** `loans-page.component.ts`

**Responsabilidade:** Controle de empréstimos e parcelas.

**Entidade DB:** `loans`, `loan_payments`

**Campos:**
| Campo | Descrição |
|-------|-----------|
| `creditor_name` | Credor |
| `type` | `fixed` (parcelas fixas) ou `interest` (juros) |
| `initial_amount` | Valor original |
| `current_balance` | Saldo devedor |
| `monthly_rate` | Taxa mensal (%) |
| `total_installments` | Total parcelas |
| `paid_installments` | Pago |
| `installment_amount` | Valor parcela |
| `due_day` | Dia de vencimento |
| `status` | `active`, `paid`, `overdue` |

**Regras:**
- Pagamento subtrai do current_balance
- Se due_day > hoje = overdue?

**Dependências:**
- `SupabaseService.getLoans()`, `.createLoan()`, `.getLoanPayments()`.createLoanPayment()`

**Local:** `src/app/features/loans/`

---

### 7. Credit Cards

**Rota:** `/credit-cards`
**Componente:** `credit-cards-page.component.ts`

**Responsabilidade:** Lista cartões com fatura do mês.

**Entidade DB:** Usa `accounts` (onde account_type = 'credit_card') + `credit_card_transactions`

**Display:**
- currentBill = sum(credit_card_transactions where status = 'confirmed')
- available = credit_limit - currentBill

**Dependências:**
- `SupabaseService.getCardTransactions()`

**Local:** `src/app/features/credit-cards/`

---

### 8. Categories

**Rotas:** `/categories`, `/subcategories`
**Componentes:**
- `categories-page.component.ts`
- `subcategories-page.component.ts`
- `subcategory-form.component.ts`

**Responsabilidade:** CRUD categorias hierárquicas.

**Entidade DB:** `categories`

**Estrutura:**
- parent_id = null → categoria principal
- parent_id = <id> → subcategoria
- Campos: name, icon, color, type (income/expense), user_id

**Regras:**
- Não há límite de categorias
- Subcategorias são só categories com parent_id

**Dependências:**
- `SupabaseService.getCategories()`, `.createCategory()`

**Local:** `src/app/features/categories/`

---

### 9. Import

**Rota:** `/importacao`
**Componente:** `importacao-page.component.ts`
**Componentes auxiliares:**
- `importacao-upload.component.ts`
- `importacao-preview.component.ts`

**Responsabilidade:** Importar planilhas XLSX → transações.

**Fluxo (3 passos):**
1. Upload → `ImportParserService.parseExcelFile(file)`
2. Preview → identifyColumns() + mapRowToImportItem()
3. Confirma → `ImportService.importBatch(items)`

**Heurísticas:**
- Identificação de colunas por header (data, descrição, valor, categoria)
- Tipo (income/expense) por sinal do valor ou keyword
- Sugestão de categoria por keywords na descrição

**Parser (100% client):**
- `XLSX.read(data, { type: 'array', cellDates: true })`
- `XLSX.utils.sheet_to_json()`

**Dependências:**
- `ImportParserService` (client)
- `ImportService` (server = DB insert)

**Local:** `src/app/features/import/`

---

### 10. Subscription (Billing)

**Rotas:** `/subscription`, `/subscription-checkout`, `/subscription-status`
**Componentes:**
- `subscription-page.component.ts` — gestão
- `subscription-checkout.component.ts` — checkout
- `subscription-status.component.ts` — status

**Responsabilidade:** Upgrade/downgrade, cancelamento, status.

**Planos:**
| Plano | priceId (Stripe) |
|-------|-----------------|
| Pro | `price_1TFeUxKEGcZcVMwNTnqgIusz` |
| Master | `price_1TFeVfKEGcZcVMwNAHVc9yiP` |
| Family | `price_1TFeW5KEGcZcVMwNw7xxTHXv` |

**Regras:**
- Basic é gratuito (default)
- Upgrade → checkout Stripe
- Cancelamento → cancel_at_period_end = true
- Resume → cancela cancelamento
- Downgrade → novo checkout com outro priceId

**Dependências:**
- `BillingService.getUserPlan()`, `.startCheckout()`, `.cancelSubscription()`, `.updateSubscriptionPlan()`, `.resumeSubscription()`
- Edge Functions: `create-checkout`, `manage-subscription`, `stripe-webhook`

**Local:** `src/app/features/subscription/`

---

### 11. Admin

**Rotas:** `/admin-dashboard`, `/admin-users`, `/admin-plans`, `/admin-subscriptions`, `/admin-transactions`, `/admin-notifications`
**Componentes:**
- `admin-dashboard.component.ts`
- `admin-users-list.component.ts`
- `admin-plans.component.ts`
- `admin-subscriptions.component.ts`
- `admin-transactions.component.ts`
- `admin-notifications.component.ts`

**Responsabilidade:** Gestão de usuários, planos, assinaturas.

**Proteção:** `admin.guard.ts` — apenas users com is_admin = true

**Dependências:**
- `AdminService`

**Local:** `src/app/features/admin/`

---

### 12. Profile

**Rota:** `/profile`
**Componentes:**
- `profile.component.ts`
- `change-password-modal.component.ts`
- `avatar-upload-modal.component.ts`

**Responsabilidade:** Dados do usuário + avatar + senha.

**Dependências:**
- `SupabaseService.updateUserMetadata()`, `.uploadAvatar()`

**Local:** `src/app/features/profile/`

---

### 13. Contacts

**Rota:** `/contacts`
**Componente:** `contacts.component.ts`
**Componente auxiliar:** `contact-form.component.ts`

**Responsabilidade:** Contatos e favorecidos para transferências.

**Entidade DB:** `contacts`

**Campos:**
| Campo | Descrição |
|-------|-----------|
| `name` | Nome |
| `email` | Email |
| `bank_name` | Banco |
| `bank_agency` | Agência |
| `account_number` | Conta |
| `tax_id` | CPF/CNPJ |
| `pix_key` | Chave PIX |
| `is_favorite` | Favorito |

**Local:** `src/app/features/contacts/`

---

### 14. Shared Accounts (Family)

**Rota:** `/shared-accounts`
**Componente:** `shared-accounts.component.ts`
**Componentes auxiliares:**
- `invite-member-modal.component.ts`

**Responsabilidade:** Convite e gestão de membros family.

**Entidade DB:** `user_invites`, `profiles` (referenciadas)

**Dependências:**
- `SharedAccountsService`

**Local:** `src/app/features/shared-accounts/`

---

### 15. Notifications

**Rota:** `/notifications`
**Componente:** `notifications.component.ts`

**Responsabilidade:** Lista de notificações.

**Entidade DB:** `notifications` (não verificada em services)

**Local:** `src/app/features/notifications/`

---

### 16. Data Management

**Rota:** `/data-management`
**Componente:** `data-management.component.ts`

**Responsabilidade:** Exportar/delete dados.

**Local:** `src/app/features/data-management/`

---

### 17. Auth

**Rota:** (raiz não mapeada, usa componente inline no route)
**Componente:** `auth.component.ts`

**Responsabilidade:** Login + registro via Supabase Auth.

**Local:** `src/app/features/auth/`

---

## Serviços Centrais

| Serviço | Responsabilidade | Métodos principais |
|---------|---------------|-----------------|
| `SupabaseService` | Acesso DB + user | getAccounts(), getTransactions(), getCategories(), getDashboardSummary(), etc. |
| `BillingService` | Billing | getUserPlan(), startCheckout(), cancelSubscription() |
| `FeatureAccessService` | Feature flags | hasFeature() |
| `ImportParserService` | Parse XLSX | parseExcelFile() |
| `ImportService` | Import batch | importBatch() |
| `GoalService` | Goals | getGoals(), createGoal(), createContribution() |
| `InvestmentsService` | Investments | getInvestments(), createInvestment() |
| `AdminService` | Admin | getAllUsers(), updatePlan() |

## Edge Functions

| Função | Script | Responsabilidade |
|--------|--------|-----------------|
| `create-checkout` | `create-checkout/index.ts` | Cria checkout session |
| `stripe-webhook` | `stripe-webhook/index.ts` | Processa eventos Stripe |
| `manage-subscription` | `manage-subscription/index.ts` | Cancel/resume/update |
| `delete-user` | `delete-user/index.ts` | Deleta usuário |
| `debug-env` | `debug-env/index.ts` | Debug (remover em prod) |

## Regras de Negócio Identificadas

### RB1: Feature Access por Plano

```typescript
const hasGoals = await featureAccess.hasFeature('goals');
// Retorna true se plano atual tem 'goals' em PLAN_FEATURES
```

**Feature → Plano:**
| Feature | Planos |
|---------|--------|
| goals | Master, Ultra, Family |
| loans | Ultra, Family |
| investments | Ultra, Family |
| account_transfers | Pro, Master, Ultra, Family |
| bulk_import | Master, Ultra, Family |
| shared_accounts | Family |

### RB2: Limites por Plano

| Recurso | Basic | Pro | Master+ | Ultra | Family |
|---------|-------|-----|--------|-------|--------|
| accounts | 2 | 5 | unlimited | unlimited | unlimited |
| cards | 1 | 3 | unlimited | unlimited | unlimited |

**Verificação:** `BillingService.getAccountLimit()`

### RB3: Bulk Import Heurística

**Identificação de colunas:**
- date: "data", "date", "data da transação", "dia"
- description: "descrição", "descriçao", "description", "histórico", "estabelecimento"
- amount: "valor", "amount", "preço", "total", "quantia"
- category: "categoria", "category"
- type: "tipo", "type", "movimentação"

**Heurística de tipo:**
- income keywords: "receita", "renda", "entrada", "income", "ganho"
- expense keywords: "despesa", "saída", "expense", "gasto"
- fallback: sinal do amount (positivo = income, negativo = expense)

**Heurística de categoria por descrição:**
- "ifood", "restaurante", "mcdonalds"... → "Alimentação"
- "uber", "99app", "posto"... → "Transporte"
- "netflix", "spotify"... → "Lazer"
- ...etc

### RB4: Dashboard Aggregation

O `getDashboardSummary()` agrega de 8 queries paralelas:
1. accounts
2. transactions
3. loans
4. goals
5. goal_contributions
6. categories
7. recurring_transactions
8. credit_card_transactions

**Cálculos:**
- totalBalance = sum(initial_balance) + sum(income) - sum(expense)
- monthlySpending = transactions do mês atual + card transactions
- predictedBalance = totalBalance + pendingIncome - pendingPending
- goals progress = sum(contributions) / target_amount

### RB5: Recurring Transactions

**Entidade:** `recurring_transactions`

**Campos necessários:**
| Campo | Descrição |
|-------|-----------|
| `account_id` | Conta de destino |
| `type` | income/expense |
| `amount` | Valor |
| `frequency` | daily/weekly/monthly |
| `day_of_month` | Dia (para monthly) |
| `start_date` | Início |
| `end_date` | Fim (opcional) |

**Geração:** Não está claro o scheduler.

---

## Ambiguidades e Pontos de Atenção

1. **Recurring Scheduler:** Como as recurring transactions viram transactions?
   - Não há cron jobno Supabase
   - O `recurring-scheduler.service.ts` é chamar manual?

2. **Family Sharing:** Quais dados são compartilhados?
   - Não está claro no código verificado

3. **Notifications:** Não há serviço que popula notifications
   - Só o componente existe

4. **Data Management:** O que significa "exportar"?
   - Não implementado

5. **Admin:** Quais dados admin pode manipular?
   - Só as tabelas de admin

---

**Próximo passo:** Ver padrões e convenções de código.