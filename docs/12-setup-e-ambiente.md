# Setup e Ambiente - SmartMoney

## Visão Geral

Este documento cobre como configurar o ambiente de desenvolvimento, dependências, variáveis, scripts e considerações de deploy.

---

## 1. Pré-requisitos

### 1.1 Software Necessário

| Software | Versão Mínima | Uso |
|----------|---------------|-----|
| Node.js | 20.x | Runtime |
| npm | 10.x | Package manager |
| Git | 2.x | Versionamento |

### 1.2 Opcional

| Software | Uso |
|----------|-----|
| Supabase CLI | Backend local |
| Stripe CLI | Webhooks local |
| Angular CLI | Scaffolding |

---

## 2. Instalação

### 2.1 Repositório

```bash
git clone <repo-url>
cd SmartMoney
```

### 2.2 Dependências

```bash
npm install
```

**Nota:** `package-lock.json` está commitado.

### 2.3 Variáveis de Ambiente

Criar `.env` basado em `.env.example`:

```bash
cp .env.example .env
```

**.env.example:**

```
# Supabase (já vem com valores hardcoded no service)
SUPABASE_URL=https://niobxjtufruqliakyydv.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (para Edge Functions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
APP_URL=http://localhost:3000
```

**⚠️ ATENÇÃO:**
- `SUPABASE_URL` e key estão **hardcoded** em `supabase.service.ts`
- Edges Functions usam `.env` do Supabase dashboard
- Não commitar secrets reais

---

## 3. Scripts Available

### 3.1 package.json Scripts

```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "dev": "cross-env ng serve --port=3000 --host=0.0.0.0",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test",
    "lint": "ng lint",
    "serve:ssr:app": "node dist/app/server/server.mjs"
  }
}
```

### 3.2 Comandos Úteis

| Comando | Descrição |
|---------|----------|
| `npm run dev` | Inicia dev server na porta 3000 |
| `npm run build` | Build de produção |
| `npm run test` | Executa testes |
| `npm run lint` | Executa linter |

---

## 4. Estrutura de Configuração

### 4.1 Arquivos de Configuração

| Arquivo | Propósito |
|---------|----------|
| `angular.json` | Config Angular |
| `tsconfig.json` | Config TypeScript |
| `tsconfig.app.json` | Config app |
| `tsconfig.spec.json` | Config testes |
| `package.json` | Dependências |
| `eslint.config.js` | Linter config |
| `tailwind.config.js` | Tailwind config |
| `vitest.config.ts` | Config testes |

### 4.2 Angular.json

Principais configurações:

```json
{
  "projects": {
    "app": {
      "projectType": "application",
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "outputPath": "dist",
            "index": "src/index.html",
            "browser": "src/main.ts"
          }
        }
      }
    }
  }
}
```

---

## 5. Desenvolvimento Local

### 5.1 Iniciar Dev Server

```bash
npm run dev
```

**URL:** http://localhost:3000

**Features:**
- Hot Module Replacement (HMR)
- Source maps
- Error overlay

### 5.2 Supabase Local (Opcional)

```bash
# Iniciar Supabase local
npx supabase start

# Parar
npx supabase stop

# Status
npx supabase status
```

**Nota:** Supabase config não está no repo. Presumably usado via dashboard.

### 5.3 Stripe Webhooks (Desenvolvimento)

```bash
# Forward webhooks para local
stripe listen --forward-to localhost:3000/functions/v1/stripe-webhook

# ou via Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

---

## 6. Build

### 6.1 Build de Produção

```bash
npm run build
```

**Output:** `dist/`

### 6.2 Build watch (Desenvolvimento)

```bash
npm run watch
```

### 6.3 Estrura do Build

```
dist/
├── browser/
│   ├── index.html
│   ├── main.js
│   ├── polyfills.js
│   └── styles.css
└── server/
    └── server.mjs
