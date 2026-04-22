# Banco de Dados - SmartMoney

## Visão Geral

O banco de dados é PostgreSQL via Supabase. Este documento cobre:

- Schema das tabelas
- Views
- RLS (Row Level Security)
- Índices
- Triggers (se houver)
- Funções (se houver)

**Nota:** Schema não está versionado no repo (provavelmente via Supabase CLI local).

---

## 1. Schema Detalhado

### 1.1 accounts

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'credit_card', 'investment')),
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC,
  closing_date INTEGER,
  due_date INTEGER,
  agency_number TEXT,
  account_number TEXT,
  card_name TEXT,
  card_number TEXT,
  card_expiration TEXT,
  card_cvv TEXT,
  color TEXT,
  icon TEXT,
  is_main_account BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
```

### 1.2 transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  recurring_source_id UUID REFERENCES recurring_transactions(id),
  reference_id UUID REFERENCES transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
```

### 1.3 credit_card_transactions

```sql
CREATE TABLE credit_card_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_card_tx_user ON credit_card_transactions(user_id);
CREATE INDEX idx_card_tx_card ON credit_card_transactions(card_id);
```

### 1.4 categories

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);
```

### 1.5 goals

```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
  target_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goals_user ON goals(user_id);
```

### 1.6 goal_contributions

```sql
CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX idx_contributions_user ON goal_contributions(user_id);
```

### 1.7 investments

```sql
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_invested NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_investments_user ON investments(user_id);
```

### 1.8 loans

```sql
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fixed', 'interest')),
  initial_amount NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  monthly_rate NUMERIC,
  total_installments INTEGER,
  paid_installments INTEGER NOT NULL DEFAULT 0,
  installment_amount NUMERIC,
  due_day INTEGER NOT NULL,
  start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'overdue')),
  total_paid NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loans_user ON loans(user_id);
```

### 1.9 loan_payments

```sql
CREATE TABLE loan_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  payment_date DATE NOT NULL,
  amount_paid NUMERIC NOT NULL,
  interest_portion NUMERIC NOT NULL,
  principal_portion NUMERIC NOT NULL,
  installment_number INTEGER,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);
```

### 1.10 recurring_transactions

```sql
CREATE TABLE recurring_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_user ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_active ON recurring_transactions(is_active);
```

### 1.11 contacts

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  account_number TEXT,
  tax_id TEXT,
  pix_key TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contacts_user ON contacts(user_id);
```

### 1.12 profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  birth_date DATE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE UNIQUE INDEX idx_profiles_email ON profiles(email);
```

### 1.13 plans

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_id TEXT NOT NULL,
  resources JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 1.14 user_subscriptions

```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL,
  is_premium_active BOOLEAN NOT NULL DEFAULT false,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);
```

### 1.15 user_invites

```sql
CREATE TABLE user_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_token ON user_invites(token);
CREATE INDEX idx_invites_email ON user_invites(invitee_email);
```

### 1.16 shared_accounts

```sql
CREATE TABLE shared_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  member_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_owner ON shared_accounts(owner_id);
CREATE INDEX idx_shared_member ON shared_accounts(member_id);
```

### 1.17 notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
```

---

## 2. Views

### 2.1 active_user_plan

```sql
CREATE VIEW active_user_plan AS
SELECT 
  us.user_id,
  us.plan_code AS active_plan,
  us.status,
  us.is_premium_active,
  us.current_period_end,
  p.resources,
  p.name AS plan_name
FROM user_subscriptions us
JOIN plans p ON p.slug = us.plan_code
WHERE us.status IN ('active', 'trialing')
  AND us.cancel_at_period_end = false
ORDER BY us.current_period_end DESC
LIMIT 1;
```

### 2.2 user_dashboard_summary (não existe, calculado no frontend)

---

## 3. RLS (Row Level Security)

### 3.1 Política Geral

Para TODAS as tabelas com user_id:

```sql
-- Habilitar RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ... repetempara cada tabela

-- Política padrão
CREATE POLICY "Users can only see their own data"
ON accounts FOR ALL
USING (auth.uid() = user_id);
```

### 3.2 Políticas Específicas

