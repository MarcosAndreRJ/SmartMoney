# Regras de Negócio - SmartMoney

## Visão Geral

Este documento consolida todas as regras de negócio identificadas no sistema. Cada regra especifica: condição, ação, validação e restrições.

---

## RN1: Acesso por Plano (Feature Access)

### Descrição

O sistema controla acesso a funcionalidades baseado no plano do usuário. Isso é implementado via `FeatureAccessService.hasFeature(featureKey)`.

### Feature → Planos

| Feature | Basic | Pro | Master | Ultra | Family |
|---------|-------|-----|--------|-------|--------|
| `accounts` (limite) | 2 | 5 | ∞ | ∞ | ∞ |
| `cards` (limite) | 1 | 3 | ∞ | ∞ | ∞ |
| `account_transfers` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `goals` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `bulk_import` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `loans` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `investments` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `shared_accounts` | ❌ | ❌ | ❌ | ❌ | ✅ |

### Lógica

```typescript
async hasFeature(featureKey: string): Promise<boolean> {
  // 1. Tenta dinámico (DB)
  const { resources } = await billingService.getUserPlan();
  if (resources && resources[featureKey] === true) return true;

  // 2. Fallback estático (PLAN_FEATURES)
  const plan = await billingService.getCurrentPlan();
  return PLAN_FEATURES[plan]?.includes(featureKey) ?? false;
}
```

### Restrições

- Se `hasFeature()` retorna false:
  - Rota: redireciona para `/subscription`
  - Botão: oculta ou exibe "Upgrade"
  - Modal: bloqueia antes de abrir

---

## RN2: Limites por Plano

### Descrição

Cada plano tem límite máximo de recursos. O sistema verifica antes de criar.

### Limites

| Recurso | Basic | Pro | Master | Ultra | Family |
|---------|-------|-----|--------|-------|--------|
| accounts | 2 | 5 | ∞ | ∞ | ∞ |
| credit_cards | 1 | 3 | ∞ | ∞ | ∞ |

### Verificação (Account)

```typescript
async getAccountLimit(): Promise<number | null> {
  // 1. Tenta via resources do DB
  const { resources } = await getUserPlan();
  if (resources?.max_accounts !== undefined) {
    return resources.max_accounts;
  }

  // 2. Fallback para PLAN_FEATURES estático
  const accountsFeature = features.find(f => f.startsWith('accounts:'));
  if (accountsFeature) {
    const value = accountsFeature.split(':')[1];
    if (value === 'unlimited') return null;
    return parseInt(value, 10);
  }

  return 2; // Default
}
```

### Validação na Criação

```typescript
async createAccount() {
  const limit = await this.billingService.getAccountLimit();
  const { data: accounts } = await this.supabase.getAccounts();
  if (limit && accounts.length >= limit) {
    throw new Error(`Limite de ${limit} contas atingido. Faça upgrade.`);
  }
  // proceed
}
```

---

## RN3: Estados de Transação

### Descrição

Cada transação tem um status que determina como é tratada no cálculo de saldo.

### Estados

| Status | Inclui em Saldo? | Inclui em Gastos do Mês? |Descrição|
|--------|-----------------|-------------------------|----------|
| confirmed | ✅ | ✅ | Confirmada |
| pending | ❌ | ⚠️ (se data ≤ fim do mês) | Pendente |
| cancelled | ❌ | ❌ | Cancelada |

### Tipos de Transação

| Tipo | Descrição | Efeito no Saldo |
|------|-----------|----------------|
| income | Receita | + amount |
| expense | Despesa | - amount |
| transfer | Transferência | +- amount (conta origen/destino) |

### Regra

- `confirmed`: afeta saldo normalmente
- `pending`: não afeta saldo atual, mas entra no "predicted balance"
- `cancelled`: não considerada em nenhum cálculo

---

## RN4: Cálculo de Saldo do Dashboard

### Fórmula

```text
totalBalance = sum(initial_balance) +
              sum(income confirmed) -
              sum(expense confirmed)
```

```text
monthlySpending = sum(expense confirmed do mês atual) +
                  sum(credit_card_transactions confirmed do mês atual)
```

```text
predictedBalance = totalBalance +
                    sum(pending income ≤ fim do mês) -
                    sum(pending expense ≤ fim do mês)
```

