# Erros Conhecidos e Débitos Técnicos - SmartMoney

## Visão Geral

Este documento lista problemas conhecidos, débitos técnicos, fragilidades e riscos de manutenção. O objetivo é que qualquer contribuidor entenda o que precisa ser tratado antes de evoluir o sistema com segurança.

---

## 1. Erros Conhecidos

### 1.1 Bugs Identificados

|ID|Bug|Impacto|Workaround|
|---|---|--------|----------|
| B001 | Recurring transactions não são geradas automaticamente | Usuários criam templates, mas não viram transações | Manual (cron job não implementado) |
| B002 | Bulk import pode travar com planilhas grandes | Browser pode congelar com >10MB | Dividir planilha |
| B003 | Notifications não são populadas | Página de notificações vazia | Implementar services |
| B004 | Export dados não funciona | Rota existe mas ação não | Implementar |
| B005 | Nome de colunas em CSV podem não ser identificadas | Heurística limitada | Editar manualmente |

### 1.2 Warnings de运行时

|warning|Origem|Severidade|
|-------|------|----------|
| "Dev mode" no console | Angular padrão | Baixa |
| Stripe webhook retry | Stripe tenta novamente | Baixa |

---

## 2. Débitos Técnicos

### 2.1 Alta Prioridade

|DT|Descrição|Risco|Magnitude|
|---|---------|-----|-----------|
| DT01 | Schema banco não versionado | Sem controle de migração | Alto |
| DT02 | Sem testes automatizados | Bug não detecta | Alto |
| DT03 | URL/Chave hardcoded em service | Difícil mudar ambiente | Alto |
| DT04 | Recurring scheduler não funciona | Perda de funcionalidade | Alto |

### 2.2 Média Prioridade

