# Recursos — Checklist (Disponíveis & Aplicáveis)

Objetivo: lista verificável para que qualquer IA ou desenvolvedor identifique rapidamente quais recursos estão implementados, onde ficam no código e se são aplicáveis a mudanças ou testes.

Como usar: percorrer cada item, marcar "Aplicável" se precisa ação (ex.: alterar priceId, testar fluxo, revisar segurança) e seguir a seção "Como testar / Notas".

--

## 1) Funcionalidades Principais

- Recurso: Autenticação (Supabase Auth)
  - Disponível: ✅
  - Aplicável: ✅ (verificações de segurança e uso de chaves)
  - Localização: `src/app/core/services/supabase.service.ts`
  - Observações / Como testar: login via UI; `supabase.auth.getUser()` usado pelo frontend.

- Recurso: Contas (accounts)
  - Disponível: ✅
  - Aplicável: ✅
  - Localização: `src/app/core/services/supabase.service.ts`, tabelas `accounts`
  - Observações: CRUD e listagem já implementados; testar criação/edição/exclusão.

- Recurso: Transações (transactions)
  - Disponível: ✅
  - Aplicável: ✅
  - Localização: serviços e components em `src/app/features/transactions/` e `supabase` queries em `supabase.service.ts`
  - Observações: export/CSV está implementado no frontend.

- Recurso: Cartões de Crédito / Faturas (credit card transactions)
  - Disponível: ✅
  - Aplicável: ✅ (conectar histórico de faturas ao backend)
  - Localização: `src/app/features/credit-cards/`, tabela `credit_card_transactions`
  - Observações: geração/visualização de faturas parcial (algumas views usam mock).

- Recurso: Metas (goals)
  - Disponível: ✅
  - Aplicável: ✅
  - Localização: `src/app/core/services/supabase.service.ts` (`goals`, `goal_contributions`)

- Recurso: Recorrência (recurring transactions)
  - Disponível: ✅
  - Aplicável: ✅
  - Localização: `src/app/core/services/supabase.service.ts`, `recurring_transactions`
  - Observações: scheduler no frontend gera lançamentos (ver `RecurringScheduler`), revisar testes.

- Recurso: Empréstimos (loans)
  - Disponível: ✅
  - Aplicável: ❌ (apenas exibido em plano Master; avaliar prioridade)
  - Localização: `supabase` tabela `loans` referenciada em `supabase.service.ts`

- Recurso: Contas Compartilhadas / Convites (Family)
  - Disponível: ✅
  - Aplicável: ✅
  - Localização: tabelas `account_invitations`, `account_access`, UI em `src/app/features/*`

- Recurso: Investimentos
  - Disponível: ⚠️ (mencionado no plano Family)
  - Aplicável: ❌ (provavelmente não implementado ou parcial)
  - Observações: revisar código se há endpoints/tabelas relacionadas.

## 2) Assinaturas / Billing / Stripe

- Recurso: Edge Function — create-checkout
  - Disponível: ✅
  - Aplicável: ✅
  - Localização: `supabase/functions/create-checkout/index.ts`
  - Observações: valida `priceId` e cria sessão Checkout; testar fluxo de upgrade.

- Recurso: Edge Function — stripe-webhook
  - Disponível: ✅
  - Aplicável: ✅ (verificar estabilidade e secrets)
  - Localização: `supabase/functions/stripe-webhook/index.ts`
  - Observações: processa `checkout.session.completed` e `customer.subscription.*`; falta tratamento de `invoice.*`.

- Recurso: Edge Function — manage-subscription
  - Disponível: ✅
  - Aplicável: ✅
  - Localização: `supabase/functions/manage-subscription/index.ts`
  - Observações: ações `update`, `cancel`, `resume` implementadas; testar proration_behavior e atualizações no DB.

- Recurso: Price IDs (constantes)
  - Disponível: ✅
  - Aplicável: ✅ (se alteração de produto/preço necessária)
  - Localização: `src/app/core/constants/plans.constants.ts`, também referenciado em funções `supabase/functions/*`
  - Valores conhecidos:
    - Pro: `price_1TFeUxKEGcZcVMwNTnqgIusz`
    - Master: `price_1TFeVfKEGcZcVMwNAHVc9yiP`
    - Family: `price_1TFeW5KEGcZcVMwNw7xxTHXv`

