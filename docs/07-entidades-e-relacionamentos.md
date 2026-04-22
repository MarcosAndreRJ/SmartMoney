# Entidades e Relacionamentos - SmartMoney

## Visão Geral

Este documento lista todas as entidades do banco de dados com seus atributos, tipos e relacionamentos. O modelo émulti-tenant onde cada registro pertence a um user_id.

---

## Entidades Principais

### 1. accounts

Contas bancárias e cartões de crédito do usuário.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| institution_name | text | ✅ | Nome do banco/financeira |
| account_type | text | ✅ | checking / savings / credit_card / investment |
| initial_balance | numeric | ✅ | Saldo inicial |
| credit_limit | numeric | ❌ | Limite do cartão (se credit_card) |
| closing_date | integer | ❌ | Dia de fechamento da fatura |
| due_date | integer | ❌ | Dia de vencimento da fatura |
| agency_number | text | ❌ | Número da agência |
| account_number | text | ❌ | Número da conta |
| card_name | text | ❌ | Nome no cartão |
| card_number | text | ❌ | Número do cartão (mascarado) |
| card_expiration | text | ❌ | Validade (MM/AA) |
| card_cvv | text | ❌ | CVV |
| color | text | ❌ | Cor do card no UI (#FF5500) |
| icon | text | ❌ | Ícone (bank, wallet, credit-card) |
| is_main_account | boolean | ✅ | É conta principal |
| created_at | timestamp | ✅ | Data de criação |

**Índices:**
- PRIMARY KEY (id)
- INDEX on user_id
- UNIQUE constraint (user_id, institution_name, account_type) — opcional

---

### 2. transactions

Lançamentos financeiros (receitas, despesas, transferências).

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| account_id | uuid | ✅ | FK → accounts.id |
| description | text | ✅ | Descrição da transação |
| amount | numeric | ✅ | Valor (sempre positivo) |
| date | date | ✅ | Data da transação |
| category | text | ✅ | Nome da categoria |
| type | text | ✅ | income / expense / transfer |
| status | text | ✅ | confirmed / pending / cancelled |
| recurring_source_id | uuid | ❌ | FK → recurring_transactions.id |
| reference_id | uuid | ❌ | ID da transação relacionada (transfer) |
| created_at | timestamp | ✅ | Data de criação |

**Índices:**
- PRIMARY KEY (id)
- INDEX on user_id
- INDEX on account_id
- INDEX on date
- INDEX on type

**Regras de Negócio:**
- amount sempre positivo (tipo determinado por type)
- transfer cria duas transactions com reference_id

---

### 3. credit_card_transactions

Transações de cartão de crédito (separadas de transactions).

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| card_id | uuid | ✅ | FK → accounts.id (account_type = credit_card) |
| description | text | ✅ | Descrição |
| amount | numeric | ✅ | Valor |
| date | date | ✅ | Data da transação |
| category | text | ✅ | Categoria |
| status | text | ✅ | confirmed / pending |
| created_at | timestamp | ✅ | Data de criação |

**Relacionamento:**
- card_id → accounts.id (card)
- amount é soma na fatura

---

### 4. categories

Categorias de despesas/receitas (hierárquicas).

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| name | text | ✅ | Nome da categoria |
| icon | text | ❌ | Ícone |
| color | text | ❌ | Cor (#hex) |
| type | text | ✅ | income / expense |
| parent_id | uuid | ❌ | FK → categories.id (self reference) |
| created_at | timestamp | ✅ | Data de criação |

**Estrutura:**
- parent_id = NULL → categoria principal
- parent_id = <id> → subcategoria

---

### 5. goals

Metas financeiras.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| name | text | ✅ | Nome da meta |
| description | text | ❌ | Descrição |
| icon | text | ❌ | Ícone |
| color | text | ❌ | Cor |
| target_amount | numeric | ✅ | Valor objetivo |
| target_date | date | ❌ | Data alvo |
| created_at | timestamp | ✅ | Data de criação |

---

### 6. goal_contributions

Aportes em metas.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| goal_id | uuid | ✅ | FK → goals.id |
| amount | numeric | ✅ | Valor do aporte |
| date | date | ✅ | Data do aporte |
| note | text | ❌ | Nota |
| created_at | timestamp | ✅ | Data de criação |

**Relacionamento:**
- goal_id → goals.id (CASCADE delete)

---

### 7. investments

Portfólio de investimentos.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| name | text | ✅ | Nome do investimento |
| type | text | ✅ | Tipo (renda_fixa, acoes, crypto, etc.) |
| amount | numeric | ✅ | Valor atual |
| amount_invested | numeric | ✅ | Valor investido |
| yield | numeric | ✅ | Rendimento (amount - amount_invested) |
| created_at | timestamp | ✅ | Data de criação |

**Fórmula:**
- yield = amount - amount_invested

---

### 8. loans

Empréstimos.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| creditor_name | text | ✅ | Nome do credor |
| type | text | ✅ | fixed / interest |
| initial_amount | numeric | ✅ | Valor original |
| current_balance | numeric | ✅ | Saldo devedor atual |
| monthly_rate | numeric | ❌ | Taxa mensal (%) |
| total_installments | integer | ❌ | Total de parcelas |
| paid_installments | integer | ✅ | Parcelas pagas |
| installment_amount | numeric | ❌ | Valor da parcela |
| due_day | integer | ✅ | Dia de vencimento |
| start_date | date | ✅ | Data de início |
| status | text | ✅ | active / paid / overdue |
| total_paid | numeric | ✅ | Total pago |
| created_at | timestamp | ✅ | Data de criação |

---

### 9. loan_payments

Pagamentos de empréstimo.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| loan_id | uuid | ✅ | FK → loans.id |
| user_id | uuid | ✅ | FK → auth.users.id |
| account_id | uuid | ❌ | FK → accounts.id |
| payment_date | date | ✅ | Data do pagamento |
| amount_paid | numeric | ✅ | Valor pago |
| interest_portion | numeric | ✅ | Parcela de juros |
| principal_portion | numeric | ✅ | Parcela principal |
| installment_number | integer | ❌ | Número da parcela |
| balance_before | numeric | ✅ | Saldo antes |
| balance_after | numeric | ✅ | Saldo depois |
| notes | text | ❌ | Notas |
| created_at | timestamp | ✅ | Data de criação |

---

### 10. recurring_transactions

Transações recorrentes (templates).

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| account_id | uuid | ✅ | FK → accounts.id |
| name | text | ✅ | Nome |
| type | text | ✅ | income / expense |
| amount | numeric | ✅ | Valor |
| frequency | text | ✅ | daily / weekly / monthly |
| day_of_month | integer | ❌ | Dia do mês (se monthly) |
| start_date | date | ✅ | Data de início |
| end_date | date | ❌ | Data de fim |
| is_active | boolean | ✅ | Ativo |
| created_at | timestamp | ✅ | Data de criação |

---

### 11. contacts

Contatos e favorecidos.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| name | text | ✅ | Nome |
| email | text | ❌ | Email |
| bank_name | text | ❌ | Banco |
| bank_agency | text | ❌ | Agência |
| account_number | text | ❌ | Conta |
| tax_id | text | ❌ | CPF/CNPJ |
| pix_key | text | ❌ | Chave PIX |
| is_favorite | boolean | ✅ | Favorito |
| created_at | timestamp | ✅ | Data de criação |

---

### 12. profiles

Perfil estendido do usuário (alem do auth.users).

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK (→ auth.users.id) |
| user_id | uuid | ✅ | FK → auth.users.id |
| full_name | text | ❌ | Nome completo |
| email | text | ✅ | Email |
| avatar_url | text | ❌ | URL do avatar |
| birth_date | date | ❌ | Data de nascimento |
| is_admin | boolean | ✅ | É admin |
| created_at | timestamp | ✅ | Data de criação |

**Nota:** is_admin controla acesso às rotas admin.

---

### 13. plans

Planos disponíveis.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| slug | text | ✅ | Código (basic, pro, master, family) |
| name | text | ✅ | Nome exibido |
| price_id | text | ✅ | Stripe Price ID |
| resources | jsonb | ✅ | { max_accounts, max_cards, features } |
| is_active | boolean | ✅ | Ativo |
| created_at | timestamp | ✅ | Data de criação |

---

### 14. user_subscriptions

Assinaturas ativas.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| stripe_subscription_id | text | ✅ | ID na Stripe |
| stripe_customer_id | text | ✅ | ID do cliente na Stripe |
| plan_code | text | ✅ | basic/pro/master/ultra/family |
| status | text | ✅ | active/trialing/past_due/canceled |
| is_premium_active | boolean | ✅ | Premium ativo |
| cancel_at_period_end | boolean | ✅ | Cancelar ao fim |
| current_period_start | timestamp | ✅ | Início do período |
| current_period_end | timestamp | ✅ | Fim do período |
| created_at | timestamp | ✅ | Data de criação |
| updated_at | timestamp | ✅ | Data de atualização |

---

### 15. user_invites

Convites de membros family.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| user_id | uuid | ✅ | FK → auth.users.id (quem convida) |
| invitee_email | text | ✅ | Email do convidado |
| status | text | ✅ | pending/accepted/expired |
| token | text | ✅ | Token do convite |
| expires_at | timestamp | ✅ | Data de expiração |
| created_at | timestamp | ✅ | Data de criação |

---

### 16. shared_accounts

Contas compartilhadas (family).

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | ✅ | PK |
| owner_id | uuid | ✅ | FK → auth.users.id (dono) |
| member_id | uuid | ✅ | FK → auth.users.id (membro) |
| account_id | uuid | ✅ | FK → accounts.id |
| permission | text | ✅ | read / write / admin |
| created_at | timestamp | ✅ | Data de criação |

---

### 17. notifications

Notificações do sistema.

| Atributo | Tipo | Obrigatório | Descrição |
|---------|------|-------------|-----------|
| id | uuid | �� | PK |
| user_id | uuid | ✅ | FK → auth.users.id |
| type | text | ✅ | Tipo (payment_failed, goal_reached, etc.) |
| title | text | ✅ | Título |
| message | text | ✅ | Mensagem |
| is_read | boolean | ✅ | Lida |
| created_at | timestamp | ✅ | Data de criação |

**Nota:** Serviços não implementados. Apenas estrutura.

---

## Relacionamentos

### Diagrama

```
auth.users (1) ──< (N) accounts
auth.users (1) ──< (N) transactions
auth.users (1) ──< (N) credit_card_transactions
auth.users (1) ──< (N) categories
auth.users (1) ──< (N) goals
goals (1) ──< (N) goal_contributions
auth.users (1) ──< (N) investments
auth.users (1) ──< (N) loans
loans (1) ──< (N) loan_payments
auth.users (1) ──< (N) recurring_transactions
auth.users (1) ──< (N) contacts
auth.users (1) ──< (1) profiles
auth.users (1) ──< (1) user_subscriptions
auth.users (1) ──< (N) user_invites

accounts (1) ──< (N) transactions
accounts (1) ──< (N) credit_card_transactions
accounts (1) ──< (N) recurring_transactions

user_invites (N) ──< (1) auth.users (invitee_email → resolve)
shared_accounts (N) ──< (1) auth.users (owner_id)
shared_accounts (N) ──< (1) auth.users (member_id)
```

### Descrição das Relações

| Relacionamento | Descrição | Integridade |
|---------------|-----------|-------------|
| accounts.user_id → users.id | Uma conta pertence a um usuário | CASCADE (se deleter usuário, deleta contas) |
| transactions.account_id → accounts.id | Transação pertence a uma conta | CASCADE |
| goals.user_id → users.id | Meta pertence a usuário | CASCADE |
| goal_contributions.goal_id → goals.id | Aporte pertence a meta | CASCADE |
| loans.user_id → users.id | Empréstimo pertence a usuário | CASCADE |
| loan_payments.loan_id → loans.id | Pagamento pertence a empréstimo | CASCADE |
| categories.parent_id → categories.id | Subcategoria → categoria principal | SET NULL (se deletar categoria) |
| recurring_transactions.account_id → accounts.id | Template → conta | CASCADE |
| user_invites.user_id → users.id | Convite enviado por usuário | CASCADE |
| shared_accounts.account_id → accounts.id | Compartilhamento → conta | CASCADE |

---

##完整性 Regras (Constraints)

### Tabelas com Constraints

| Tabela | Constraint | Descrição |
|--------|-----------|----------|
| accounts | UNIQUE (user_id, institution_name, account_type) | Uma conta por tipo |
| transactions | CHECK (amount > 0) | Valor positivo |
| transactions | CHECK (type IN ('income','expense','transfer')) | Tipo válido |
| transactions | CHECK (status IN ('confirmed','pending','cancelled')) | Status válido |
| categories | CHECK (type IN ('income','expense')) | Tipo válido |
| loans | CHECK (type IN ('fixed','interest')) | Tipo válido |
| loans | CHECK (status IN ('active','paid','overdue')) | Status válido |
| recurring_transactions | CHECK (frequency IN ('daily','weekly','monthly')) | Frequência válida |

---

## Views

### active_user_plan

View otimizada para buscar plano ativo do usuário:

```sql
CREATE VIEW active_user_plan AS
SELECT us.user_id, us.plan_code, us.status, us.is_premium_active,
       us.current_period_end
FROM user_subscriptions us
WHERE us.status IN ('active', 'trialing')
  AND us.cancel_at_period_end = false
ORDER BY us.current_period_end DESC
LIMIT 1;
```

**Uso:**
- billingService.getUserPlan() consulta esta view
- Feature access consulta esta view

---

## Entidades Não Implementadas

| Entidade | Descrição | Status |
|---------|-----------|--------|
| audit_logs | LOG de alterações | Não existe |
| api_keys | Keys para API externa | Não existe |
| webhooks_conf | Config de webhooks | Não existe |
| tax_documents | Documentos fiscais | Não existe |

---

## Resumo

| Entidade | CRUD | Dependentes |
|---------|-----|-----------|
| accounts | ✅ completa | transactions, recurring, shared |
| transactions | ✅ completa | recurring_source |
| credit_card_transactions | ✅ completa | - |
| categories | ✅ completa | subcategories |
| goals | ✅ completa | contributions |
| investments | ✅ completa | - |
| loans | ✅ completa | payments |
| recurring_transactions | ✅ parcial | - |
| contacts | ✅ completa | - |
| profiles | ✅ parcial | - |
| plans | ✅ administrativa | - |
| user_subscriptions | ✅ completa | - |
| user_invites | ✅ parcial | - |
| shared_accounts | ✅ parcial | - |
| notifications | ✅ estrutura | - |

---

**Próximo passo:** API (SDK + Edge Functions).