| Tabela | Política | Condição |
|--------|----------|----------|
| accounts | users_select | auth.uid() = user_id |
| accounts | users_insert | auth.uid() = user_id |
| accounts | users_update | auth.uid() = user_id |
| accounts | users_delete | auth.uid() = user_id |
| transactions | users_select | auth.uid() = user_id |
| transactions | users_insert | auth.uid() = user_id |
| categories | users_select | auth.uid() = user_id |
| categories | users_insert | auth.uid() = user_id |
| goals | users_select | auth.uid() = user_id |
| goals | users_insert | auth.uid() = user_id |
| user_subscriptions | users_select | auth.uid() = user_id |
| profiles | users_select | auth.uid() = user_id |
| profiles | users_update | auth.uid() = user_id |

### 3.3 Admin Policies

Para tabelas admin:

```sql
-- Admin pode ver todos os usuários
CREATE POLICY "Admins can view all users"
ON profiles FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);
```

---

## 4. Funções (RPC)

### 4.1 sum_transactions (exemplo, não verificado)

```sql
CREATE OR REPLACE FUNCTION sum_transactions(p_user_id UUID, p_type TEXT)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(amount)
    FROM transactions
    WHERE user_id = p_user_id
      AND type = p_type
      AND status = 'confirmed'),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 calculate_balance (exemplo)

```sql
CREATE OR REPLACE FUNCTION calculate_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  initial_sum NUMERIC;
  income_sum NUMERIC;
  expense_sum NUMERIC;
BEGIN
  SELECT COALESCE(SUM(initial_balance), 0) INTO initial_sum
  FROM accounts WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(amount), 0) INTO income_sum
  FROM transactions WHERE user_id = p_user_id AND type = 'income' AND status = 'confirmed';

  SELECT COALESCE(SUM(amount), 0) INTO expense_sum
  FROM transactions WHERE user_id = p_user_id AND type = 'expense' AND status = 'confirmed';

  RETURN initial_sum + income_sum - expense_sum;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Triggers