- Recurso: Webhook invoice.*
  - Disponível: ❌
  - Aplicável: ✅ (recomendado para lidar com falhas/pagamentos recorrentes)
  - Observações: implementar tratamento de `invoice.payment_succeeded/failed` se necessário.

## 3) Frontend — Código e Serviços-Chave

- `plans.constants.ts`
  - Local: `src/app/core/constants/plans.constants.ts`
  - Observações: contém `PLAN_PRICE_IDS`, `PLAN_FEATURES`, fonte da verdade para UI.

- `billing.service.ts`
  - Local: `src/app/core/services/billing.service.ts`
  - Observações: chama `create-checkout` e `manage-subscription` via Supabase Functions.

- `feature-access.service.ts`
  - Local: `src/app/core/services/feature-access.service.ts`
  - Observações: controla flags de recurso no frontend com base em `PLAN_FEATURES`.

- Componentes de assinatura
  - Local: `src/app/features/subscription/` (`subscription-page.component.ts`, `subscription-checkout.component.ts`)

- Supabase client / chave embutida
  - Local: `src/app/core/services/supabase.service.ts`
  - Observações: arquivo contém `supabaseUrl` e `supabaseKey` visíveis no repo — segurança crítica. Marcar como ação: mover para env seguro e nunca commitar chaves.

## 4) Banco de Dados / SQL

- Tabelas principais (existência confirmada por código):
  - `auth.users` (Supabase Auth)
  - `public.plans` (catálogo)
  - `public.user_subscriptions` (assinaturas sincronizadas com Stripe)
  - `public.subscriptions` (legacy)
  - `accounts`, `transactions`, `credit_card_transactions`, `goals`, `goal_contributions`, `recurring_transactions`, `account_invitations`, `account_access`, `loans`
  - Local SQL de setup: `src/assets/admin_subscriptions_setup.sql` (também em `dist`)

Observações: ver políticas RLS — o projeto recomenda `using (auth.uid() = user_id)`; revisar todas as tabelas para políticas existentes.

## 5) Scripts e Utilitários

- `trigger-webhook.js`
  - Local: `trigger-webhook.js`
  - Uso: simular webhook localmente (contém URL de webhook apontando para Supabase)

- `fix-webhooks.cjs`
  - Local: `fix-webhooks.cjs`
  - Uso: script utilitário para configurar/atualizar endpoints no Stripe

- `test-upsert.js`
  - Local: `test-upsert.js`
  - Uso: exemplo de payload/upsert para testes locais

## 6) Integrações e Observabilidade

- Integração: Stripe (Checkout, Subscriptions, Webhooks)
  - Disponível: ✅
  - Aplicável: ✅
  - Observações: verificar endpoints no Dashboard do Stripe para duplicidade; secrets no Supabase.

- Integração: Supabase Storage (uploads/avatars)
  - Disponível: ✅

- Observabilidade: Logging básico nas Edge Functions
  - Disponível: ✅ (logs de diagnóstico)
  - Aplicável: ✅ (recomendar Sentry/monitoramento de erros para produção)

## 7) Segurança / Variáveis de Ambiente Críticas

- `STRIPE_SECRET_KEY` — Deve ficar em env do Supabase / backend. Nunca commitar.
- `STRIPE_WEBHOOK_SECRET` — Obrigatório para validar webhooks.
- `SUPABASE_SERVICE_KEY` / `SUPABASE_URL` — Service key não deve estar em código frontend.

Ação recomendada: remover chaves do `src/app/core/services/supabase.service.ts` e usar env vars ou Secrets Manager.

## 8) Pendências / Recursos a Implementar ou Revisar

- Tratar eventos `invoice.*` do Stripe — (implementação recomendada)
- Conectar tela de histórico de faturas ao backend (atualmente mock) — Prioridade média
- Validar RLS em todas as tabelas — Prioridade alta
- Testes automatizados (unit/e2e) — Ausentes; priorizar para regressões
- Revisar problema intermitente de 400 em webhooks — investigar secrets / endpoints duplicados

--

Versão do checklist: 2026-03-31
Gerado por: IA (solicitação do mantenedor). Atualize este arquivo sempre que adicionar/alterar recursos críticos.
