# SmartMoney Projeto - Resumo Técnico Estruturado

## 1. VISÃO GERAL DO PROJETO
- **Nome do sistema**: SmartMoney (marca principal; referências a "SmartKonta" são tentativas de rebranding não concluídas)
- **Objetivo principal**: Plataforma SaaS de finanças pessoais com gerenciamento de contas, transações, metas e assinaturas em tiers
- **Tipo**: Aplicação web multi-tenant (SaaS) com modelo de assinatura recorrente

## 2. STACK TECNOLÓGICA
- **Front-end**: Angular 15+ (Standalone Components, Signals)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions em Deno)
- **Banco de dados**: PostgreSQL via Supabase
- **Integrações externas**: 
  - Stripe (Payments, Billing, Webhooks)
  - Material Design (Angular Material para componentes UI)
  - Supabase Storage (avatars, arquivos)

## 3. ARQUITETURA
- **Frontend ↔ Supabase**: 
  - Comunicação direta via supabase-js SDK (REST/Realtime)
  - Auth gerenciada pelo Supabase Auth (JWT)
  - Edge Functions expostas como HTTPS endpoints (funções/v1/{name})
- **Supabase ↔ Stripe**:
  - Edge Functions atuam como intermediários seguros (nunca expõem chaves secretas ao frontend)
  - Webhooks do Stripe apontam para funções Supabase (stripe-webhook, manage-subscription)
- **Responsabilidades**:
  - *Frontend*: UI, estado local, orquestração de UX
  - *Supabase DB*: Dados persistentes, RLS, funções SQL
  - *Supabase Edge Functions*: Lógica de negócio crítica (Stripe, pagamentos, assinaturas)
  - *Stripe*: Gateway de pagamento, gerenciamento de assinaturas recorrentes

## 4. FUNCIONALIDADES PRINCIPAIS
- **Finanças pessoais**: Contas, transações, categorias, metas
- **Gerenciamento de assinaturas**: 4 tiers (Basic, Pro, Master, Family)
- **Integração Stripe**: Checkout seguro, webhooks, gerenciamento de ciclos de cobrança
- **Histórico de faturas**: Visualização de pagamentos realizados
- **Controle de acesso baseado em plano** (feature flags via PLAN_FEATURES)
- **Gerenciamento de assinaturas**: Upgrade/downgrade/cancelamento com agendamento de período

## 5. SISTEMA DE PLANOS E PERMISSÕES
- **Planos existentes**:
  - Basic: Gratuito (limite: 2 contas, 1 cartão)
  - Pro: R$14,90/mês (5 contas, 3 cartões, transferências ilimitadas)
  - Master: R$29,90/mês (contas/cartões ilimitados, empréstimos)
  - Family: R$49,90/mês (Master + contas compartilhadas + investimentos)
- **Diferenças críticas**: 
  - Limits de recursos (contas, cartões) vs recursos booleanos (transferências, empréstimos)
  - Family é único em permitir contas compartilhadas e gestão de investimentos
- **Controle de acesso**:
  - Frontend: Serviço `feature-access.service.ts` com métodos `hasFeature()`, `canAccess()`
  - Backend: RLS no Supabase + validação em edge functions
  - Mapeamento: `PLAN_FEATURES` (constants/plans.constants.ts) define recursos por slug

## 6. ESTRUTURA DE DADOS
- **Tabelas principais**:
  - `auth.users`: Usuários autenticados (gerenciado pelo Supabase Auth)
  - `public.plans`: Catálogo de planos (id, name, slug, price, features JSON)
  - `public.user_subscriptions`: Assinaturas Stripe vinculadas a usuários (chave: user_id UNIQUE)
    - Campos críticos: `stripe_subscription_id`, `stripe_price_id`, `plan_code`, `status`, `cancel_at_period_end`, `current_period_end`
  - `public.subscriptions`: Tabela legacy (mantida por compatibilidade; menos utilizada)
  - `public.active_user_plan`: View otimizada para leitura frontend (usa user_subscriptions)
- **Campos importantes**:
  - `status`: active, trialing, canceled, expired, incomplete (do Stripe)
  - `cancel_at_period_end`: boolean (true = cancelamento agendado no fim do período)
  - `plan_code`: basic/pro/master/family (deve bater com slug da tabela plans)
- **Relações**: 
  - `user_subscriptions.user_id` → `auth.users.id` (ON DELETE CASCADE)
  - `user_subscriptions.plan_code` → `plans.slug` (validação de negócio)

## 7. FLUXOS IMPORTANTES
### Autenticação
1. Usuário faz login via Supabase Auth (email/social)
2. Frontend verifica sessão via `supabaseService.getUser()`
3. Token JWT armazenado em memória (serviço)
4. Rotas protegidas checam sessão antes de renderizar

### Assinatura (Upgrade)
1. Usuário seleciona plano superior → chama `billingService.createCheckoutSession(priceId)`
2. Frontend invoca Edge Function `create-checkout` com priceId e auth token
3. Função cria sessão Stripe Checkout → retorna URL
4. Frontend redireciona para URL do Stripe (PCI compliant)
5. Após pagamento, Stripe redireciona para URL de sucesso + session_id
6. Frontend extrai session_id e confirma pagamento (implícito via redirect)