### Evolução Patrimonial

```
heritageEvolution[mes] = initialBalanceSum +
                          sum(income até mes) -
                          sum(expense até mes)
```

---

## RN5: Progresso de Meta (Goal)

### Fórmula

```typescript
progress = (sum(contributions) / target_amount) * 100
current_amount = sum(contributions)
```

### Estados

| progress | Estado |
|----------|--------|
| < 100% | Em andamento |
| >= 100% | Concluída |

### Regra

- Meta pode ter contribuições após atingir 100% (excedente)
- Não há validação de data (pode estar atrasada)

---

## RN6: Cartão de Crédito

### Fórmula

```text
currentBill = sum(credit_card_transactions WHERE card_id = X AND status = 'confirmed')
available = credit_limit - currentBill
```

### États de Fatura

| Status | Descrição |
|--------|-----------|
| confirmed | Fechada/paga |
| pending | Aberta/mês atual |

---

## RN7: Empréstimos

### Tipos

| Tipo | Descrição |
|------|-----------|
| fixed | Parcelas fixas (valor fixo) |
| interest | Taxa de juros (saldo decrecente) |

### Fórmula (Interest)

```text
installment_amount = principal_portion + interest_portion
interest_portion = current_balance * (monthly_rate / 100)
principal_portion = installment_amount - interest_portion
```

### Estados

| Status | Descrição |
|--------|-----------|
| active | Em dia |
| paid | Quitado |
| overdue | Atrasado (due_day < hoje) |

---

## RN8: Categorias Hierárquicas

### Estrutura

- `parent_id = null` → Categoria principal
- `parent_id = <id>` → Subcategoria

### Regras

- Categoria pode ter múltiplas subcategorias
- Subcategoria herda tipo (income/expense) da principal
- Excluir categoria principal exclui subcategorias (CASCADE)

---

## RN9: Importação de Planilha

### Regras de Parser

1. **Colunas obrigatórias:** date, amount
2. **Colunas opcionais:** description, category, type
3. **Heurísticas:**
   - Data inválida → INVALID
   - Amount NaN → INVALID
   - Sem category → WARNING

### Tipo de Importação

| Fonte | Tipo inferido |
|-------|---------------|
| amount ≥ 0 | income |
| amount < 0 | expense |
| coluna "tipo" com keyword | sobrescreve heurística |

### Categoria Sugerida

Baseada em keywords (case-insensitive):

| Keyword | Categoria |
|----------|-----------|
| ifood, restaurante, mcdonalds, burguer king, padaria, mercado, açougue | Alimentação |
| uber, 99app, posto, gasolina, combustivel, pedagio | Transporte |
| netflix, spotify, cinema, show, steam, playstation, xbox | Lazer |
| farmacia, hospital, consulta, exame, dentista | Saúde |
| aluguel, condominio, luz, energia, agua, internet, celular | Contas Fixas |

---

## RN10: Assinatura (Billing)

### Estados

| status | is_premium_active | Acesso |
|--------|------------------|--------|
| active | true | ✅ |
| trialing | true | ✅ |
| past_due | true | ⚠️ (acesso mas pagamento falhou) |
| canceled | false | ❌ (após período) |

### Condição Premium

```typescript
isPremium = status === 'active' || status === 'trialing'
            AND cancel_at_period_end === false
```

### Operações

| Operação | Stripe API | DB Update |
|----------|------------|----------|
| Cancel | `subscriptions.update(cancel_at_period_end: true)` | cancel_at_period_end = true |
| Resume | `subscriptions.update(cancel_at_period_end: false)` | cancel_at_period_end = false |
| Update | `subscriptions.update(items: [{ price: newPriceId }])` | plan_code = newPlan |

### Regras

- Cancel não remove acesso imediatamente
- Update cria prorating automático
- Resume só funciona se cancel_at_period_end = true

---

## RN11: Recurring Transactions

### Parâmetros

| Campo | Obrigatório | Valores |
|-------|-------------|----------|
| frequency | ✅ | 'daily', 'weekly', 'monthly' |
| day_of_month | se monthly | 1-31 |
| start_date | ✅ | data |
| end_date | não | data opcional |
| is_active | ✅ | boolean |

