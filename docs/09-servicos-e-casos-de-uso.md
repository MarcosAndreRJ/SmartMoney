# Serviços e Casos de Uso - SmartMoney

## Visão Geral

Este documento lista cada serviço do sistema com suas responsabilidades e os principais casos de uso (use cases) que ele atende.

---

## 1. SupabaseService

**Arquivo:** `src/app/core/services/supabase.service.ts`
**Responsabilidade:** Acesso centralizado ao banco de dados via Supabase SDK. É o serviço principal de dados.

### Métodos

| Método | Uso | Retorno |
|--------|-----|----------|
| `getUser()` | Buscar usuário atual | `User` |
| `signOut()` | Logout | void |
| `getAccounts()` | Lista contas | `Account[]` |
| `createAccount(data)` | Criar conta | `Account` |
| `updateAccount(id, data)` | Atualizar conta | `Account` |
| `deleteAccount(id)` | Deletar conta | void |
| `getTransactions(accountId?)` | Lista transações | `Transaction[]` |
| `createTransaction(data)` | Criar transação | `Transaction` |
| `getCardTransactions(cardId?)` | Lista transações cartão | `CardTransaction[]` |
| `createCardTransaction(data)` | Criar transação cartão | `CardTransaction` |
| `getContacts()` | Lista contatos | `Contact[]` |
| `createContact(data)` | Criar contato | `Contact` |
| `updateContact(id, data)` | Atualizar contato | `Contact` |
| `deleteContact(id)` | Deletar contato | void |
| `searchUserByEmail(email)` | Buscar usuário por email | `Profile` |
| `getCategories(type?)` | Lista categorias | `Category[]` |
| `getAllCategories(type?)` | Lista categorias + subcategorias | `Category[]` |
| `createCategory(data)` | Criar categoria | `Category` |
| `updateCategory(id, data)` | Atualizar categoria | `Category` |
| `deleteCategory(id)` | Deletar categoria | void |
| `getLoans()` | Lista empréstimos | `Loan[]` |
| `createLoan(data)` | Criar empréstimo | `Loan` |
| `updateLoan(id, data)` | Atualizar empréstimo | `Loan` |
| `deleteLoan(id)` | Deletar empréstimo | void |
| `getLoanPayments(loanId)` | Lista pagamentos | `LoanPayment[]` |
| `createLoanPayment(data)` | Criar pagamento | `LoanPayment` |
| `getDashboardSummary()` | Agregação do dashboard | `DashboardSummary` |
| `uploadAvatar(file)` | Upload avatar | `publicUrl` |
| `updateUserMetadata(data)` | Atualiza perfil | void |

### Casos de Uso Atendidos

- **UC-ACC-01:** Lista todas as contas do usuário
- **UC-ACC-02:** Criar nova conta bancária
- **UC-ACC-03:** Atualizar saldo inicial
- **UC-ACC-04:** Deletar conta
- **UC-TXN-01:** Lista transações (com filtro por conta)
- **UC-TXN-02:** Criar lançamento manual
- **UC-TXN-03:** Criar transação de cartão
- **UC-CAT-01:** Lista categorias por tipo
- **UC-CAT-02:** Criar categoria/ subcategoria
- **UC-CAT-03:** Hierarquia categorias
- **UC-LOAN-01:** Criar empréstimo
- **UC-LOAN-02:** Registrar pagamento
- **UC-DASH-01:** Agregação de dados do dashboard

---

## 2. BillingService

**Arquivo:** `src/app/core/services/billing.service.ts`
**Responsabilidade:** Gestão de assinaturas e pagamentos via Stripe.

### Métodos

| Método | Uso | Retorno |
|--------|-----|----------|
| `getCurrentPlan()` | Plano atual | `PlanCode` |
| `getUserPlan()` | Detalhes do plano | `{ plan, resources, isPremium }` |
| `getAccountLimit()` | Limite de contas | `number | null` |
| `startCheckout(priceId)` | Iniciar checkout | `checkoutUrl` |
| `cancelSubscription(cancelAtPeriodEnd?)` | Cancelar | `{ success, ... }` |
| `updateSubscriptionPlan(priceId)` | Trocar plano | `{ success, ... }` |
| `resumeSubscription()` | Resumir | `{ success, ... }` |

### Casos de Uso Atendidos

- **UC-BILL-01:** Verificar plano atual
- **UC-BILL-02:** Iniciar upgrade (checkout)
- **UC-BILL-03:** Cancelar assinatura
- **UC-BILL-04:** Trocar de plano
- **UC-BILL-05:** Reativar assinatura cancelada

---

## 3. FeatureAccessService

**Arquivo:** `src/app/core/services/feature-access.service.ts`
**Responsabilidade:** Verificar se usuário pode usar determinada funcionalidade.