```

---

## 7. Testes

### 7.1 Executar Testes

```bash
npm run test
```

**Configuração:** Vitest + jsdom

**Arquivo:** `vitest.config.ts`

### 7.2 Testes Existentes

| Arquivo | Cobertura |
|--------|----------|
| multi-user-transfer.spec.ts | Transfer multi-usuário |
| dashboard-summary.service.spec.ts | Dashboard |
| transfers.component.spec.ts | Transfers |
| transactions-page.component.spec.ts | Transactions |

### 7.3 Testes Recomendados

- Services (Supabase, Billing)
- Feature access
- Import parser
- Admin

---

## 8. Linting

### 8.1 Executar Linter

```bash
npm run lint
```

**Configuração:** ESLint + angular-eslint

### 8.2 Regras

Ver `eslint.config.js`:

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:angular/recommended'
  ]
};
```

---

## 9. Deploy

### 9.1 Frontend

Via Supabase (hosting):

```
Supabase Dashboard → Hosting → Deploy
```

Ou custom:

```bash
# Build
npm run build

# Deploy dist/ para seu hosting
```

### 9.2 Edge Functions

Via Supabase CLI:

```bash
# Deploy função
supabase functions deploy create-checkout

# Deploy todas
supabase functions deploy
```

### 9.3 Variáveis de Produção

**Supabase Dashboard → Edge Functions → Environment Variables:**

| Variável | Valor |
|---------|-------|
| STRIPE_SECRET_KEY | sk_live_... |
| STRIPE_WEBHOOK_SECRET | whsec_... |
| SERVICE_ROLE_KEY | ... |
| APP_URL | https://app.smartmoney.com |

---

## 10. Dados de Desenvolvimento

### 10.1 Seed de Planos

Executar SQL no Supabase dashboard:

```sql
INSERT INTO plans (slug, name, price_id, resources, is_active) VALUES
('basic', 'Basic', NULL, '{"max_accounts": 2, "max_cards": 1}', true),
('pro', 'Pro', 'price_1TFeUxKEGcZcVMwNTnqgIusz', '{"max_accounts": 5, "max_cards": 3}', true),
('master', 'Master', 'price_1TFeVfKEGcZcVMwNAHVc9yiP', '{"max_accounts": null, "max_cards": null}', true),
('family', 'Family', 'price_1TFeW5KEGcZcVMwNw7xxTHXv', '{"max_accounts": null, "max_cards": null}', true);
```

### 10.2 Stripe Test Mode

- Usar price IDs de test mode
- Cartões de teste: 4242 4242 4242 4242

---

## 11. Troubleshooting

### 11.1 Problemas Comuns

| Problema | Solução |
|----------|--------|
| `npm install` falha | Limpar cache: `rm -rf node_modules && npm install` |
| Puerto em uso | Alterar porta: `ng serve --port=3001` |
| Build erro | Limpar cache: `rm -rf dist .angular` |
| Tests falham | Verificar jsdom installed |
| CORS erro | Verificar Supabase URL |

### 11.2 Logs

| Ambiente | Onde Ver |
|----------|----------|
| Dev | Browser console |
| Edge Functions | Supabase Dashboard → Functions → Logs |
| Stripe | Stripe Dashboard → Developers → Webhooks |

---

## 12. Ambiente Ideal para Contribuidor

### 12.1 Setup Recomendo

```bash
# 1. Clone
git clone <repo>
cd smartmoney

# 2. Instale dependências
npm install

# 3. Copie .env.example
cp .env.example .env

# 4. Configure Stripe (test)
# Adicione STRIPE_SECRET_KEY stripe_test_...

# 5. Inicie
npm run dev
```

### 12.2 Ferramentas Úteis

| Ferramenta | Uso |
|------------|-----|
| Postman/Insomnia | Testar API |
| Supabase Studio | Ver dados |
| Stripe Dashboard | Ver payments |
| Chrome DevTools | Debug |

---

## Resumo

| Item | Comando/Detalhe |
|------|----------------|
| Install | `npm install` |
| Dev | `npm run dev` → localhost:3000 |
| Build | `npm run build` |
| Test | `npm run test` |
| Lint | `npm run lint` |
| Deploy Functions | `supabase functions deploy` |

---

**Próximo passo:** Erros conocidos e débitos técnicos.