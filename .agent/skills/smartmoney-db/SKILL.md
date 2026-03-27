---
name: smartmoney-db
description: |
  Conhecimento completo do banco de dados Supabase do projeto SmartMoney.
  Contém o schema das tabelas, políticas RLS, consultas típicas, e guias
  para criar novos recursos de banco de dados.
  Use sempre que trabalhar com dados, integrações Supabase, ou queries SQL.
---

# SmartMoney — Guia de Banco de Dados (Supabase)

## 🔑 Configuração

```typescript
const supabaseUrl = 'https://niobxjtufruqliakyydv.supabase.co';
const supabaseKey = 'sb_publishable_jNREjaQKul6ZCuSkgD1zpg_HmgOAdpG'; // chave pública
```

**Row Level Security (RLS)** está habilitado em **todas** as tabelas.
Todas as queries são automaticamente filtradas por `auth.uid()`.

---

## 📋 Schema das Tabelas

### `accounts` — Contas Bancárias

```sql
CREATE TABLE accounts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  account_type    TEXT NOT NULL,         -- 'checking', 'savings', 'credit', 'investment'
  initial_balance NUMERIC(12,2) DEFAULT 0,
  credit_limit    NUMERIC(12,2),         -- apenas tipo 'credit'
  closing_date    INTEGER,               -- dia do mês (1-31)
  due_date        INTEGER,               -- dia do mês (1-31)
  color           TEXT DEFAULT '#475569',
  icon            TEXT DEFAULT 'account_balance',
  is_main_account BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own accounts"
  ON accounts FOR ALL
  USING (auth.uid() = user_id);
```

### `transactions` — Transações Financeiras

```sql
CREATE TABLE transactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date        DATE NOT NULL,
  category    TEXT,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_account ON transactions(account_id);
```

### `contacts` — Contatos para Transferência

```sql
CREATE TABLE contacts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  email          TEXT,
  bank_name      TEXT,
  bank_agency    TEXT,
  account_number TEXT,
  tax_id         TEXT,               -- CPF/CNPJ
  pix_key        TEXT,
  is_favorite    BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### `notifications` — Notificações

```sql
CREATE TABLE notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL,  -- 'info', 'warning', 'success', 'error'
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `goals` — Metas Financeiras

```sql
CREATE TABLE goals (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) DEFAULT 0,
  target_date  DATE,
  color        TEXT DEFAULT '#10B981',
  icon         TEXT DEFAULT 'flag',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

### `investments` — Investimentos

```sql
CREATE TABLE investments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL, -- 'Renda Fixa', 'Ações', 'FIIs', 'Cripto', etc.
  invested_amount NUMERIC(12,2) DEFAULT 0,
  current_value  NUMERIC(12,2) DEFAULT 0,
  return_rate    NUMERIC(6,4) DEFAULT 0,  -- ex: 0.1234 = 12.34%
  institution    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE investment_transactions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('aporte', 'resgate')),
  amount        NUMERIC(12,2) NOT NULL,
  date          DATE NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### `shared_accounts` — Contas Compartilhadas

```sql
CREATE TABLE shared_accounts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  balance      NUMERIC(12,2) DEFAULT 0,
  color        TEXT DEFAULT '#10B981',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔌 Como Usar o SupabaseService

### Padrão de chamada

```typescript
// no componente
private supabase = inject(SupabaseService);

async loadData() {
  const { data, error } = await this.supabase.getTransactions();
  if (error) {
    console.error('Erro:', error.message);
    return;
  }
  this.items.set(data ?? []);
}
```

### Cuidado com tipos nulos

```typescript
// getTransactions pode retornar data = [] em vez de null em caso de erro gerado internamente
if (data && !error) this.items.set(data as SupabaseTransaction[]);
```

---

## 🛠️ Como Adicionar um Novo Método ao SupabaseService

```typescript
// Em supabase.service.ts — adicionar interface primeiro
export interface SupabaseNewEntity {
  id: string;
  user_id: string;
  name: string;
  // ...campos
  created_at: string;
}

// Então adicionar métodos
async getNewEntities() {
  const user = await this.getUser();
  if (!user) return { data: [], error: new Error('User not authenticated') };

  return await this.supabase
    .from('new_entities')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
}