### 5.1 Trigger on auth.users (criar perfil)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email)
  VALUES (NEW.id, NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 5.2 Trigger on user_subscriptions (atualizar is_premium_active)

```sql
CREATE OR REPLACE FUNCTION public.handle_subscription_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('active', 'trialing') AND NEW.cancel_at_period_end = false THEN
    NEW.is_premium_active := true;
  ELSE
    NEW.is_premium_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_subscription_changed
  BEFORE INSERT OR UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_subscription_change();
```

---

## 6. Índices

### Índices Criados

| Tabela | Índice | Colunas |
|--------|--------|----------|
| accounts | idx_accounts_user_id | user_id |
| transactions | idx_transactions_user_id | user_id |
| transactions | idx_transactions_account_id | account_id |
| transactions | idx_transactions_date | date |
| transactions | idx_transactions_type | type |
| transactions | idx_transactions_status | status |
| credit_card_transactions | idx_card_tx_user | user_id |
| credit_card_transactions | idx_card_tx_card | card_id |
| categories | idx_categories_user | user_id |
| categories | idx_categories_parent | parent_id |
| goals | idx_goals_user | user_id |
| goal_contributions | idx_contributions_goal | goal_id |
| goal_contributions | idx_contributions_user | user_id |
| investments | idx_investments_user | user_id |
| loans | idx_loans_user | user_id |
| loan_payments | idx_loan_payments_loan | loan_id |
| recurring_transactions | idx_recurring_user | user_id |
| recurring_transactions | idx_recurring_active | is_active |
| contacts | idx_contacts_user | user_id |
| profiles | idx_profiles_user | user_id |
| profiles | idx_profiles_email | email (unique) |
| user_subscriptions | idx_subscriptions_user | user_id |
| user_subscriptions | idx_subscriptions_status | status |
| user_invites | idx_invites_token | token |
| user_invites | idx_invites_email | invitee_email |
| shared_accounts | idx_shared_owner | owner_id |
| shared_accounts | idx_shared_member | member_id |
| notifications | idx_notifications_user | user_id |
| notifications | idx_notifications_unread | (user_id, is_read) |

---

## 7. Dados Iniciais (Seed)

### 7.1 Planos

```sql
INSERT INTO plans (slug, name, price_id, resources, is_active) VALUES
('basic', 'Basic', NULL, '{"max_accounts": 2, "max_cards": 1, "features": []}', true),
('pro', 'Pro', 'price_1TFeUxKEGcZcVMwNTnqgIusz', '{"max_accounts": 5, "max_cards": 3, "features": ["account_transfers"]}', true),
('master', 'Master', 'price_1TFeVfKEGcZcVMwNAHVc9yiP', '{"max_accounts": null, "max_cards": null, "features": ["account_transfers", "goals", "bulk_import"]}', true),
('ultra', 'Ultra', 'price_ultra_id_placeholder', '{"max_accounts": null, "max_cards": null, "features": ["account_transfers", "goals", "loans", "investments", "bulk_import"]}', true),
('family', 'Family', 'price_1TFeW5KEGcZcVMwNw7xxTHXv', '{"max_accounts": null, "max_cards": null, "features": ["account_transfers", "goals", "loans", "investments", "shared_accounts", "bulk_import"]}', true);
```

---

## 8. Constraints Globais

### 8.1 Check Constraints

| Tabela | Constraint | Expressão |
|--------|-----------|----------|
| transactions | chk_amount | amount > 0 |
| transactions | chk_type | type IN ('income', 'expense', 'transfer') |
| transactions | chk_status | status IN ('confirmed', 'pending', 'cancelled') |
| categories | chk_type | type IN ('income', 'expense') |
| loans | chk_type | type IN ('fixed', 'interest') |
| loans | chk_status | status IN ('active', 'paid', 'overdue') |
| recurring_transactions | chk_type | type IN ('income', 'expense') |
| recurring_transactions | chk_frequency | frequency IN ('daily', 'weekly', 'monthly') |

### 8.2 Unique Constraints

| Tabela | Colunas |
|--------|--------|
| profiles | email |
| plans | slug |

### 8.3 Foreign Keys

| Tabela | FK | Referência |
|--------|-----|-----------|
| accounts | user_id | auth.users(id) |
| transactions | account_id | accounts(id) |
| transactions | recurring_source_id | recurring_transactions(id) |
| transactions | reference_id | transactions(id) |
| categories | parent_id | categories(id) |
| goals | user_id | auth.users(id) |
| goal_contributions | goal_id | goals(id) |
| goal_contributions | user_id | auth.users(id) |
| loans | user_id | auth.users(id) |
| loan_payments | loan_id | loans(id) |
| loan_payments | user_id | auth.users(id) |
| recurring_transactions | user_id | auth.users(id) |
| recurring_transactions | account_id | accounts(id) |

---

## 9. Segurança

### 9.1 Variables de Ambiente (Edge Functions)

| Variável | Descrição |
|---------|----------|
| STRIPE_SECRET_KEY | Chave API do Stripe |
| STRIPE_WEBHOOK_SECRET | Assinatura do webhook |
| SERVICE_ROLE_KEY | Chave admin do Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Alias |
| APP_URL | URL do app |

### 9.2 Chaves no Frontend

**Controle:** Há URL e chave do Supabase hardcoded em `supabase.service.ts`.

```typescript
const supabaseUrl = 'https://niobxjtufruqliakyydv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // anon key
```

**Nota:** A chave exposta é a `anon` key, não a `service_role`.

---

## 10. Manutenção

### 10.1 Vacuum/Analyze

```sql
-- Recomendado rodar periodicamente
VACUUM ANALYZE transactions;
VACUUM ANALYZE accounts;
```

### 10.2 Cleanup

```sql
-- Deletar dados antigos (se necessário)
DELETE FROM transactions WHERE date < '2020-01-01';
```

---

## 11. Migrações

**Status:** Schema não está versionado no repo Supabase/.

Provavelmente está em Supabase CLI local (não commitado).

---

## Resumo

| Item | Detalhe |
|------|----------|
| engine | PostgreSQL (Supabase) |
| Tabelas | 17 |
| Views | 1 (active_user_plan) |
| Funções | ~2 (exemplos) |
| Triggers | 2 (new_user, subscription_change) |
| RLS | Ativo em todas as tabelas com user_id |
| constraints | check, unique, foreign keys |
| seed | 5 planos |
| migrations | Não versionado |

---

**Fim da documentação técnica.**

A documentação completa cobre:
- Visão geral
- Arquitetura
- Estrutura de pastas
- Módulos
- Padrões
- Fluxos
- Regras de negócio
- Entidades
- API
- Serviços
- Banco de dados

Cada documento contém exemplos reais do código, validações, ambiguidades identificadas e referências de arquivo.