---
name: smartmoney-feature-workflow
description: |
  Guia de fluxo de trabalho de ponta-a-ponta para criar novas funcionalidades no SmartMoney.
  Descreve os passos exatos: 1) Modelagem no banco Supabase, 2) Serviço e Types do Angular,
  3) Criação dos Signals de componente, e 4) Template e integração UI.
  Use sempre que for implementar algo novo que requeira backend e frontend.
---

# SmartMoney — Fluxo de Trabalho de Novas Funcionalidades (End-to-End)

## 🔄 Visão Geral do Fluxo

Ao receber a tarefa de criar uma nova tela ou funcionalidade, siga **estritamente** esta ordem:
1. **Banco de Dados (Supabase)**: Modelar a tabela, criar script SQL e configurar RLS.
2. **Serviços (Angular)**: Criar Types/Interfaces, mapear ícones (se aplicável), e criar métodos CRUD no `SupabaseService`.
3. **Estado (Signals)**: Estruturar o estado reativo do componente, derivadas (`computed()`) e ações.
4. **UI (Template)**: Criar o layout usando Tailwind, design system padrão e conectar as ações/modais.
5. **Integração (Navegação)**: Registrar na navegação, menu, rotas em caso de nova tela.

---

## Passo 1: 🗄️ Banco de Dados (Supabase)

Tudo começa no backend para garantir consistência e segurança.

1. **Criar a Tabela**:
   - Defina os campos usando os tipos nativos do PostgreSQL (`TEXT`, `NUMERIC(12,2)`, `UUID`, `TIMESTAMPTZ`, `DATE`).
   - Todo registro **deve** ter `id (UUID gen_random_uuid())`, `user_id (REFERENCES auth.users)`, e `created_at`.
2. **Habilitar RLS**:
   - Ative o *Row Level Security* com `ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;`.
   - Crie as políticas `FOR ALL USING (auth.uid() = user_id)`.
3. **Gerar Setup SQL**:
   - Coloque o script de criação no diretório sugerido: `src/assets/{feature}_setup.sql`.

---

## Passo 2: 🔌 Integração no Serviço (Angular)

Não crie serviços extras a menos que seja puramente lógico. Se envolver persistência remota, adicione no `SupabaseService` (`core/services/supabase.service.ts`).

1. **Criar a Interface**:
   ```typescript
   export interface SupabaseMyTable {
     id: string;
     user_id: string;
     name: string;
     // ...
   }
   ```
2. **Criar Métodos CRUD**:
   - Padrão: Todos os métodos começam validando se o usuário está logado:
   ```typescript
   const user = await this.getUser();
   if (!user) return { data: null, error: new Error('User not authenticated') };
   ```
   - Chamar `.eq('user_id', user.id)` preventivamente em `select()`, `update()`, e `delete()`.

---

## Passo 3: 🧠 Gestão de Estado (Signals)

Use a nova API Reativa do Angular 18+. **Nenhum BehaviorSubject**.

1. **Estrutura Básica**:
   ```typescript
   isLoading = signal(true);
   items = signal<SupabaseMyTable[]>([]);
   searchQuery = signal(''); // Para inputs no template
   ```
2. **Dados Derivados**:
   - Qualquer operação de filtro, soma, ordenação sobre a lista original deve ser um `computed()`.
   ```typescript
   filteredItems = computed(() => {
     const query = this.searchQuery().toLowerCase();
     return this.items().filter(i => i.name.toLowerCase().includes(query));
   });
   
   totalValue = computed(() => {
     return this.filteredItems().reduce((sum, item) => sum + item.amount, 0);
   });
   ```
3. **Mutation Directa**:
   - Após salvar no DB com sucesso, não refaça a query fetch geral (a menos que seja paginação complexa). Faça update otimista ou atualize o `signal` existente.
   ```typescript
   this.items.update(list => [newItem, ...list]);
   ```

---

## Passo 4: 🎨 UI e Template (Tailwind)

Somente crie o layout depois que o fluxo de dados estiver funcional. Siga o design system descrito na skill `smartmoney-architecture`.

1. **Obrigatório no HTML**:
   - Estado de **Loading** via `@if (isLoading())`.
   - Estado de **Empty** (Sem registros).
   - Card layout para agrupar as informações.
2. **Modais e Formulários**:
   - Se for algo rápido ou CRUD simples de 1 nível, use o modal de design padrão com fundo difuso (Backdrop).
   - Use `FormsModule` para vincular o input aos fields de criação, não use FormGroup a menos que sejam validações cruzadas muito complexas.

---

## Passo 5: 🗺️ Navegação (Se Aplicável)

Se for uma **Página Inteira** nova:
1. Adicione o tipo em `AppView` no arquivo `navigation.service.ts`.
2. Adicione ao array visual em `sidebar.component.ts`.
3. Implante a condição respectiva `@else if (currentView() === 'nome')` no `app.ts` e exporte/importe adequadamente.

---

## ✅ Regra de Ouro Final
Nunca salte a verificação do checklist do `smartmoney-specialist`. Somente dê a feature como entregue se ela respeita todas as regras de UI de tipagem e persistência segura no projeto.
