# Visão Geral - SmartMoney

## O Que É o Projeto

SmartMoney é uma plataforma SaaS de gestão de finanças pessoais multi-tenant, construída sobre Angular 21 + Supabase + Stripe. Permite que usuários gerenciem contas bancárias, transações, metas, investimentos e assinem planos premium com limite de recursos por plano.

## Problema que Resolve

Usuários pessoais precisam de um lugar centralizado para:
- Controlar diversas contas bancárias e cartões
- Registar receitas e despesas
- Acompanhar metas e investimentos
- Importar dados de planilhas bancárias

A plataforma monetiza via assinaturas (Freemium), oferecendo mais recursos conforme o plano contratado.

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Angular 21 (stand-alone, Signals) |
| UI | Angular Material + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Billing | Stripe |
| Hospedagem | Supabase (HTTP) |

## Domínio do Sistema

**Contexto:** Fintech pessoal
**Modelo de negócio:** SaaS com assinatura recorrente
**Usuários:** Pessoa física que quer organizar finanças

## Estrutura de Dados Central

O banco opera com as seguintes entidades principais:

- **accounts** — Contas bancárias e cartões de crédito
- **transactions** — Lançamentos (receitas/despesas/transferências)
- **credit_card_transactions** — Transações de cartão
- **categories** — Categorias (hierárquicas via parent_id)
- **goals** — Metas financeiras
- **goal_contributions** — Aportes em metas
- **investments** — Portfólio de investimentos
- **loans** — Empréstimos e parcelas
- **recurring_transactions** — Transações automáticas
- **contacts** — Contatos e favorecidos
- **user_subscriptions** — Assinaturas Stripe
- **plans** — Planos disponíveis

## Fluxo de Dados Crítico

1. Usuário authenticado → recebe token JWT
2. Token valida acesso às rotas
3. Frontend faz operações direto no Supabase (SDK)
4. Operações sensíveis (checkout) passam por Edge Functions
5. Webhooks do Stripe atualizam assinatura

## Integrações Externas

| Serviço | Função |
|---------|--------|
| Stripe | Checkout, assinaturas, webhooks |
| Supabase Auth | Login, JWT |
| Supabase Storage | Avatars |

## Escopo Funcional

### Funcionalidades por Módulo

| Módulo | Função |
|--------|-------|
| Dashboard | Resumo financeiro (saldo, gastos, metas) |
| Accounts | CRUD contas, extrato |
| Transactions | Lançamentos, transfers, recorrências |
| Goals | Metas +pline contributions |
| Investments | Portfólio |
| Loans | Empréstimos + parcelas |
| Credit Cards | Cartões + transações |
| Categories | Categorias hierárquicas |
| Import | Parser XLSX → transações |
| Subscription | Checkout + gestão |
| Admin | Gestão de usuários/planos |
| Shared Accounts | Familia (Family plan) |

### Planos Disponíveis

| Plano | Limite |
|-------|-------|
| Basic | 2 contas, 1 cartão |
| Pro | 5 contas, 3 cartões, transfers |
| Master | Ilimitado + metas + import |
| Ultra | + investimentos + loans |
| Family | + compartilhamento |

## Suposições de Design

- **Monolito:** Frontend e backend juntos no mesmo repositório
- **Multi-tenant:** Cada usuário vê apenas seus dados (RLS ativo)
- **Reativo:** Updates via signals/rxjs, sem polling
- **Pagamento:** 100% Stripe gerenciado

## Status do Projeto

Funcionalidades completas ( Dash, Accounts, Transactions, Goals, Investments, Loans, Cards, Subscription (checkout+webhook), Categories, Import, Profile, Admin).

Parcial em: Recurring transactions, Notifications, Shared accounts.

Sem testes automatizados significativos ainda.

---

**Próximos passo:** Ver arquitetura para entender camadas e dependências.