### Métodos

| Método | Uso | Retorno |
|--------|-----|----------|
| `hasFeature(featureKey)` | Verificar acesso | `boolean` |

### featureKeys Possíveis

- `'goals'`
- `'loans'`
- `'investments'`
- `'account_transfers'`
- `'bulk_import'`
- `'shared_accounts'`

### Casos de Uso Atendidos

- **UC-FEAT-01:** Verificar se pode acessar metas
- **UC-FEAT-02:** Verificar se pode importar planilha
- **UC-FEAT-03:** Verificar se pode ver investimentos

---

## 4. ImportParserService

**Arquivo:** `src/app/core/services/import-parser.service.ts`
**Responsabilidade:** Parse de arquivos XLSX no cliente.

### Métodos

| Método | Uso | Retorno |
|--------|-----|----------|
| `parseExcelFile(file)` | Parse XLSX | `ImportItem[]` |

### Casos de Uso Atendidos

- **UC-IMP-01:** Upload de arquivo XLSX
- **UC-IMP-02:** Identificação automática de colunas
- **UC-IMP-03:** Detecção de tipo (income/expense)
- **UC-IMP-04:** Sugestão de categoria por keywords

---

## 5. ImportService

**Arquivo:** `src/app/core/services/import.service.ts`
**Responsabilidade:** Inserção em batch no banco.

### Métodos

| Método | Uso | Retorno |
|--------|-----|----------|
| `importBatch(items, accountId)` | Bulk insert | `{ imported, errors }` |

### Casos de Uso Atendidos

- **UC-IMP-05:** Importar batch de transações
- **UC-IMP-06:** Validar e filtrar itens inválidos

---

## 6. GoalService

**Arquivo:** `src/app/features/goals/goal.service.ts`
**Responsabilidade:** CRUD de metas e contribuições.

### Métodos

| Método | Uso | Retorno |
|--------|-----|----------|
| `getGoals()` | Lista metas | `Goal[]` |
| `createGoal(data)` | Criar meta | `Goal` |
| `updateGoal(id, data)` | Atualizar meta | `Goal` |
| `deleteGoal(id)` | Deletar meta | void |
| `getGoalContributions(goalId)` | Lista aportes | `GoalContribution[]` |
| `createGoalContribution(data)` | Registrar aporte | `GoalContribution` |

### Casos de Uso Atendidos

- **UC-GOAL-01:** Criar meta financeira
- **UC-GOAL-02:** Registrar aporte
- **UC-GOAL-03:** Ver progresso
- **UC-GOAL-04:** Concluir meta

---

## 7. InvestmentsService

**Arquivo:** `src/app/features/investments/investments.service.ts`
**Responsabilidade:** CRUD de investimentos.

### Métodos

| Método | Uso | Retorno |
|--------|-----|----------|
| `getInvestments()` | Lista investimentos | `Investment[]` |
| `createInvestment(data)` | Criar investimento | `Investment` |
| `updateInvestment(id, data)` | Atualizar | `Investment` |
| `deleteInvestment(id)` | Deletar | void |

### Casos de Uso Atendidos

- **UC-INV-01:** Cadastrar investimento
- **UC-INV-02:** Atualizar valor atual
- **UC-INV-03:** Calcular rendimento
- **UC-INV-04:** Remover investimento

---

## 8. AdminService

**Arquivo:** `src/app/core/services/admin.service.ts`
**Responsabilidade:** Operações administrativas.

### Métodos

| Método | Uso | Retorno |
|--------|-----|----------|
| `getAllUsers()` | Lista todos usuários | `User[]` |
| `searchUserByEmail(email)` | Buscar usuário | `User | null` |
| `getAllSubscriptions()` | Lista assinaturas | `Subscription[]` |
| `updateUserPlan(userId, planCode)` | Atualizar plano | void |
| `deleteUser(userId)` | Deletar usuário | void |

### Casos de Uso Atendidos

- **UC-ADMIN-01:** Listar usuários
- **UC-ADMIN-02:** Buscar por email
- **UC-ADMIN-03:** Alterar plano manualmente
- **UC-ADMIN-04:** Deletar usuário

---

## 9. ToastService

**Arquivo:** `src/app/shared/services/toast.service.ts`
**Responsabilidade:** Exibir notificações toast.

### Métodos

| Método | Uso |
|--------|-----|
| `success(message)` | Toast sucesso |
| `error(message)` | Toast erro |
| `info(message)` | Toast info |
| `warning(message)` | Toast warning |

### Casos de Uso Atendidos

- Todas as operações que precisam de feedback visual.

---

## 10. LoadingService

**Arquivo:** `src/app/core/services/loading.service.ts`
**Responsabilidade:** Controlar estado de loading global.