### Pagamento (Stripe) & Webhook
1. Stripe processa pagamento → cria/atualiza assinatura no Stripe
2. Stripe envia webhook para `https://[project].supabase.co/functions/v1/stripe-webhook`
3. Função `stripe-webhook`:
   - Valida assinatura com `STRIPE_WEBHOOK_SECRET` (suporte a múltiplos secrets)
   - Processa eventos: `checkout.session.completed`, `customer.subscription.*`
   - Para `checkout.session.completed`: busca subscription via Stripe API
   - Para `subscription.*`: sincroniza dados com `user_subscriptions` table
   - Sempre grava em `user_subscriptions` + fallback para `subscriptions` (legacy)
   - Atualiza `cancel_at_period_end` e status baseado no objeto Stripe

### Atualização de Plano (Downgrade/Upgrade sem checkout)
1. Usuário seleciona plano inferior/superior no card → confirma mudança
2. Frontend chama `billingService.updateSubscriptionPlan(newPriceId)` ou `cancelSubscription()`
3. Frontend invoca Edge Function `manage-subscription`:
   - **Ação `update`**: 
     - Chama `stripe.subscriptions.update(subId, {items: [{id: subItemId, price: newPriceId}], proration_behavior: 'none'})`
     - `proration_behavior: 'none'` evita cobrança imediata/rateio
     - Atualiza `stripe_price_id`, `plan_code` no `user_subscriptions`
   - **Ação `cancel`**:
     - Chama `stripe.subscriptions.update(subId, {cancel_at_period_end: true})`
     - Atualiza apenas `cancel_at_period_end` = true
   - **Ação `resume`** (reverter cancelamento):
     - Chama `stripe.subscriptions.update(subId, {cancel_at_period_end: false})`
4. Função atualiza `user_subscriptions` e retorna resultado
5. Frontend navega para tela de status (`subscription-status`) com mensagem de sucesso/erro

## 8. INTEGRAÇÃO COM STRIPE
- **Price IDs fixos** (constants/plans.constants.ts):
  - Pro: price_1TFeUxKEGcZcVMwNTnqgIusz
  - Master: price_1TFeVfKEGcZcVMwNAHVc9yiP
  - Family: price_1TFeW5KEGcZcVMwNw7xxTHXv
- **Checkout**:
  - Só usado para **upgrade** e **assinatura inicial**
  - Nunca coleta cartão no frontend (totalmente delegado ao Stripe)
  - `create-checkout` function define `subscription_data.items[0].price = priceId`
- **Webhooks**:
  - Endpoint: `/functions/v1/stripe-webhook`
  - Events inscritos: 
    - `checkout.session.completed` (nova assinatura)
    - `customer.subscription.created/updated/deleted` (alterações)
    - `invoice.payment_succeeded/failed` (não implementado atualmente)
  - Segredo: `STRIPE_WEBHOOK_SECRET` (deve coincidir com endpoint do Stripe Dashboard)
- **Sincronização de status**:
  - Status do Stripe (`subscription.status`) mapeado para:
    - active/trialing → `status: 'active'` (ou pending_cancellation se cancel_at_period_end=true)
    - canceled → `status: 'canceled'`
    - incomplete → `status: 'inactive'` (não premium)
  - `current_period_start/end` convertidos de timestamp Stripe para ISO string
  - `cancel_at_period_end` copiado diretamente do objeto Stripe

## 9. ESTADO ATUAL DO PROJETO
- ✅ **Funcionando**:
  - Autenticação Supabase
  - Listagem básica de contas/transações
  - UI de planos redesenhada (layout moderno, destaque inteligente)
  - Tela de status de assinatura (sucesso/erro pós-operacao)
  - Integração Stripe básica (create-checkout funcionando)
  - Webhook Stripe recebendo e processando eventos (com logs de diagnóstico)
  - Planos Basic/Pro/Master/Family definidos no constants
- ⚠️ **Parcialmente funcionando/requer ajustes**:
  - Sincronização de assinatura via webhook: 
    - Recebe eventos com 200 OK quando assinatura válida
    - Falha com 400 quando assinatura inválida (provável mismatch de secret/contexto)
    - Ainda não validado se grava corretamente em `user_subscriptions` em casos de sucesso
  - Tela "Meu Plano" (subscription-page):
    - Layout reordenado (detalhes no topo) e badge corrigido implementados
    - Lógica de destaque inteligente (recomendado/próximo plano) ativa
    - Botões de upgrade/downgrade/cancelamento funcionais
    - Pendente: validar se assinaturas ativas aparecem como premium após webhook
  - Gerenciamento de assinaturas:
    - Função `manage-subscription` deployada (ações: update, cancel, resume)
    - Pendente: testar fluxo completo de downgrade/upgrade/cancelamento em ambiente de teste
- ❌ **Não implementado**:
  - Webhook para eventos `invoice.*` (não tratado)
  - Tela de histórico de faturas totalmente conectada (mostra dados mock)
  - Controle de acesso rigoroso em todas as rotas/features (parcial em alguns serviços)
  - Testes automatizados (e2e/unit)