### Geração

**Ambíguo:** Como o scheduler funciona?

- Se daily: cria a cada dia
- Se weekly: cria no dia configurado
- Se monthly: cria no day_of_month

Quando uma transação é criada a partir de recurring:
- `recurring_source_id` = ID da recurring_transactions
- Demais campos copiados

---

## RN12: Transferências entre Contas

### Regra

Uma transferência cria DUAS transactions:

| Transação | Tipo | Amount |
|-----------|------|--------|
| 1 (origem) | expense | - valor |
| 2 (destino) | income | + valor |

### Campos

- `type: 'transfer'`
- Ambas com mesmo `reference_id` (ID da outra)

### Permissão

- `account_transfers` disponível apenas em Pro+

---

## RN13: Admin

### Regras de Acesso

```typescript
canActivate(): boolean {
  const user = getUserProfile();
  return user?.is_admin === true;
}
```

### Funcionalidades por Tipo

| Página | Função |
|--------|--------|
| admin-users | Busca por email, ver created_at, subscription |
| admin-plans | CRUD de planos (slug, name, resources) |
| admin-subscriptions | Busca por user_id, status, change plan |
| admin-transactions | Busca por user_id, data |
| admin-notifications | Envia notificação a usuário específico |

---

## RN14: Família (Family Plan)

### Regra

- Apenas Family plan tem `shared_accounts`
- Membros convidados têm acesso a contas compartilhadas
- Convite via email → cria `user_invites`
- Aceite cria relação em `shared_accounts`

### Dados Compartilhados

- Accounts (se compartilhadas)
- Goals (se compartilhadas)
- Transactions? (não está claro)

---

## RN15: Perfil do Usuário

### Dados

| Campo | Fonte | Editável |
|-------|-------|----------|
| full_name | user_metadata | ✅ via updateUserMetadata |
| email | auth.users | ❌ |
| avatar_url | user_metadata | ✅ via uploadAvatar |
| birth_date | user_metadata | ✅ |
| is_admin | profiles | ❌ (manual DB) |

---

## RN16: Notificações

### Origem

**Não implementado em services.** Apenas componente existe.

### Possíveis Fontes

- Stripe Webhooks (payment failed)
- Alertas de cartão (transação suspeita)
- Metas atingidas
- Transações recorrentes executadas

---

## RN17: Data Management (Export/Delete)

### Exportação

**Não implementado.** Rota existe mas funcionalidade não.

### Delete

**Parcial.** delete-user Edge Function existe:
- Remove todas as transações do usuário
- Remove usuário de auth.users (via API)

---

## Resumo de Validações

| Contexto | Regra | Erro se Falhar |
|----------|------|----------------|
| createAccount | contar < limite | "Limite de X contas atingido" |
| createTransaction | amount > 0 | "Valor deve ser positivo" |
| createTransaction | date não vazia | "Data é obrigatória" |
| createGoal | target_amount > 0 | "Valor deve ser positivo" |
| createLoan | monthly_rate ≥ 0 | "Taxa inválida" |
| cancelSubscription | session válida | "Sessão expirada" |
| createCheckout | priceId válido | "Plano inválido" |
| startCheckout | logged in | "Não autenticado" |
| import | amount válido | "Valor inválido" |
| import | date válida | "Data ausente" |

---

## Resumo de Estados

| Entidade | Estados Possíveis |
|---------|-------------------|
| transaction.status | confirmed, pending, cancelled |
| transaction.type | income, expense, transfer |
| loan.status | active, paid, overdue |
| loan.type | fixed, interest |
| subscription.status | active, trialing, past_due, canceled |
| credit_card_transaction | confirmed, pending |
| recurring_transaction | is_active (boolean) |
| goal | (target atingido = concluído) |
| category.type | income, expense |

---

## Ambiguidades

1. **Recurring:** Como scheduler executa? Não há cron jobno Supabase.
2. **Shared Accounts:** Quais dados são compartilhados? Não documentado.
3. **Notifications:** De onde vêm? Services não implementados.
4. **Export:** Funcionalidade inexistente.
5. **Bulk Import limit:** Parser cliente. Planilhas grandes podem travar?

---

**Próximo passo:** Entidades e relacionamentos.