async createNewEntity(entityData: Partial<SupabaseNewEntity>) {
  const user = await this.getUser();
  if (!user) return { data: null, error: new Error('User not authenticated') };

  return await this.supabase
    .from('new_entities')
    .insert([{ ...entityData, user_id: user.id }])
    .select()
    .single();
}

async updateNewEntity(id: string, updates: Partial<SupabaseNewEntity>) {
  const user = await this.getUser();
  if (!user) return { data: null, error: new Error('User not authenticated') };

  return await this.supabase
    .from('new_entities')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
}

async deleteNewEntity(id: string) {
  const user = await this.getUser();
  if (!user) return { error: new Error('User not authenticated') };

  return await this.supabase
    .from('new_entities')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
}
```

---

## 📦 SQL Setup Script para Nova Feature

Quando criar uma nova tabela, sempre gerar um arquivo SQL de setup:

```sql
-- src/assets/nova_feature_setup.sql

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS nova_entidade (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  -- campos específicos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE nova_entidade ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
DROP POLICY IF EXISTS "Users can view own nova_entidade" ON nova_entidade;
CREATE POLICY "Users can view own nova_entidade"
  ON nova_entidade FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own nova_entidade" ON nova_entidade;
CREATE POLICY "Users can insert own nova_entidade"
  ON nova_entidade FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own nova_entidade" ON nova_entidade;
CREATE POLICY "Users can update own nova_entidade"
  ON nova_entidade FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own nova_entidade" ON nova_entidade;
CREATE POLICY "Users can delete own nova_entidade"
  ON nova_entidade FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_nova_entidade_user ON nova_entidade(user_id);
CREATE INDEX IF NOT EXISTS idx_nova_entidade_created ON nova_entidade(user_id, created_at DESC);
```

---

## 🔔 Realtime (Notificações ao vivo)

```typescript
// Assinar canal em tempo real
subscribeToNotifications(userId: string, callback: (notification: any) => void) {
  return this.supabase
    .channel('notifications-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

// Desassinar no componente (ngOnDestroy)
private notifChannel: any;

ngOnInit() {
  const user = await this.supabase.getUser();
  if (user) {
    this.notifChannel = this.supabase.subscribeToNotifications(user.id, (n) => {
      this.notifications.update(list => [n, ...list]);
    });
  }
}

ngOnDestroy() {
  this.notifChannel?.unsubscribe();
}
```

---

## 🗃️ Categorias de Transações (Valores Conhecidos)

Os valores de `category` mais usados no sistema:

| Valor no DB | Ícone | Cor |
|---|---|---|
| `alimentacao` | `restaurant` | orange |
| `transporte` | `directions_car` | blue |
| `salario` | `payments` | emerald |
| `compras` | `shopping_bag` | purple |
| `contas` | `bolt` | yellow |
| `saude` | `local_hospital` | red |
| `transfer` / `transferencia` | `sync_alt` | blue |
| `lazer` | `sports_esports` | violet |
| `income` | `payments` | emerald |
| `expense` | `receipt` | slate |

---

## ⚡ Boas Práticas de Query

```typescript
// ✅ BOM — sempre ordenar por data/created_at
.order('created_at', { ascending: false })

// ✅ BOM — select específico quando não precisa de todos os campos
.select('id, name, amount, date')

// ✅ BOM — paginação para listas longas
.range(0, 49) // primeiros 50 registros

// ❌ RUIM — não filtrar por user_id (RLS garante, mas é boa prática explícita)
await supabase.from('transactions').select('*') // consulta todos da tabela

// ✅ BOM — usar o método do serviço que já filtra por user_id
await this.supabase.getTransactions()
```

---

## 🚨 Erros Comuns de DB

| Erro | Causa | Solução |
|---|---|---|
| `data: []` vazio inesperado | RLS bloqueando | Verificar se user_id está correto na query |
| `JWT expired` | Token expirado | Redirecionar para login / refresh token |
| `duplicate key value` | `id` já existe | Usar `upsert()` em vez de `insert()` |
| `violates foreign key` | account_id inválido | Verificar se conta existe antes de criar transação |
| `null value in column user_id` | Usuário não autenticado | Sempre chamar `getUser()` antes de queries |
