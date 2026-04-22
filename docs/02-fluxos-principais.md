# Fluxos Principais - SmartMoney

## Visão Geral dos Fluxos

O sistema possui fluxos principais que representam as operações mais críticas:

1. **Autenticação** — Login, registro, sessão
2. **Checkout (Upgrade)** — Escolha de plano → pagamento → ativação
3. **Gestão de Assinatura** — Cancel, update, resume
4. **CRUD de Entidades** — Accounts, transactions, goals, etc.
5. **Bulk Import** — Planilha → transações
6. **Recurring Transactions** — Agendamento → geração automática
7. **Admin** — Gestão de usuários/planos

Cada fluxo tem atores, passos, validações e respostas definidas.

---

## Fluxo 1: Autenticação

### Atores

- **Usuário:** Pessoa que acessa o sistema
- **Supabase Auth:** Provedor de identidade
- **Frontend:** Angular app

### Pré-condições

- Usuário não está logado (sem JWT válido)
- App carrega página inicial

### Passo a Passo

```
1. App redireciona para auth.component (ou detecta ausência de token)
2. Usuário insere email + senha (ouGoogle)
3. Frontend chama supabase.auth.signInWithPassword({ email, password })
   ou signInWithOAuth({ provider: 'google' })
4. Supabase Auth valida credentials
5. Se válido: retorna { session: { access_token, refresh_token, user } }
   Se inválido: retorna erro (usuário/senha inválidos)
6. Frontend armazena session (localStorage via SDK)
7. Frontend sincroniza perfil em currentUserProfile signal
8. Redireciona para /dashboard
```

### Validações

| Passo | Validação | Resposta se Falhar |
|-------|-----------|-------------------|
| 3 | Email válido | "Invalid email" |
| 3 | Senha ≥ 6 chars | "Password must be at least 6 characters" |
| 5 | Usuário não existe | "Invalid login credentials" |

### Resposta

- **Sucesso:** Redireciona para `/dashboard`, exibe toast "Bem-vindo!"
- **Falha:** Exibe erro no form, limpa senha

### Efeitos Colaterais

- Token armazenado automaticamente pelo SDK
- currentUserProfile populado com user_metadata
- Queries subsequêntes automaticamente autenticadas

---

## Fluxo 2: Checkout (Upgrade)

### Atores

- **Usuário:** Escolhe plano premium
- **Frontend:** Angular app
- **Edge Function create-checkout:** Cria sessão Stripe
- **Stripe:** CheckoutHosted
- **Webhook:** Processa pagamento

### Pré-condições

- Usuário logado
- Plano atual não tem feature desejada
- Redirecionado para /subscription

### Passo a Passo

```
1. Usuário escolhe plano (Pro/Master/Family)
2. Frontend chama billingService.startCheckout(priceId)
3. BillingService:
   a. Busca session atual (getSession)
   b. Se expirada: erro "Sessão expirada"
   c. Invoca Edge Function 'create-checkout'
4. Edge Function create-checkout:
   a. Valida Authorization header
   b. Extrai token JWT
   c. Valida priceId contra ALLOWED_PRICE_IDS
   d. Se inválido: erro "Plano inválido"
   e. Busca user via supabase.auth.getUser(token)
   f. Busca stripe_customer_id em user_subscriptions
   g. Se não existe: cria Stripe Customer
   h. Cria Stripe Checkout Session
   i. Retorna { url: checkout.stripe.com/... }
5. Frontend redireciona para URL retornada
6. Usuário preenche dados Stripe e confirma
7. Stripe redirect para APP_URL/?checkout=success
8. Stripe webhook dispara evento:
   - checkout.session.completed
   - customer.subscription.created
9. Edge Function stripe-webhook:
   a. Valida STRIPE_WEBHOOK_SECRET
   b. Processa evento
   c. Insere/atualiza user_subscriptions
10. Frontend carrega, detecta ?checkout=success
11. billingService.getUserPlan() retorna premium
12. UI atualiza para mostrar recursos premium
```

### Validações

| Passo | Validação | Resposta se Falhar |
|-------|-----------|-------------------|
| 3 | Session válida | "Sessão expirada. Faça login novamente." |
| 4c | priceId em ALLOWED_PRICE_IDS | "Plano inválido para checkout" |
| 4e | Token JWT válido | "Erro ao verificar usuário" |
| 9a | Assinatura do webhook válida | Ignora evento |

### Resposta

- **Sucesso:** URL de checkout retornada, redirect
- **Falha:** Erro shown via toast

### Efeitos Colaterais

- stripe_customer_id criado em user_subscriptions
- subscription_data populada (plan_code, status, etc.)
- Feature flags habilitadas para o user

### Dados Persistidos

```typescript
// user_subscriptions ( após webhook )
{
  user_id: string,
  stripe_subscription_id: string,
  stripe_customer_id: string,
  plan_code: 'pro' | 'master' | 'ultra' | 'family',
  status: 'active' | 'trialing' | 'past_due' | 'canceled',
  is_premium_active: true,
  cancel_at_period_end: false,
  current_period_start: timestamp,
  current_period_end: timestamp
}
```

