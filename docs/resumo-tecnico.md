# 📋 Resumo Técnico - SmartMoney

## Visão Geral do Projeto

| Item | Detalhe |
|------|---------|
| **Nome** | SmartMoney |
| **Tipo** | plataforma SaaS de finanças pessoais |
| **Modelo** | Multi-tenant com assinatura recorrente |
| **Stack** | Angular 21 + Supabase + Stripe |

---

## Stack Tecnológica

### Frontend
- **Framework**: Angular 21 (standalone components, signals)
- **UI**: Angular Material + Tailwind CSS
- **Estado**: RxJS + Signals
- **Testes**: Vitest

### Backend
- **DB**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (JWT)
- **API**: Supabase Edge Functions (Deno)
- **Storage**: Supabase Storage

### Integrações
- **Pagamentos**: Stripe
- **Planilhas**: xlsx (SheetJS)

---

## Arquitetura do Sistema

```
┌─────────────────┐
│  Frontend (Angular)
└────────┬────────┘
         │ HTTP/SDK
         ▼
┌─────────────────┐
│  Supabase (DB + Auth + Edge Functions)
└────────┬────────┘
         │ HTTP/Webhooks
         ▼
┌─────────────────┐
│  Stripe (Billing)
└─────────────────┘
```

---

## Estrutura de Diretórios

```
src/
├── app/
│   ├── core/
│   │   ├── constants/     # PLAN_PRICE_IDS, PLAN_FEATURES
│   │   ├── guards/        # Admin guard
│   │   ├── models/        # Tipos TypeScript
│   │   └── services/      # Supabase, Billing, Import, etc.
│   ├── features/
│   │   ├── accounts/     # Lista contas, extrato, form
│   │   ├── transactions/ # Lançamentos, transfers, recurring
│   │   ├── goals/        # Metas, contribuições
│   │   ├── investments/  # Portfólio investimentos
│   │   ├── loans/        # Empréstimos
│   │   ├── credit-cards/ # Cartões de crédito
│   │   ├── categories/    # Categorias, subcategorias
│   │   ├── import/       # Importação planilhas
│   │   ├── subscription/# Checkout + status
│   │   ├── admin/        # Dashboard, users, plans
│   │   └── ...
│   └── shared/            # Componentes compartilhados
supabase/
├── functions/
│   ├── create-checkout/  # Cria sessão Stripe
│   ├── stripe-webhook/  # Processa eventos Stripe
│   ├── manage-subscription/ # Update/cancel/resume
│   └── delete-user/     # Deleta usuário
```

---

## Rotas Principais

| Rota | Componente | Descrição |
|------|-------------|-----------|
| `/dashboard` | DashboardComponent | Painel principal |
| `/accounts` | AccountsListComponent | Lista de contas |
| `/statement` | AccountStatementComponent | Extrato detalhado |
| `/transactions` | TransfersComponent | Transferências |
| `/lancamentos` | TransactionsPageComponent | Lançamentos mensais |
| `/goals` | GoalsComponent | Metas financeiras |
| `/investments` | InvestmentsComponent | Portfólio |
| `/loans` | LoansPageComponent | Empréstimos |
| `/credit-cards` | CreditCardsPageComponent | Cartões |
| `/subscription` | SubscriptionPageComponent | Minha assinatura |
| `/importacao` | ImportacaoPageComponent | Importar planilha |
| `/admin-dashboard` | AdminDashboardComponent | Painel admin |

---

## Modelos de Dados Principais

### Tabelas do Banco
- `accounts` - Contas do usuário
- `transactions` - Transações/lançamentos
- `categories` - Categorias de gastos
- `subcategories` - Subcategorias
- `goals` - Metas financeiras
- `goal_contributions` - Aportes em metas
- `investments` - Investimentos
- `loans` - Empréstimos
- `credit_cards` - Cartões de crédito
- `contacts` - Contatos/favorecidos
- `plans` - Planos disponíveis
- `user_subscriptions` - Assinaturas ativas
- `user_invites` - Convites family

---

## Edge Functions

| Função | Responsabilidade |
|--------|------------------|
| `create-checkout` | Cria sessão de checkout Stripe |
| `stripe-webhook` | Processa eventos de pagamento |
| `manage-subscription` | Update/cancel/resume assinatura |
| `delete-user` | Deleta usuário e dados relacionados |
| `debug-env` | Debug de variáveis de ambiente |

---

## Controle de Acesso

### feature-access.service.ts
```typescript
hasFeature(feature: string): boolean
canAccess(resource: string): boolean
```

### Plano Basic
- `accounts:2`, `cards:1`

### Plano Pro
- `accounts:5`, `cards:3`, `account_transfers`

### Plano Master
- `accounts:unlimited`, `cards:unlimited`, `account_transfers`, `goals`, `bulk_import`

### Plano Ultra
- + `loans`, `investments`

### Plano Family
- + `shared_accounts`

---

## Integração Stripe

### Price IDs
- Pro: `price_1TFeUxKEGcZcVMwNTnqgIusz`
- Master: `price_1TFeVfKEGcZcVMwNAHVc9yiP`
- Family: `price_1TFeW5KEGcZcVMwNw7xxTHXv`

### Eventos Handleados
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## Comandos Úteis

```bash
# Dev server
npm run dev

# Build
npm run build

# Testes
npm run test

# Lint
npm run lint
```

---

## Status do Projeto

| Módulo | Status |
|--------|--------|
| Auth | ✅ Completo |
| Dashboard | ✅ Completo |
| Accounts | ✅ Completo |
| Transactions | ✅ Completo |
| Goals | ✅ Completo |
| Investments | ✅ Completo |
| Loans | ✅ Completo |
| Credit Cards | ✅ Completo |
| Categories | ✅ Completo |
| Import | ✅ Completo |
| Subscription/Billing | ✅ Completo |
| Admin | ✅ Completo |
| Recurring Transactions | ⚠️ Partial |
| Notificações | ⚠️ Partial |
| Testes | 🔄 Em progresso |

---

## Pontos Críticos

### Segurança
- Nunca expor `STRIPE_SECRET_KEY` no frontend
- RLS ativo em todas as tabelas
- Validação de assinatura em Edge Functions

### Webhooks
- Devem ser idempotentes
- Stripe pode reenviar eventos

### Estado da Assinatura
Usuário é premium se:
- `status = active` ou `trialing`
- `cancel_at_period_end = false`