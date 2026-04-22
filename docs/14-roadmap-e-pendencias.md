# Roadmap e Pendências - SmartMoney

## Visão Geral

Este documento lista o que está pronto, o que precisa ser feito ( roadmap ), e as pendências por categoria.目的在于 ajudar no planejamento de evolução do sistema.

---

## 1. Status Atual por Módulo

### 1.1 Pronto ✅

|Módulo|Status|Notas|
|------|------|-----|
| Auth|✅ Completo|Supabase Auth|
| Dashboard|✅ Completo|Agregação funcionando|
| Accounts CRUD|✅ Completo|Todas as operações|
| Transactions CRUD|✅ Completo|Lista + criar|
| Transfers|✅ Completo|Entre contas|
| Goals CRUD|✅ Completo|Completo|
| Goal Contributions|✅ Completo|Completo|
| Investments CRUD|✅ Completo|Completo|
| Loans CRUD|✅ Completo|Completo|
| Credit Cards|✅ Completo|Lista + fatura|
| Categories|✅ Completo|Hierarquia|
| Import XLSX|✅ Completo|Parser|
| Subscription Checkout|✅ Completo|Stripe|
| Subscription Webhook|✅ Completo|Processa eventos|
| Admin Users|✅ Completo|Lista|
| Profile|✅ Completo|Mudança de dados|
| Avatar Upload|✅ Completo|Storage|

### 1.2 Parcial ⚠️

|Módulo|Status|Notas|
|------|------|-----|
| Recurring Transactions|⚠️ Parcial|Cria template,mas scheduler não funciona|
| All Transfers|⚠️ Parcial|Lista, mas filtros básicos|
| Admin Plans|⚠️ Parcial|CRUD existe mas UI básica|
| Admin Subscriptions|⚠️ Parcial|Lista, mas ações limitadas|
| Shared Accounts|⚠️ Parcial|Estrutura existe,mas funcionalidade parcial|
| Notifications|⚠️ Parcial|Estrutura existe,mas não populada|
| Data Management|⚠️ Parcial|Rota existe mas delete não funciona|

### 1.3 Não Implementado ❌

|Módulo|Status|Notas|
|------|------|-----|
| Export dados|❌ Não funciona|Rota existe|
| Recurring Scheduler|❌ Não implementado|Scheduler não existe|
| Bulk export|❌ Não implementado|-|
| API REST|❌ Não implementado|Só SDK|

---

## 2. Roadmap por Fase

### Fase 1: Estabilidade (Semana 1-2)

Objetivo: Corrigir débitos críticos.

|ITEM|Descrição|Priority|Alto|
|----|---------|--------|-----|
| F1.1 | Versionar schema do banco | Alta | Criar SQL |
| F1.2 | Adicionar testes críticos | Alta | Setup Vitest |
| F1.3 | Keys em variáveis ambiente | Alta | Refatorar service |
| F1.4 | Corrigir recurring scheduler | Alta | Implementar ou remover |

### Fase 2: Melhorias UI (Semana 3-4)

Objetivo: Melhorar experiência.

|ITEM|Descrição|Priority|
|----|---------|--------|
| F2.1 | Migrar para @if/@for completo | Média |
| F2.2 | Adicionar paginação em todas listas | Média |
| F2.3 | Melhorar feedback de erros | Média |
| F2.4 | Consistência visual | Baixa |

### Fase 3: Novas Features (Semana 5-8)

Objetivo: Funcionalidades pedidas.

|ITEM|Descrição|Priority|
|----|---------|--------|
| F3.1 | Export dados (CSV) | Média |
| F3.2 | Notificações push | Média |
| F3.3 | Dashboard customizável | Baixa |
| F3.4 | Relatórios | Baixa |

### Fase 4: Escalabilidade (Semana 9+)

Objetivo: Preparar para escala.

|ITEM|Descrição|Priority|
|----|---------|--------|
| F4.1 | Cache | Baixa |
| F4.2 | Rate limiting | Baixa |
| F4.3 | CDN | Baixa |
| F4.4 | API REST | Baixa |

---

## 3. Pendências por Área

### 3.1 Backend / Banco

