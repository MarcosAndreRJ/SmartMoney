# 📋 Resumo Funcional - SmartMoney

## Visão Geral

**SmartMoney** é uma plataforma SaaS de gestão de finanças pessoais multi-tenant. Permite que usuários gerenciem suas finanças de forma centralizada, com controle por planos de assinatura.

---

## Funcionalidades Principais

### Módulo de Contas
- Criação e gerenciamento de contas bancárias
- Extrato detalhado por período
- Saldo atual e histórico

### Módulo de Transações
- Lançamentos mensais (receitas/despesas)
- Transferências entre contas
- Transferências multi-usuário
- Transações recorrentes (agendamento automático)
- Categorização por categoria/subcategoria

### Módulo de Metas
- Definição de metas financeiras
- Aportes periódicos
- Acompanhamento de progresso

### Módulo de Cartões
- Cadastro de cartões de crédito
- Controle de gastos por cartão

### Módulo de Investimentos
- Portfólio de investimentos
- Aportes em investimentos

### Módulo de Empréstimos
- Simulação e controle de empréstimos
- Parcelas e juros

### Módulo de Assinatura
- Checkout via Stripe
- Upgrade/downgrade de planos
- Cancelamento
- Período de teste

### Módulo de Dados
- Importação de planilhas (bulk import)
- Exportação de dados
- Gerenciamento de dados (delete)

### Módulo Social/Family
- Compartilhamento de contas
- Convite de membros
- Contatos e favorecidos

---

## Planos Disponíveis

| Plano | Preço | Limites |
|-------|-------|---------|
| Basic | Gratuito | 2 contas, 1 cartão |
| Pro | R$14,90 | 5 contas, 3 cartões, transferências |
| Master | R$29,90 | Ilimitado + metas + bulk import + empréstimos |
| Ultra | - | + investimentos |
| Family | R$49,90 | + compartilhamento + investimentos |

---

## Fluxos Principais

### Autenticação
1. Usuário faz login
2. JWT gerado pelo Supabase
3. Rotas protegidas validam sessão

### Assinatura (Upgrade)
1. Usuário escolhe plano
2. Checkout redireciona para Stripe
3. Usuário paga
4. Webhook confirma pagamento
5. Plano ativado

### Importação
1. Usuário upload de planilha
2. Parser processa XLSX
3. Preview dos dados
4. Confirmação importa para DB

---

## Status de Desenvolvimento

### ✅ Funcional
- Dashboard principal
- Módulo de contas
- Módulo de transações
- Módulo de metas
- Módulo de cartões
- Módulo de investimentos
- Módulo de empréstimos
- Módulo de categorias/subcategorias
- Autenticação completa
- Importação de planilhas
- Perfil do usuário
- Assinatura (checkout + webhook)

### ⚠️ Em Desenvolvimento
- Recurring transactions (transações automáticas)
- Contatos
- Notificações
- Dados management (export/delete)

### ❌ Não Implementado
- Testes automatizados comprehensive
- Histórico completo de faturas Stripe