|DT|Descrição|Risco|Magnitude|
|---|---------|-----|-----------|
| DT05 | Códigos duplicados (modais) | Manutenção difícil | Médio |
| DT06 |.any em alguns lugares | Type safety | Médio |
| DT07 | *ngIf/*ngFor ainda em uso | Migrar para @if/@for | Médio |
| DT08 | Sem paginação em algumas listas | Performance | Médio |
| DT09 | Not implemented | Pages não funcionam | Médio |
| DT10 | Shared accounts parcialmente | Feature incompleta | Médio |

### 2.3 Baixa Prioridade

|DT|Descrição|Risco|Magnitude|
|---|---------|-----|-----------|
| DT11 | Design inconsistente em alguns lugares | UX | Baixa |
| DT12 | CSS pode ser refatorado | Manutenção | Baixa |
| DT13 | Alguns logs de debug no código | Limpeza | Baixa |
| DT14 | Documentação dispersa | Onboarding | Baixa |

---

## 3. Fragilidades

### 3.1 Segurança

|Fragilidade|Descrição|Impacto|Mitigação|
|----------|---------|-------|---------|
| F01 | Keys em frontend | Exposição não crítica (anon key) | Mover para variável |
| F02 | Validação em client-side | Bypassável | Validar em Edge Function |
| F03 | Rate limiting não configurado | Possível abuso | Configurar Supabase |

### 3.2 Dados

|Fragilidade|Descrição|Impacto|Mitigação|
|----------|---------|-------|---------|
| F04 | Sem soft delete | Perda de dados | Implementar |
| F05 | Sem auditoria | compliance | Tables audit |
| F06 | Dados órfãos podem existir |Inconsistência | Constraints |
| F07 | Sem backup automático | Risco de perda | Configurar |

### 3.3 Performance

|Fragilidade|Descrição|Impacto|Mitigação|
|----------|---------|-------|-----------|
| F08 | getDashboardSummary agrega 8 queries | Lento com muitos dados | Queries otimizadas |
| F09 | Sem cache | many roundtrips |Implementar cache |
| F10 | Bulk import client-side | Browser pode travar | Servidor de processamento |

### 3.4 Integrações

|Fragilidade|Descrição|Impacto|Mitigação|
|----------|---------|-------|-----------|
| F11 | Webhook pode falhar silenciosamente | Pagamento não sync | Logs + alertas |
| F12 | Cancel em período pode dar race | Status incorreto | Idempotency |
| F13 | Price IDs não verificáveis | Checkout pode falhar | Validação explícita |

---

## 4. Inconsistências

### 4.1 Código

|IC|Inconsistência|Onde|
|---|-------------|-----|
| IC01 | Mix de *ngIf/@if | Templates |
| IC02 | Mix de Promises/RxJS | Services |
| IC03 | Alguns componentes sem interface | Models |
| IC04 | Nomes diferentes para mesma coisa | Vários |
| IC05 | Console.log em produção | Edge Functions |

### 4.2 Dados

|IC|Inconsistência|Onde|
|---|-------------|-----|
| IC06 | category como text (não ID) | transactions table |
| IC07 | parent_id pode ser null ou ID | categories |
| IC08 | Status mixed (string/enum) | Várias tables |

### 4.3 Documentação

|IC|Inconsistência|Onde|
|---|-------------|-----|
| IC09 | Arquivos docs em múltiplos lugares | /docs |
| IC10 | Alguns comentários outdated | Código |

---

## 5. Pontos de Atenção para Evolução

### 5.1 Antes de Mudar Billing

1. **Adicionar novo plano:**
   - Adicionar em `plans` DB
   - Adicionar price ID em `plans.constants.ts`
   - Adicionar em ALLOWED_PRICE_IDS Edge Function
   - Testar checkout completo

2. **Mudar Stripe integration:**
   - Atualizar STRIPE_SECRET_KEY
   - Atualizar webhook endpoint
   - Testar fluxo completo

### 5.2 Antes de Mudar schema

1. **Adicionar tabela:**
   - Criar migration
   - Configurar RLS
   - Adicionar em supabase.service.ts
   - Adicionar interface

2. **Mudar tabela existente:**
   - Verificar foreign keys
   - Verificar dados existentes
   - Atualizar RLS se necessário

### 5.3 Antes de Adicionar Feature

1. **Verificar feature access:**
   - Adicionar em PLAN_FEATURES
   - Adicionar em resources se DB
   - Testar hasFeature()

2. **Verificar permissões:**
   - Adicionar guard se rota protegida
   - Verificar RLS

---

## 6. Limitações Conhecidas

### 6.1 Funcionais

|Lim|Descrição|
|---|---------|
| L01 | Máximo ~1000 transactions via UI (sem paginação em alguns lugares) |
| L02 | Planilhas Excel (.xlsx) apenas |
| L03 | Sem suporte offline |
| L04 | Sem API REST pública |
| L05 | Família só compartilha accounts |

### 6.2 Técnicas

|Lim|Descrição|
|---|---------|
| L06 | Browser storage (localStorage) |
| L07 | Sem CDN |
| L08 | Sem server-side caching |
| L09 | Supabase como único backend |

---

## 7. Riscos de Manutenção

### 7.1 Crítico

|Risco|Descrição|
|-----|---------|
| R01 | Sem migrations: schema pode divergir entre ambientes |
| R02 | Sem testes: bugs podem passar despercebidos |

### 7.2 Alto

|Risco|Descrição|
|-----|---------|
| R03 | Keys hardcoded: mudança de ambiente difícil |
| R04 | Recurring não funciona: funcionalidade principal quebrada |
| R05 | Documentação outdated: onboarding difícil |

### 7.3 Médio

|Risco|Descrição|
|-----|---------|
| R06 | Códigos duplicados: manutenção difícil |
| R07 | Sem logging estruturado: debug difícil |
| R08 | Performance pode degradar com escala |

---

## 8. Recomendações Imediatas

### 8.1 Dívida para Resolver Primeiro

1. **Migrations do banco:**
   - Criar script de schema
   - Versionar via Git

2. **Testes:**
   - Testar critical paths (auth, checkout, CRUD)
   - Setup CI

3. **Recurring:**
   - Implementar scheduler
   - Ou documentar como "não implementado"

### 8.2 Dívida para Resolver Médio Prazo

1. Keys em variáveis de ambiente
2. Migrar para @if/@for completo
3. Paginação em todas as listas
4. Testes e2e

### 8.3 Dívida para Resolver Longo Prazo

1. Refatorar duplicações
2. Documentação centralizada
3. Logging estruturado
4. Cache

---

## 9. Checklist Pré-Release

- [ ] Schema versionado
- [ ] Testes cobrindo critical paths
- [ ] Keys em variáveis de ambiente
- [ ] Recurring funcionando ou documentado
- [ ] bulk import com limite documentado
- [ ] Notifications implementadas ou removidas
- [ ] Export implementado ou removido
- [ ] Performance aceitável com carga
- [ ] Error handling adequado
- [ ] Logging estruturado

---

## Resumo

| Severidade | Qtd |
|-----------|-----|
| Alta | 11 |
| Média | 6 |
| Baixa | 3 |

**Prioridade de resolução:**
1. Migrations (DT01)
2. Testes (DT02)
3. Hardcoded keys (DT03)
4. Recurring (DT04)

---

**Próximo passo:** Roadmap e pendências.