### Métodos

| Método | Uso |
|--------|-----|
| `show()` | Ativa loading |
| `hide()` | Desativa loading |
| `loading()` | Signal de estado |

### Casos de Uso Atendidos

- Operações async que precisam de feedback visual.

---

## 11. PrivacyService

**Arquivo:** `src/app/core/services/privacy.service.ts`
**Responsabilidade:** Controlar modo oculto.

**Detalhes:** Não verificado em código.

---

## 12. NavigationService

**Arquivo:** `src/app/core/services/navigation.service.ts`
**Responsabilidade:** Controle programático de rotas.

**Detalhes:** Não verificado em código.

---

## 13. PageContextService

**Arquivo:** `src/app/core/services/page-context.service.ts`
**Responsabilidade:** Dados do contexto da página.

**Detalhes:** Não verificado em código.

---

## 14. TransactionViewService

**Arquivo:** `src/app/core/services/transaction-view.service.ts`
**Responsabilidade:** Controle de visualização de transações.

**Detalhes:** Não verificado em código.

---

## 15. RecurringSchedulerService

**Arquivo:** `src/app/core/services/recurring-scheduler.service.ts`
**Responsabilidade:** Scheduler de transações recorrentes.

**Status:** existe, mas implementação ambígua.

---

## 16. NotificationsService

**Arquivo:** `src/app/features/notifications/notifications.service.ts`
**Responsabilidade:** Notificações do usuário.

**Status:** Apenas estrutura, não implementado.

---

## 17. SharedAccountsService

**Arquivo:** `src/app/features/shared-accounts/shared-accounts.service.ts`
**Responsabilidade:** Família/convites.

**Status:** Parcial.

---

## Resumo de Serviços

| Serviço | Arquivo | Uso Principal |
|---------|--------|-------------|
| SupabaseService | core/services/supabase.service.ts | **CRUD principal** |
| BillingService | core/services/billing.service.ts | Billing |
| FeatureAccessService | core/services/feature-access.service.ts | Feature flags |
| ImportParserService | core/services/import-parser.service.ts | Parse XLSX |
| ImportService | core/services/import.service.ts | Bulk insert |
| GoalService | features/goals/goal.service.ts | Metas |
| InvestmentsService | features/investments/investments.service.ts | Investimentos |
| AdminService | core/services/admin.service.ts | Admin |
| ToastService | shared/services/toast.service.ts | Feedback |
| LoadingService | core/services/loading.service.ts | Loading |

---

## Mapeamento Use Case → Serviço

| Use Case | Serviço |
|----------|---------|
| Lista contas | SupabaseService |
| Cria conta | SupabaseService + FeatureAccess |
| Lista transações | SupabaseService |
| Cria transação | SupabaseService |
| Dashboard | SupabaseService |
| Importa planilha | ImportParserService + ImportService |
| Verifica acesso | FeatureAccessService |
| Checkout | BillingService |
| Metas | GoalService |
| Investimentos | InvestmentsService |
| Admin | AdminService |
| Feedback toast | ToastService |

---

## Casos de Uso Detalhados

### UC-ACC-02: Criar Nova Conta

```
1. Usuário clica "+ Nova Conta"
2. FeatureAccess.hasFeature('accounts') OK?
   - Não: redirect /subscription
3. billingService.getAccountLimit() >= currentCount?
   - Não: erro "Limite atingido"
4. Abre form
5. Usuário preenche dados
6. createAccount(data)
7. Se erro: toast erro
8. Toast sucesso
9. Recarrega lista
```

### UC-BILL-02: Iniciar Checkout

```
1. Usuário escolhe plano
2. billingService.startCheckout(priceId)
3. Se erro: toast erro
4. Redirect para URL retornada
```

### UC-IMP-01: Importar Planilha

```
1. Usuário faz upload
2. ImportParser.parseExcelFile(file)
3. Preview mostra itens
4. Usuário confirma
5. ImportService.importBatch(items, accountId)
6. Toast "X importados"
```

### UC-GOAL-03: Ver Progresso

```
1. Usuário acessa /goals
2. Service.getGoals() + getContributions()
3. Calcula: sum(contributions) / target_amount * 100
4. Exibe progresso na UI
```

### UC-ADMIN-01: Lista Usuários

```
1. Admin acessa /admin-users
2. adminGuard verifica is_admin
3. AdminService.getAllUsers()
4. Lista com paginação
```

---

## Ambiguidades

1. **RecurringScheduler:** Como executa? Não há cron job visible.

2. **NotificationsService:** exists mas não implementado. De onde vêm?

3. **SharedAccountsService:** Parcial. Quais operações?

4. **PrivacyService:** Não verificado.

---

**Próximo passo:** Banco de dados (schema, views, RLS).