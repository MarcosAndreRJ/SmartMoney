# API - SmartMoney

## Visão Geral

O sistema expõe APIs em três camadas:

1. **Frontend → Supabase SDK** — Operações diretas (CRUD)
2. **Frontend → Edge Functions** — Operações sensíveis (billing)
3. **Stripe → Edge Functions** — Webhooks

Este documento lista todos os métodos disponíveis.

---

## 1. Supabase SDK (Frontend)

O acesso é feito via `SupabaseService`, mas os métodos também podem ser acessados via SDK diretamente.

### 1.1 Autenticação

```typescript
// Métodos internos (não expostos como API)
auth.signInWithPassword({ email, password })
auth.signInWithOAuth({ provider: 'google' })
auth.signOut()
auth.getUser()
auth.getSession()
auth.updateUser({ data: {...} })
```

**Nota:** Autenticação é gerenciada internamente. Não há API pública para auth.

### 1.2 Accounts

```typescript
// Listar
getAccounts(): Promise<{ data: Account[], error: Error | null }>

// Criar
createAccount(accountData: Partial<SupabaseAccount>): Promise<{ data: Account, error: Error | null }>

// Atualizar
updateAccount(id: string, updates: Partial<SupabaseAccount>): Promise<{ data: Account, error: Error | null }>

// Deletar
deleteAccount(id: string): Promise<{ error: Error | null }>
```

**Exemplo de uso:**

```typescript
const { data, error } = await supabase.getAccounts();
const [newAccount] = await supabase.createAccount({ institution_name: 'Nubank', account_type: 'checking', initial_balance: 1000 });
await supabase.updateAccount(id, { initial_balance: 2000 });
await supabase.deleteAccount(id);
```

### 1.3 Transactions

```typescript
// Listar (opor accountId)
getTransactions(accountId?: string): Promise<{ data: Transaction[], error: Error | null }>

// Criar
createTransaction(txData: Partial<SupabaseTransaction>): Promise<{ data: Transaction, error: Error | null }>

// Atualizar
updateTransaction(id: string, updates: Partial<SupabaseTransaction>): Promise<{ data: Transaction, error: Error | null }>

// Deletar
deleteTransaction(id: string): Promise<{ error: Error | null }>
```

### 1.4 Credit Card Transactions

```typescript
getCardTransactions(cardId?: string): Promise<{ data: CardTransaction[], error: Error | null }>

createCardTransaction(tx: Partial<SupabaseCardTransaction>): Promise<{ data: CardTransaction, error: Error | null }>

updateCardTransaction(id: string, updates: Partial<SupabaseCardTransaction>): Promise<{ data: CardTransaction, error: Error | null }>
```

### 1.5 Categories

```typescript
getCategories(type?: 'income' | 'expense'): Promise<{ data: Category[], error: Error | null }>

getAllCategories(type?: 'income' | 'expense'): Promise<{ data: Category[], error: Error | null }>

createCategory(data: Partial<Category>): Promise<{ data: Category, error: Error | null }>

updateCategory(id: string, data: Partial<Category>): Promise<{ data: Category, error: Error | null }>

deleteCategory(id: string): Promise<{ error: Error | null }>
```

### 1.6 Contacts

```typescript
getContacts(): Promise<{ data: Contact[], error: Error | null }>

createContact(data: Partial<Contact>): Promise<{ data: Contact, error: Error | null }>

updateContact(id: string, data: Partial<Contact>): Promise<{ data: Contact, error: Error | null }>

deleteContact(id: string): Promise<{ error: Error | null }>
```

### 1.7 Goals

```typescript
getGoals(): Promise<{ data: Goal[], error: Error | null }>

createGoal(data: Partial<Goal>): Promise<{ data: Goal, error: Error | null }>

updateGoal(id: string, updates: Partial<Goal>): Promise<{ data: Goal, error: Error | null }>

deleteGoal(id: string): Promise<{ error: Error | null }>
```

### 1.8 Goal Contributions

```typescript
getGoalContributions(goalId: string): Promise<{ data: GoalContribution[], error: Error | null }>

createGoalContribution(data: Partial<GoalContribution>): Promise<{ data: GoalContribution, error: Error | null }>
```

### 1.9 Investments

```typescript
getInvestments(): Promise<{ data: Investment[], error: Error | null }>

createInvestment(data: Partial<Investment>): Promise<{ data: Investment, error: Error | null }>

updateInvestment(id: string, updates: Partial<Investment>): Promise<{ data: Investment, error: Error | null }>

deleteInvestment(id: string): Promise<{ error: Error | null }>
```