---

## Fluxo 3: Gestão de Assinatura

### Operações

- **Cancel:** Cancela ao final do período
- **Update:** Troca de plano
- **Resume:** Cancela cancelamento pendente

### 3a. Cancelamento

```
1. Usuário clica "Cancelar assinatura"
2. Modal confirma: "Cancelar ao final do período?"
3. Frontend chama billingService.cancelSubscription(true)
4. billingService:
   a. Busca session
   b. Invoca 'manage-subscription' com action: 'cancel'
5. Edge Function manage-subscription:
   a. Valida auth
   b. Busca subscription atual
   c. Chama Stripe subscriptions.update(id, { cancel_at_period_end: true })
   d. Atualiza user_subscriptions no DB
6. Retorna success
7. UI mostra: "Assinatura cancelada. Acesso até [data]"
```

**Nota:** Não perde acesso imediato. Cancel生效a em current_period_end.

### 3b. Update (Upgrade/Downgrade)

```
1. Usuário escolhe novo plano
2. billingService.updateSubscriptionPlan(newPriceId)
3. manage-subscription com action: 'update', priceId
4. Edge:
   a. Valida auth
   b. Busca subscription atual
   c. Chama Stripe subscriptions.update(id, { items: [{ price: newPriceId }] })
   d. Atualiza user_subscriptions.plan_code
5. Stripe pro-rata billing (credita uso parcial)
```

### 3c. Resume

```
1. Usuário clica "Manter assinatura"
2. billingService.resumeSubscription()
3. manage-subscription com action: 'resume'
4. Edge:
   a. Busca subscription com cancel_at_period_end: true
   b. Chama subscriptions.update(id, { cancel_at_period_end: false })
   c. Atualiza DB
```

### Validações

| Operação | Condição | Resposta |
|----------|----------|----------|
| Cancel | Already canceled | "Já cancelado" |
| Update | Plano igual | "Mesmo plano" |
| Resume | Não há cancelamento pendente | "Nada a resumir" |

### Estados da Assinatura

| status | is_premium_active | Acesso | Descrição |
|--------|------------------|---------|----------|
| active | true | ✅ | Plano ativo |
| trialing | true | ✅ | Período de teste |
| past_due | true | ⚠️ | Pagamento falhou |
| canceled | false | ❌ | Cancelado (após período) |

---

## Fluxo 4: CRUD de Entidades

### Fluxo Genérico

```
1. Usuário acessa página (ex: /accounts)
2. Component carrega dados (ngOnInit → service.getItems())
3. Service faz query: supabase.from('table').select('*').eq('user_id', user.id)
4. Component exibe dados (cards, lista)
5. Usuário cria/editar:
   a. Abre form/modal
   b. Preenche dados
   c. Clica "Salvar"
6. Service faz: supabase.from('table').insert/update/delete
7. DB valida (constraints, RLS)
8. Service retorna { data, error }
9. Component:
   a. Se sucesso: toast "Sucesso!", reload dados, fecha modal
   b. Se erro: toast erro
```

### Exemplo: Criar Conta

```
1. /accounts → accounts-list.component.ts
2. ngOnInit → supabase.getAccounts()
3. AccountsListComponent exibe contas
4. Usuário clica "+ Nova Conta"
5. Abre account-form.component.ts
6. Preenche: nome, tipo (checking/savings/credit_card), initial_balance
7. Usuário clica "Salvar"
8. supabase.createAccount({ institution_name, account_type, initial_balance, ... })
9. Supabase:
   - Gera id (uuid)
   - Cria registro com user_id
   - Retorna registro criado
10. accounts-list → reload
11. Toast "Conta criada!"
```

### Validações Genéricas

| Passo | Validação | Resposta |
|-------|-----------|----------|
| 3 | user_id existe | Se não logado, redirect login |
| 8 | Campos obrigatórios | Erro "X é obrigatório" |
| 8 | unique constraint | Erro "Já existe" |
| 8 | RLS denies | Erro "Acesso negado" |

---

## Fluxo 5: Bulk Import (Planilha)

### Atores

- **Usuário:** Faz upload de planilha
- **Frontend:** ImportService + ImportParserService
- **DB:** Inserção em transactions

### Passo a Passo

```
1. Usuário acessa /importacao
2. Clica "Selecionar arquivo" → input type="file" (.xlsx)
3. importacao-upload.component.ts:
   a. Input change event
   b. Chama importParser.parseExcelFile(file)
4. ImportParserService (client):
   a. FileReader lê como ArrayBuffer
   b. XLSX.read() → workbook
   c. sheet_to_json() → dados[]
   d. identifyColumns() → mapeia headers
   e. mapRowToImportItem() → cada linha → ImportItem
5. importacao-preview.component.ts exibe preview:
   - Data, descrição, valor, tipo, categoria
   - Status: VALID / WARNING / INVALID
6. Usuário revisa, confirma
7. import-service.importBatch(items):
   a. Filtra items.selected (status != INVALID)
   b. supabase.from('transactions').insert(batch)
8. Toast "X transações importadas!"
```

