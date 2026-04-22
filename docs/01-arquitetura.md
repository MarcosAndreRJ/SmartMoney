# Arquitetura - SmartMoney

## Visão em Camadas

O projeto segue uma arquitetura em três blocos funcionais:

```
┌────────────────────────────────────┐
│         Frontend (Angular)            │
│  ┌─────────────────────────────┐   │
│  │  Features (páginas)        │   │
│  │  Shared (componentes)       │   │
│  │  Core (serviços + modelos)   │   │
│  │  Layout (shell)             │   │
│  └─────────────────────────────┘   │
└──────────────┬─────────────────────┘
              │ HTTP/SDK
              ▼
┌────────────────────────────────────┐
│        Supabase                    │
│  ┌─────────────────────────────┐   │
│  │  SDK (supabase-js)          │   │
│  │  PostgreSQL + RLS          │   │
│  │  Edge Functions (Deno)     │   │
│  └─────────────────────────────┘   │
└──────────────┬─────────────────────┘
              │ Webhooks/HTTP
              ▼
┌────────────────────────────────────┐
│          Stripe                    │
│  ┌─────────────────────────────┐   │
│  │  Checkout Sessions       │   │
│  │  Subscriptions         │   │
│  │  Webhooks            │   │
│  └─────────────────────────────┘   │
└────────────────────────────────────┘
```

## Responsabilidades por Camada

### Frontend (Angular)

| Bloco | Responsabilidade |
|-------|---------------|
| `features/*` | Páginas completas com UI e lógica de apresentação |
| `shared/*` | Componentes reusáveis (modals, toasts, loaders) |
| `core/services` | Acesso a dados (SDK), billing, business logic |
| `core/models` | Interfaces TypeScript (contratos) |
| `core/constants` | Configurações de planos |
| `core/guards` | Proteção de rotas |
| `layout/*` | Shell (sidebar + header) |

**Não faz:**
- Regras de negócio pesadas
- Validação de dados sensíveis (confia no backend)
- Cálculos financeiros significativos

### Supabase (Backend)

| Componente | Responsabilidade |
|-----------|------------------|
| PostgreSQL | Persistência com RLS (Row Level Security) |
| Auth | JWT, registro, login |
| Edge Functions | Lógica crítica (checkout, webhooks, delete-user) |
| Storage | Avatars |

**Faz:**
- CRUD básico
- Queries com filtros por user_id
- Validação de assinatura
- Integração Stripe

### Stripe (Billing)

Apenas recebe eventos via webhooks e processa pagamentos.
Não tem relação direta com o frontend.

## Padrões de Comunicação

### SDK Direto (recommended)

Fluxo principal: Frontend → Supabase SDK → DB

```typescript
// Exemplo
await supabase.from('accounts').select('*').eq('user_id', user.id)
```

Usado para: operações read/write simples do domínio (accounts, transactions, categories, etc.)

### Edge Functions (para operações sensíveis)

Fluxo: Frontend → Edge Function → Stripe

```typescript
// Exemplo
await supabase.functions.invoke('create-checkout', { body: { priceId } })
```

Usado para: checkout, gestão de assinatura, delete-user
⚠️ **Por que?**
- checkout precisa de STRIPE_SECRET_KEY (nunca exposta no front)
- cross-origin para Stripe

### Webhooks (para eventos externos)

Fluxo: Stripe → Edge Function → DB

```typescript
// stripe-webhook/index.ts
await supabase.from('user_subscriptions').update(...).eq('user_id', ...)
```

Usado para: sync de pagamento, criação/cancelamento de assinatura

## Padrões de Arquitetura do Frontend

### Service Layer Pattern

Cada domínio tem um serviço dedicado:

| Domínio | Serviço |
|---------|---------|
| Acesso ao DB | `SupabaseService` |
| Billing/Planos | `BillingService` |
| Features | `FeatureAccessService` |
| Importação | `ImportParserService`, `ImportService` |
| Goals | `GoalService` |
| Investments | `InvestmentsService` |
| Admin | `AdminService` |

Cada serviço:
- Injeta `SupabaseService` como dependência (acesso ao SDK)
- Expõe métodos para a feature usar
- Não faz acesso direto à interface (só dados)

### Page-Context Pattern

Cada página usa um serviço de contexto para gerenciar estado local:

```typescript
// Exemplo: transactions-page.component.ts
// Usa método load() que busca no service
// Mantém estado em signal/component properties
```

Serviços de contexto:
- `PageContextService` — gerencia dados da página atual
- `TransactionViewService` — estado de visualização de transactions
- `NavigationService` — controle de menu

### Feature Access Pattern

Verificação de permissão:

```typescript
const can = await featureAccess.hasFeature('goals');
if (!can) { showUpgradePrompt(); }
```

**Onde aplica:**
- rotas (se não tem feature, redireciona)
- botões (hide/show)
- modais (bloqueia antes de abrir)

## Fluxos Críticos do Sistema

### Fluxo 1: Autenticação

```
1. Usuário entra no app
2. URL redirect para auth.component (ou já logado)
3. Supabase Auth gera JWT (local storage)
4. Todas as queries trazem user_id automaticamente
5. RLS filtra dados por user
```

**Detalhe:** O SDK automaticamente seta header de Authorization. Não precisa gerenciar manualmente.

### Fluxo 2: Checkout (Upgrade)

```
1. Usuário escolhe plano
2. Frontend chama billingService.startCheckout(priceId)
3. Edge Function create-checkout
4. Valida token JWT
5. Busca/cria Stripe Customer
6. Cria Checkout Session
7. Retorna URL
8. Usuário paga na URL do Stripe
9. Redirect volta com ?checkout=success
10. Stripe webhook processa evento → DB atualizado
```

**Detalhe:** `priceId` é validado na Edge Function (ALLOWED_PRICE_IDS).

### Fluxo 3: Transação Recorrente

```
1. Usuário cria recurring_transaction
2. recurrency_scheduluer.service.ts rodando (cron?) 
3. Gera lançamento no dia devido
4. Cria transaction com recurring_source_id
```

**Ambíguo:** Não há scheduler externo. Ver `recurring-scheduler.service.ts`.

### Fluxo 4: Bulk Import

```
1. Usuário faz upload de XLSX
2. ImportParserService.parseExcelFile() → linha a linha
3. identificaColunas() por heurística
4. Mapeia tipos (income/expense) por heurística de valor
5. Sugere categoria por keywords
6. Preview com status VALID/WARNING/INVALID
7. Usuário confirma
8. ImportService importa para DB
```

**Detalhe:** O parser é 100% client-side. Não sobe arquivo para backend.

## Dados Sensiveis e Onde Estão

| Dado | Local | Protegido por |
|------|-------|--------------|
| JWT token | localStorage | HTTP-only (session) |
| STRIPE_SECRET_KEY | Edge Function (.env) | Nunca exposta |
| user_id | DB | RLS (filtro automático) |
| Senha | Supabase Auth | Hash + salt pelo Supabase |

## Ambiguidades Identificadas

1. **Recurring Scheduler:** Não h�� cron job. O serviço `recurring-scheduler.service.ts` parece ser chamar manual, mas não está claro como automatiza.

2. **Bulk Import:** Todo processamento é client-side. Isso escala para planilhas muito grandes?

3. **Sincronização Offline:** Não há. Dados podem divergir se offline por muito tempo.

4. **Dados Temporários:** Não há cache. Queries batem direto no DB sempre.

5. **Versionamento de Schema:** Não há migrations versionadas no repo. Presumably via Supabase CLI local.

---

**Próximo passo:** Ver estrutura de diretórios para saber onde cada coisa fica.