|Pendência|Descrição|Estimativa|
|---------|---------|----------|
| P001 | Schema versionado | 2h |
| P002 | Migrations | 4h |
| P003 | RLS em todas tabelas | 1h |
| P004 | Funções RPC comuns | 2h |
| P005 | Soft delete em tabelas | 3h |

### 3.2 Frontend

|Pendência|Descrição|Estimativa|
|---------|---------|----------|
| P006 | Keys em env vars | 1h |
| P007 | Paginação em listas | 4h |
| P008 | Migrar @control flow | 2h |
| P009 | Type safety | 4h |
| P010 | Loading states | 2h |

### 3.3 Features

|Pendência|Descrição|Estimativa|
|---------|---------|----------|
| P011 | Recurring scheduler | 8h |
| P012 | Export CSV | 4h |
| P013 | Notifications | 6h |
| P014 | Shared accounts completo | 8h |
| P015 | Admin actions | 4h |

### 3.4 Infraestrutura

|Pendência|Descrição|Estimativa|
|---------|---------|----------|
| P016 | CI/CD | 4h |
| P017 | Testes e2e | 8h |
| P018 | Monitoring | 4h |
| P019 | Alerts | 2h |
| P020 | Logging estruturado | 4h |

---

## 4. Bugs para Corrigir

|Bug|Descrição|Priority|Estimativa|
|---|---------|--------|----------|
| B001 | Recurring não gera | Alta | 8h |
| B002 | Bulk import trava | Média | 4h |
| B003 | Notifications vazias | Média | 2h |
| B004 | Export não funciona | Média | 4h |
| B005 | Nomes de colunas | Baixa | 2h |

---

## 5. Refatorações Necessárias

|Refatoração|Descrição|Estimativa|
|------------|----------|----------|
| R001 | Keys para env | 1h |
| R002 | Remove duplicados | 4h |
| R003 | Tipos corretos | 2h |
| R004 | Limpar console.log | 1h |

---

## 6. Documentação Pendente

|Doc|Descrição|
|----|----------|
| D001 | API atualizada |
| D002 | Setup local |
| D003 | Deploy |

---

## 7. Feature Requests Futuros

|FR|Descrição|Impacto|
|---|---------|--------|
| FR01 | Relatórios mensais | Médio |
| FR02 | Metas compartilhadas | Médio |
| FR03 | Dashboard customizável | Alto |
| FR04 | API GraphQL | Alto |
| FR05 | Multilingue | Médio |
| FR06 | App mobile | Alto |

---

## 8. Dependências Externas

|Dependência|Versão Atual|Última Versão|Urgência|
|----------|-----------|-----------|----------|
| @angular/core | 21.x | 21.x | Baixa |
| @supabase/supabase-js | 2.100.1 | 2.1.x | Média |
| @stripe/stripe-js | 21.0.1 | 21.x | Baixa |
| tailwindcss | 4.1.12 | 4.x | Baixa |

**Nota:** Verificar atualizações periódicas.

---

## 9. Priorização Recomendada

### 9.1 O Que Fazer Primeiro

1. **F1.1** (Schema) — Sem isso, deploys pode quebrar
2. **F1.2** (Testes) — Sem testes, bugs passam despercebidos
3. **F1.4** (Recurring) — Feature principal quebrada

### 9.2 O Que Fazer Depois

1. **F2.*** (UI) — Melhorias
2. **F3.*** (Novas features) — Valor agregado
3. **F4.*** (Escala) — Preparação crescimento

### 9.3 O Que Ignorar Por Agora

- API REST (FR04)
- App mobile (FR06)
- Multilingual (FR05)

---

## 10. Métricas de Saúde do Projeto

|Métrica|Valor Atual|Alvo|
|--------|----------|-----|
| Cobertura de testes | ~10% | >70% |
| Bugs abertos | 5 | <2 |
| Débitos técnicos | 20 | <5 |
| Documentation | 15 docs | 15 docs |
| Lighthouse score | ND | >80 |

---

## Resumo

|Fase|Itens|Duração|
|-----|-----|-------|
| Estabilidade | 4 | 1-2 semanas |
| Melhorias UI | 4 | 3-4 semanas |
| Novas Features | 4 | 5-8 semanas |
| Escalabilidade | 4 | 9+ semanas |

**Total estimado:** 3-4 meses para stabilize + melhorar significativamente.

---

**Próximo passo:** Glossário.