### 1.10 Loans

```typescript
getLoans(): Promise<{ data: Loan[], error: Error | null }>

createLoan(data: Partial<Loan>): Promise<{ data: Loan, error: Error | null }>

updateLoan(id: string, updates: Partial<Loan>): Promise<{ data: Loan, error: Error | null }>

deleteLoan(id: string): Promise<{ error: Error | null }>

getLoanPayments(loanId: string): Promise<{ data: LoanPayment[], error: Error | null }>

createLoanPayment(data: Partial<LoanPayment>): Promise<{ data: LoanPayment, error: Error | null }>
```

### 1.11 User Discovery

```typescript
searchUserByEmail(email: string): Promise<{ data: Profile, error: Error | null }>
```

### 1.12 Dashboard Summary

```typescript
getDashboardSummary(): Promise<DashboardSummary>
```

**Retorno:**

```typescript
interface DashboardSummary {
  stats: {
    totalBalance: number;
    monthlySpending: number;
    predictedBalance: number;
    totalLoans: number;
    balanceChange: number;      // % change from last month
    spendingChange: number;     // % change from last month
  };
  creditCards: Array<{
    id: string;
    name: string;
    lastDigits: string;
    currentBill: number;
    limit: number;
    available: number;
    color: string;
  }>;
  recurrence: {
    income: number;
    expenses: number;
  };
  goals: GoalWithProgress[];
  categorySpending: Array<{
    name: string;
    amount: number;
    icon: string;
    color: string;
  }>;
  heritageEvolution: Array<{
    month: string;
    value: number;
  }>;
  recentTransactions: RecentTransaction[];
}
```

### 1.13 Avatar

```typescript
uploadAvatar(file: File): Promise<string>  //Returns publicUrl
```

### 1.14 User Metadata

```typescript
updateUserMetadata(data: any): Promise<void>
```

---

## 2. Billing Service (Frontend → Edge Functions)

```typescript
// Buscar plano atual
getCurrentPlan(): Promise<PlanCode>

// Buscar detalhes do plano
getUserPlan(): Promise<{ plan: PlanCode; resources: any; isPremium: boolean }>

// Limite de contas
getAccountLimit(): Promise<number | null>

// Criar checkout
startCheckout(priceId: string): Promise<string>  //Returns checkout URL

// Cancelar assinatura
cancelSubscription(cancelAtPeriodEnd: boolean = true): Promise<{
  success: boolean;
  message: string;
  cancel_at_period_end: boolean;
  current_period_end?: string;
}>

// Atualizar plano
updateSubscriptionPlan(priceId: string): Promise<{
  success: boolean;
  message: string;
  new_plan: string;
  status: string;
  current_period_end?: string;
}>

// Resumir assinatura
resumeSubscription(): Promise<{
  success: boolean;
  message: string;
  cancel_at_period_end: boolean;
  current_period_end?: string;
}>
```

---

## 3. Feature Access Service

```typescript
hasFeature(featureKey: string): Promise<boolean>
```

**Exemplos de featureKey:**
- `'goals'`
- `'loans'`
- `'investments'`
- `'account_transfers'`
- `'bulk_import'`
- `'shared_accounts'`

---

## 4. Import Service

```typescript
// Parse XLSX (client)
parseExcelFile(file: File): Promise<ImportItem[]>

// Importar batch
importBatch(items: ImportItem[], accountId: string): Promise<{
  imported: number;
  errors: string[];
}>
```

---

## 5. Admin Service

```typescript
// Listar todos os usuários
getAllUsers(): Promise<User[]>

// Buscar usuário por email
searchUserByEmail(email: string): Promise<User | null>

// Buscar assinaturas
getAllSubscriptions(): Promise<Subscription[]>

// Atualizar plano de usuário
updateUserPlan(userId: string, planCode: string): Promise<void>

// Deletar usuário (funcionalidade existente)
deleteUser(userId: string): Promise<void>
```

---

## 6. Edge Functions

### 6.1 create-checkout

**Endpoint:** `https://[project].supabase.co/functions/v1/create-checkout`

**Método:** POST

**Headers:**
```
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Body:**
```typescript
{
  priceId: string  // Stripe Price ID
}
```

**Resposta (200):**
```typescript
{
  url: string  // URL do checkout Stripe
}
```

**Resposta (400):**
```typescript
{
  error: string  // Mensagem de erro
}
```

**Validações:**
- Authorization obrigatório
- priceId deve estar em ALLOWED_PRICE_IDS

### 6.2 stripe-webhook

**Endpoint:** `https://[project].supabase.co/functions/v1/stripe-webhook`