### Heurísticas do Parser

**Identificação de colunas:**

| Header | Keys procuradas |
|--------|-----------------|
| date | "data", "date", "dia" |
| description | "descrição", "histórico", "estabelecimento" |
| amount | "valor", "amount", "total" |
| category | "categoria" |
| type | "tipo", "movimentação" |

**Tipo (income/expense):**

- Se coluna "tipo" existe: keywords em "receita", "despesa", etc.
- Fallback: amount ≥ 0 → income, amount < 0 → expense

**Categoria por descrição:**

- Keywords: "ifood" → "Alimentação", "uber" → "Transporte", etc.

### Estados dos Items

| Status | Quando | Selected |
|--------|--------|----------|
| VALID | data válida + amount válido | ✅ true |
| WARNING | data/amount OK, mas sem categoria | ✅ true |
| INVALID | data ou amount ausentes | ❌ false |

### Validações

| Passo | Validação | Resposta |
|-------|-----------|----------|
| 4 | Arquivo vazio | Toast "Arquivo vazio" |
| 4 | Headers insuficientes | Toast "Colunas insuficientes" |
| 7 | DB error | Toast erro, não importou parcial |

---

## Fluxo 6: Recurring Transactions

### Atores

- **Usuário:** Cria lançamento recorrente
- **Frontend:** RecurringTransactionsComponent
- **Service:** RecurringSchedulerService (?)
- **DB:** recurring_transactions → transactions

### Criação

```
1. Usuário acessa /recurring
2. Clica "+ Nova recorrente"
3. Preenche form:
   - Conta destino
   - Tipo (income/expense)
   - Amount
   - Frequência (daily/weekly/monthly)
   - Dia do mês (se monthly)
   - Data início
   - Data fim (opcional)
4. Salva em recurring_transactions
```

### Execução (AGUARDA CLARIFICAR)

```
1. Scheduler detecta item ativo (is_active = true)
2. Verifica se data atual >= próxima execução
3. Cria transaction com:
   - recurring_source_id = recurring_transaction.id
   - Demais campos copiados
4. Atualiza próxima data de execução
```

**Ambíguo:** O scheduler rodando? Não há cron jobno Supabase. Ver implementação.

---

## Fluxo 7: Admin

### Atores

- **Admin:** Usuário com is_admin = true
- **Frontend:** Páginas admin
- **AdminService:** Queries administrativas

### Funcionalidades

| Rota | Função |
|------|--------|
| /admin-dashboard | Stats gerais |
| /admin-users | Lista usuários, busca por email |
| /admin-plans | CRUD de planos |
| /admin-subscriptions | Lista assinaturas, busca |
| /admin-transactions | Busca transações por user_id |
| /admin-notifications | Envia notificação manual |

### Acesso

```
1. Usuário acessa /admin-*
2. adminGuard.canActivate()
3. Verifica is_admin no perfil
4. Se false: redirect /dashboard
5. Se true: permite acesso
```

---

## Fluxo 8: Dashboard Summary

### Aggregations

O dashboard chama getDashboardSummary() que agrega 8 queries:

```
1. accounts → saldo total
2. transactions → income, expense, balance
3. loans → total loans
4. goals → metas
5. goal_contributions → aportes em metas
6. categories → gastos por categoria
7. recurring_transactions → fixed movements
8. credit_card_transactions → fatura cartão
```

### Cálculos

| Métrica | Como |
|--------|------|
| totalBalance | sum(initial_balance) + sum(income) - sum(expense) |
| monthlySpending | transactions do mês atual + card transactions |
| predictedBalance | totalBalance + pendingIncome - pendingExpense |
| balanceChange | ((este_mês - último_mês) / último_mês) * 100 |
| goals progress | sum(contributions) / target_amount * 100 |

---

## Erros Comuns e Tratamento

| Erro | Origem | Tratamento |
|------|--------|------------|
| "Sessão expirada" | Session JWT inválida | Redirect para login |
| "Não autenticado" | Sem user | Redirect para login |
| "Acesso negado" | RLS nega | Mostrar mensagem |
| "Plano inválido" | priceId não permitido | Toast erro |
| "Erro ao criar checkout" | Stripe API | Toast com mensagem |
| "Erro ao importar" | Parser ou DB | Toast, mostra erros |

---

## Resumo Fluxos → Componentes

| Fluxo | Frontend | Backend | DB |
|------|---------|---------|-----|
| Auth | auth.component.ts | Supabase Auth | auth.users |
| Checkout | billing.service.ts | create-checkout/ | user_subscriptions |
| Cancel/Update | billing.service.ts | manage-subscription/ | user_subscriptions |
| CRUD | supabase.service.ts | SDK | Várias tabelas |
| Import | import*.service.ts | SDK | transactions |
| Recurring | recurring-scheduler.service.ts | ? | recurring_transactions |
| Admin | admin*.service.ts | SDK | users, plans |

---

**Próximo passo:** Regras de negócio consolidadas.