## 10. PONTOS CRÍTICOS / REGRAS IMPORTANTES
- **Nunca expor chaves Stripe no frontend**: 
  - `STRIPE_SECRET_KEY` só em variáveis de ambiente Supabase
  - Frontend usa apenas `publishable key` (pk_test_/pk_live_)
  - Webhooks validam assinatura com secret (não confiam no corpo da requisição)
- **Idempotência crítica nos webhooks**:
  - Funções devem ser seguras para reprocessamento (Stripe pode reenviar)
  - Upsert em `user_subscriptions` com `onConflict: 'user_id'` 
  - Logs de diagnóstico essenciais para troubleshooting
- **Regra de negócio de downgrade/upgrade**:
  - Downgrades **nunca** devem gerar cobrança imediata (usam `proration_behavior: 'none'`)
  - Upgrades **podem** gerar prorrateio (comportamento padrão do Stripe) - atualmente não usado
  - Sempre validar `priceId` contra `PLAN_PRICE_IDS` antes de chamar Stripe
- **Estado da assinatura vs acesso premium**:
  - Usuário é premium **apenas se**: 
    - `status` em (`active`, `trialing`) **E**
    - `cancel_at_period_end` = false (ou null/undefined)
  - Se `cancel_at_period_end` = true → acesso continua até `current_period_end` (exibir como "Acesso até")
- **Concorrência em webhooks**:
  - Stripe pode enviar eventos fora de ordem
  - Função deve confiar apenas no objeto Stripe mais recente (não em estado local)
  - Sempre atualizar todos os campos a partir do objeto Stripe recebido
- **RLS (Row Level Security)**:
  - Todas as tabelas custom devem ter políticas `using (auth.uid() = user_id)`
  - Falta aqui = vazamento de dados entre usuários

## 11. IMPLEMENTAÇÃO ATUAL E PRÓXIMOS PASSOS

### ✅ Já Implementado

| Componente | Status | Descrição |
|------------|--------|-----------|
| `create-checkout` | ✅ Pronto | Cria sessão Stripe Checkout para upgrade de plano |
| `stripe-webhook` | ✅ Pronto | Processa webhooks do Stripe e sincroniza com banco |
| `manage-subscription` | ✅ Pronto | Gerencia cancel, update e resume de assinaturas |
| Frontend UI | ✅ Pronto | Tela de planos com destaque inteligente e modal de confirmação |
| Tela de Status | ✅ Pronto | Página de resultado após operações de assinatura |

### Edge Functions Deployadas

1. **create-checkout** (`/functions/v1/create-checkout`)
   - Ação: Criar sessão de checkout Stripe
   - Parâmetros: `priceId`
   - Valida priceId contra lista de IDs permitidos

2. **stripe-webhook** (`/functions/v1/stripe-webhook`)
   - Ação: Receber e processar eventos do Stripe
   - Eventos processados: `checkout.session.completed`, `customer.subscription.created/updated/deleted`
   - Suporta múltiplos secrets (formato: `secret1,secret2`)
   - Logging de diagnóstico implementado
   - Grava em `user_subscriptions` + fallback para `subscriptions`

3. **manage-subscription** (`/functions/v1/manage-subscription`)
   - Ação `cancel`: Agenda cancelamento (`cancel_at_period_end: true`)
   - Ação `resume`: Remove cancelamento agendado (`cancel_at_period_end: false`)
   - Ação `update`: Altera plano com `proration_behavior: 'none'`

### ⚠️ Pendente de Validação

1. **Teste de ponta a ponta completo**:
   - Criar checkout real via frontend
   - Completar pagamento no Stripe (modo teste)
   - Verificar se webhook grava corretamente em `user_subscriptions`
   - Confirmar que UI exibe plano ativo após webhook

2. **Debug de erro de assinatura (intermitente)**:
   - Alguns requests retornam 400 com erro de assinatura
   - Possível causa: múltiplos endpoints webhook no Stripe ou mismatch de secret
   - Ação: Verificar no Stripe Dashboard se há mais de um endpoint configurado

3. **Validar fluxo completo de downgrade/cancelamento**:
   - Testar botão "Fazer Downgrade" → deve chamar API sem redirecionar
   - Testar botão "Cancelar Assinatura" → deve agendar para fim do período

### 📋 Checklist de Verificação

- [ ] Confirmar secret do webhook no Supabase bate com Stripe Dashboard
- [ ] Não há endpoints webhook duplicados no Stripe
- [ ] Checkout cria sessão e retorna URL corretamente
- [ ] Pagamento no Stripe redireciona de volta para app
- [ ] Webhook recebe evento e grava em `user_subscriptions`
- [ ] UI atualiza para mostrar plano ativo após pagamento
- [ ] Downgrade agenda mudança sem cobrança imediata
- [ ] Cancelamento agenda fim de acesso sem remover imediato
- [ ] "Manter Assinatura" remove cancelamento agendado

> **Nota**: Em modo teste, usar cartão 4242 4242 4242 4242. Nunca usar chaves de produção em ambiente de desenvolvimento.