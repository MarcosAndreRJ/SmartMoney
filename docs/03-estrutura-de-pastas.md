# Estrutura de Pastas - SmartMoney

## Visão Raiz

```
SmartMoney/
├── src/                    # Frontend (Angular)
├── supabase/              # Backend (Edge Functions)
├── docs/                  # Documentação
├── public/                # Assets estáticos
├── dist/                 # Build output
├── supabase.exe           # Supabase CLI local
├── [arquivos de config]   # package.json, angular.json, etc.
```

Cada pasta tem propósito bem definido. Detalhes abaixo.

## /src (Frontend)

```
src/
├── app/
│   ├── core/                 # Infraestrutura interna
│   ├── features/             # Páginas do app
│   ├── shared/              # Componentes reusáveis
│   ├── layout/              # Shell (sidebar, header)
│   ├── app.ts              # Componente raiz
│   ├── app.config.ts        # Config do Angular
│   ├── app.routes.ts      # Rotas principais
│   └── [outros configs]
├── main.ts                 # Bootstrap client
├── main.server.ts          # Bootstrap SSR
└── server.ts              # Express server (SSR)
```

### src/app/core/

Infraestrutura central. Sem dependência de features.

```
src/app/core/
├── constants/
│   └── plans.constants.ts   # PLAN_PRICE_IDS, PLAN_FEATURES
├── guards/
│   └── admin.guard.ts      #Proteção rotas admin
├── models/
│   ├── account.model.ts   # Interface Account (frontend)
│   ├── admin.models.ts # Interfaces admin
│   ├── category.model.ts
│   ├── import.interface.ts
│   └── page-id.enum.ts  #PageId enum (32 páginas)
└── services/
    ├── supabase.service.ts      # Acesso DB (principal)
    ├── billing.service.ts    #Checkout + gestão
    ├── import.service.ts       #Import XLSX → DB
    ├── import-parser.service.ts #Parsing XLSX client
    ├── feature-access.service.ts #hasFeature()
    ├── recurring-scheduler.service.ts
    ├── admin.service.ts       #Admin CRUD
    ├── navigation.service.ts
    ├── page-context.service.ts
    ├── transaction-view.service.ts
    ├── loading.service.ts
    ├── privacy.service.ts
    └── toast.service.ts
```

| Arquivo | O Que Faz |
|--------|----------|
| `supabase.service.ts` | **Serviço principal.** encapsula SDK. Métodos CRUD para todas as entidades (accounts, transactions, contacts, loans, categories). Também calcula dashboard summary |
| `billing.service.ts` | Wrapper Edge Functions de billing. getUserPlan(), startCheckout(), cancelSubscription(), updateSubscriptionPlan(), resumeSubscription() |
| `feature-access.service.ts` | Decide se usuário pode usar feature (goals, investments, etc.).hasFeature(featureKey) |
| `import-parser.service.ts` | 100% client. Parse XLSX + heurística de colunas/tipos/categorias |
| `import.service.ts` | Move dados do parser para DB |

### src/app/features/

Cada subpasta é uma página (ou grupo de páginas relacionadas).

```
src/app/features/
├── accounts/           # /accounts, /statement
├── admin/
│   ├── admin-dashboard/
│   ├── admin-users/
│   ├── admin-plans/
│   ├── admin-subscriptions/
│   ├── admin-transactions/
│   └── admin-notifications/
├── auth/             # Login/register
├── categories/       # /categories, /subcategories
├── contacts/        # /contacts
├── credit-cards/    # /credit-cards
├── data-management/ # /data-management
├── dashboard/      # /dashboard
├── goals/         # /goals, /goal-contributions
├── import/        # /importacao
├── investments/   # /investments
├── loans/         # /loans
├── notifications/ # /notifications
├── profile/       # /profile
├── shared-accounts/ # /shared-accounts
├── subscription/  # /subscription, checkout, status
└── transactions/ # /lancamentos, /transactions, /recurring
```

**Convenção de nomenclatura:**
- Página principal → `<nome>-page.component.ts` ou `<nome>.component.ts`
- Componente de lista → `<nome>-list.component.ts`
- Componente de form → `<nome>-form.component.ts`
- Componente de modal → `<nome>-modal.component.ts`
- Componente de detalhes → `<nome>-details.component.ts`

### src/app/shared/

Componentes que podem ser usados em qualquer feature.

```
src/app/shared/
├── components/
│   ├── confirm-modal.component.ts
│   ├── delete-confirm-modal.component.ts
│   ├── result-modal.component.ts
│   ├── loading-overlay.component.ts
│   └── toast.component.ts
└── services/
    └── toast.service.ts
```

### src/app/layout/

Shell da aplicação (sidebar + header).

```
src/app/layout/
├── sidebar.component.ts
└── header.component.ts
```

## /supabase (Backend)

```
supabase/
├── functions/          # Edge Functions (Deno)
│   ├── create-checkout/
│   ├── stripe-webhook/
│   ├── manage-subscription/
│   ├── delete-user/
│   └── debug-env/
└── supabase/        # Schema local (não versionado)
    └── config.toml  # Config do Supabase CLI
```

| Função | Responsabilidade |
|-------|------------------|
| `create-checkout/` | Cria sessão Stripe Checkout |
| `stripe-webhook/` | Recebe eventos de payment |
| `manage-subscription/` | Cancel/update/resume assinatura |
| `delete-user/` | Deleta usuário e dados |

## /docs (Documentação)

```
docs/
├── .obsidian/       # Config Obsidian
├── SmartMoney.md   # Documento principal
├── Recursos_Checklist.md
├── resumo-funcional.md
├── resumo-tecnico.md
├── 00-visao-geral.md        # <-- Você está aqui
├── 01-arquitetura.md
├── 03-estrutura-de-pastas.md # <-- Você está aqui
├── 04-modulos-e-responsabilidades.md
└── 05-padroes-e-convencoes.md
```

## Aliases e Imports

O projeto usa paths configurados em `tsconfig.json`. Principais:

| Alias | Resolve Para |
|-------|-------------|
| `@app/*` | `src/app/*` |
| `@core/*` | `src/app/core/*` |
| `@features/*` | `src/app/features/*` |
| `@shared/*` | `src/app/shared/*` |

## Onde Buscar Coisas

| Preciso de... | Vá para... |
|---------------|----------|
| Entender o banco | `supabase.service.ts` (métodos .from) |
| Ver modelo de dados | `src/app/core/models/` |
| Adicionar uma página nova | `src/app/features/<nome>/` |
| Ver como fazer billing | `billing.service.ts` + `create-checkout/index.ts` |
| Ver lógica de import | `import*.service.ts` |
| Adicionar feature flag | `feature-access.service.ts` + `plans.constants.ts` |
| Ver rotas | `src/app/app.routes.ts` |

---

**Próximo passo:** Ver módulos e responsabilidades detalhadas.