# 💰 SmartMoney — Documentação Técnica (Versão Estruturada)

---

## 🚀 1. Visão Geral do Projeto

**Nome:** SmartMoney
**Tipo:** Plataforma SaaS de finanças pessoais
**Modelo:** Multi-tenant com assinatura recorrente

### 🎯 Objetivo

Permitir que usuários gerenciem:

* Contas financeiras
* Transações
* Metas
* Cartões
* Assinaturas (planos)

---

## 🧰 2. Stack Tecnológica

### 🎨 Frontend

* Angular 15+
* Standalone Components
* Signals
* Angular Material

### ⚙️ Backend

* Supabase

  * PostgreSQL
  * Auth (JWT)
  * Edge Functions (Deno)

### 💳 Integrações

* Stripe → pagamentos e assinaturas
* Supabase Storage → arquivos/avatars

---

## 🏗️ 3. Arquitetura do Sistema

```
Frontend (Angular)
   ↓
Supabase (Auth + DB + Edge Functions)
   ↓
Stripe (Billing)
```

### 🔁 Comunicação

| Origem   | Destino  | Como              |
| -------- | -------- | ----------------- |
| Frontend | Supabase | SDK (supabase-js) |
| Supabase | Stripe   | Edge Functions    |
| Stripe   | Supabase | Webhooks          |

---

## 🧠 Responsabilidades

### 🖥️ Frontend

* Interface (UI/UX)
* Estado local
* Fluxo do usuário

### 🗄️ Supabase (DB)

* Persistência
* RLS (segurança)
* Views

### ⚡ Edge Functions

* Lógica crítica
* Integração com Stripe
* Segurança

### 💳 Stripe

* Pagamentos
* Assinaturas
* Cobrança recorrente

---

## ✨ 4. Funcionalidades Principais

* 📊 Controle financeiro (contas, transações)
* 🎯 Metas financeiras
* 💳 Cartões de crédito
* 🔐 Controle por plano (feature flags)
* 💰 Assinaturas com Stripe
* 📄 Histórico de pagamentos
* 🔄 Upgrade / downgrade / cancelamento

---

## 💼 5. Planos e Permissões

### 🪙 Planos disponíveis

| Plano  | Preço    | Recursos                                  |
| ------ | -------- | ----------------------------------------- |
| Basic  | Gratuito | 2 contas, 1 cartão                        |
| Pro    | R$14,90  | 5 contas, 3 cartões                       |
| Master | R$29,90  | Ilimitado + empréstimos                   |
| Family | R$49,90  | Master + compartilhamento + investimentos |

---

### 🧩 Tipos de controle

* 🔢 Limites (contas, cartões)
* ✅ Features (booleanas)
* 👨‍👩‍👧 Family → compartilhamento

---

### 🔐 Controle de acesso

**Frontend:**

* `feature-access.service.ts`
* Métodos:

  * `hasFeature()`
  * `canAccess()`

**Backend:**

* RLS (Supabase)
* Validação nas Edge Functions

---

## 🗄️ 6. Estrutura de Dados

### 📌 Tabelas principais

* `auth.users` → usuários
* `plans` → planos disponíveis
* `user_subscriptions` → assinaturas ativas
* `subscriptions` → legacy
* `active_user_plan` → view otimizada

---

### ⚠️ Campos críticos

* `status`
* `plan_code`
* `stripe_subscription_id`
* `cancel_at_period_end`
* `current_period_end`

---

## 🔄 7. Fluxos do Sistema

---

### 🔐 Autenticação

1. Login via Supabase
2. JWT gerado
3. Sessão validada no frontend
4. Rotas protegidas

---

### 💳 Assinatura (Upgrade)

1. Usuário escolhe plano
2. Front chama `create-checkout`
3. Stripe retorna URL
4. Usuário paga
5. Redirecionamento de volta

---

### 🔁 Webhook (Stripe)

1. Stripe envia evento
2. `stripe-webhook` recebe
3. Valida assinatura
4. Atualiza `user_subscriptions`

---

### 🔄 Alteração de plano

* **Update:** troca plano
* **Cancel:** agenda cancelamento
* **Resume:** cancela cancelamento

---

## 💳 8. Integração com Stripe

### 🧾 Price IDs

* Pro → `price_1TFeUx...`
* Master → `price_1TFeVf...`
* Family → `price_1TFeW5...`

---

### 🛒 Checkout

* 100% via Stripe
* Sem dados sensíveis no frontend

---

### 📡 Webhooks

Eventos tratados:

* `checkout.session.completed`
* `customer.subscription.*`

---

### ⚠️ Não implementado ainda:

* `invoice.payment_failed`
* `invoice.payment_succeeded`

---

## 📊 9. Status Atual do Projeto

### ✅ Funcional

* Auth
* UI de planos
* Checkout Stripe
* Webhook ativo
* Tela de status

---

### ⚠️ Em validação

* Sincronização webhook
* Exibição de plano ativo
* Fluxo downgrade/cancelamento

---

### ❌ Não implementado

* Histórico real de faturas
* Eventos invoice
* Testes automatizados

---

## ⚠️ 10. Pontos Críticos

### 🔒 Segurança

* Nunca expor `STRIPE_SECRET_KEY`

---

### 🔁 Webhooks

* Devem ser idempotentes
* Stripe pode reenviar eventos

---

### 📊 Estado da assinatura

Usuário é premium se:

* `status = active/trialing`
* `cancel_at_period_end = false`

---

### 🔐 RLS

Regra padrão:

```sql
auth.uid() = user_id
```

---

## 🛠️ 11. Edge Functions

### 1. `create-checkout`

* Cria sessão Stripe

---

### 2. `stripe-webhook`

* Processa eventos
* Atualiza banco

---

### 3. `manage-subscription`

* update
* cancel
* resume

---

## 📋 12. Checklist de Verificação

* [ ] Webhook configurado corretamente
* [ ] Secret válido
* [ ] Checkout funcionando
* [ ] Webhook gravando no banco
* [ ] UI refletindo plano
* [ ] Downgrade sem cobrança
* [ ] Cancelamento correto

---

## 🧠 13. Padrão de Alterações

### 🔄 Alterar Price ID

1. Atualizar constants
2. Atualizar Edge Functions
3. Atualizar testes
4. Testar fluxo
5. Atualizar documentação

---

### ➕ Novo plano

* Inserir no DB
* Atualizar frontend
* Atualizar backend
* Testar checkout

---

### 🔐 Webhook

* Atualizar secret no Supabase
* Nunca versionar secret

---

## 🧪 14. Comandos Úteis

```bash
# Rodar frontend
npm run dev

# Rodar functions
supabase functions serve

# Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

---

## ⚠️ 15. Boas Práticas

* 🚫 Nunca commitar secrets
* 🧩 Alterações mínimas
* 🔁 Webhooks idempotentes
* 📝 Documentar tudo

---

## 🗺️ 16. Mapa Rápido

### Backend

* `create-checkout`
* `stripe-webhook`
* `manage-subscription`

### Frontend

* `plans.constants.ts`
* `billing.service.ts`
* `subscription/`

### DB

* `admin_subscriptions_setup.sql`

---

## 📦 17. Modelo de Relatório de Alteração

Sempre documentar:

1. 🎯 Objetivo
2. 📁 Arquivos alterados
3. ▶️ Como testar
4. ⚠️ Riscos
5. 🚀 Deploy

---

# 🧾 Conclusão

O SmartMoney é:

✅ Arquitetura moderna
✅ SaaS estruturado
✅ Integração Stripe correta
⚠️ Com pontos críticos em webhook e validação