**Método:** POST

**Headers:**
```
Stripe-Signature: <signature>
Content-Type: application/json
```

**Body:** Stripe event payload

**Eventos processados:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Resposta (200):** `{ received: true }`

### 6.3 manage-subscription

**Endpoint:** `https://[project].supabase.co/functions/v1/manage-subscription`

**Método:** POST

**Headers:**
```
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Body (cancel):**
```typescript
{
  action: 'cancel',
  cancelAtPeriodEnd: boolean
}
```

**Body (resume):**
```typescript
{
  action: 'resume'
}
```

**Body (update):**
```typescript
{
  action: 'update',
  priceId: string
}
```

**Resposta (200):**
```typescript
{
  success: boolean;
  message: string;
  new_plan?: string;
  status?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: string;
}
```

### 6.4 delete-user

**Endpoint:** `https://[project].supabase.co/functions/v1/delete-user`

**Método:** POST

**Headers:**
```
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Body:**
```typescript
{
  userId: string
}
```

**Resposta (200):**
```typescript
{
  success: boolean;
  message: string;
}
```

---

## 7. Operações Diretas (SQL)

Além da SDK, o frontend pode fazer Queries diretas:

### 7.1 Queries Simples

```typescript
// Sem necessidade de service
await supabase.from('table').select('*').eq('user_id', user.id)
await supabase.from('table').insert([{ ... }])
await supabase.from('table').update({ ... }).eq('id', id)
await supabase.from('table').delete().eq('id', id)
```

### 7.2 Aggregations

```typescript
// Soma de transactions
await supabase.rpc('sum_transactions', { p_user_id: user.id, p_type: 'expense' })

// Saldo total
await supabase.rpc('calculate_balance', { p_user_id: user.id })
```

**Nota:** Funções RPC não estãodocumentadas no código verificado.

---

## 8. Resumo de API por Entidade

| Entidade | Create | Read | Update | Delete |
|----------|--------|------|--------|--------|
| accounts | ✅ | ✅ | ✅ | ✅ |
| transactions | ✅ | ✅ | ✅ | ✅ |
| credit_card_transactions | ✅ | ✅ | ✅ | - |
| categories | ✅ | ✅ | ✅ | ✅ |
| subcategories | ✅ | ✅ | ✅ | ✅ |
| contacts | ✅ | ✅ | ✅ | ✅ |
| goals | ✅ | ✅ | ✅ | ✅ |
| goal_contributions | ✅ | - | - | - |
| investments | ✅ | ✅ | ✅ | ✅ |
| loans | ✅ | ✅ | ✅ | ✅ |
| loan_payments | ✅ | ✅ | - | - |
| recurring_transactions | ✅ | ✅ | ✅ | ✅ |
| profiles | - | ✅ | ✅ | - |
| notifications | - | ✅ | ✅ | - |

---

## 9. Códigos de Erro

| Código | Significado | Origem |
|--------|-----------|--------|
| ERR_AUTH_SESSION_EXPIRED | Sessão JWT expirada | Supabase Auth |
| ERR_NOT_AUTHENTICATED | Usuário não logado | SDK |
| ERR_USER_NOT_FOUND | Usuário não existe | Auth |
| ERR_INVALID_EMAIL | Email inválido | Auth |
| ERR_INVALID_PASSWORD | Senha incorreta | Auth |
| ERR_ACCOUNT_LIMIT | Limite atingido | Service |
| ERR_PLAN_INVALID | Plano inválido | create-checkout |
| ERR_STRIPE_ERROR | Erro Stripe | Edge Function |
| ERR_DB_CONSTRAINT | Violação constraint | DB |
| ERR_RLS_DENIED | Acesso negado (RLS) | DB |

---

## 10. Rate Limits e Restrições

| Endpoint | Limit | Nota |
|---------|-------|------|
| getTransactions | N/A | Sem limit documented |
| getDashboardSummary | N/A | Agrega 8 queries |
| startCheckout | N/A | 1 por chamada |
| importBatch | 1000 itens | Estimado (sem doc) |

---

## 11. Ambiguidades

1. **getDashboardSummary:** Retorna dados agregados de 8 queries. Performance?

2. **importBatch:** Parser client-side. Se planilha > 10MB, browser pode travar.

3. **searchUserByEmail:** Usa tabela profiles ou auth.users? (verificado → profiles)

4. **Stripe price IDs:** Estão em ALLOWED_PRICE_IDS (hardcoded). Se adicionar novo plano, precisa atualizar Edge Function.

---

**Próximo passo:** Serviços e casos de uso.