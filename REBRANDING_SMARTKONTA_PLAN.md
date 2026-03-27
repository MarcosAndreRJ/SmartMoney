# Plano de Implementacao - Rebranding SmartMoney -> SmartKonta

Este plano cobre migracao visual e textual da marca para SmartKonta usando o logo oficial anexado e mantendo a aplicacao estavel.

## Objetivo

- Unificar identidade visual em roxo/azul (tema claro/minimalista)
- Substituir referencias visiveis de SmartMoney por SmartKonta
- Aplicar logo oficial em pontos principais da interface
- Preservar funcionalidade e responsividade

## Escopo Tecnico

- `src/styles.css` (tokens globais e utilitarios de tema)
- `src/index.html` (title/metadados)
- `src/app/layout/sidebar.component.ts`
- `src/app/layout/header.component.ts`
- `src/app/features/auth/auth.component.ts`
- `src/app/features/dashboard/dashboard.component.ts`
- Ajustes pontuais de copy em componentes visiveis ao usuario

## Checklist Tecnico (ordem exata de implementacao)

1. [ ] Consolidar logo oficial em `src/assets` e padronizar caminho de uso
2. [ ] Criar tokens de marca em `src/styles.css` (cores, gradientes, superficies, texto)
3. [ ] Criar classes utilitarias globais (`.btn-brand`, `.input-brand`, `.chip-brand`, `.card-brand`)
4. [ ] Atualizar `<title>` em `src/index.html` para SmartKonta
5. [ ] Rebrand da sidebar (logo, nome, estado ativo, CTA primario)
6. [ ] Ajustar header para linguagem visual da nova marca
7. [ ] Refatorar tela de autenticacao para layout split com hero roxo + card claro
8. [ ] Ajustar dashboard para paleta roxo/azul sem perder semantica de sucesso/erro
9. [ ] Corrigir textos visiveis remanescentes com SmartMoney em componentes de UI
10. [ ] Executar validacao: build + grep de marca + checagem responsiva

## Criterios de Aceite

- Nao existem referencias de SmartMoney em telas visiveis do usuario
- Sidebar, header, auth e dashboard refletem identidade SmartKonta
- Logo oficial aparece sem distorcao nos principais pontos de navegação
- Build do projeto conclui sem erros

## Fora de Escopo desta rodada

- Renomear repositorio remoto/GitHub
- Alterar historico de SQL legado e docs internas de agentes
- Migracao de biblioteca de icones (material -> outra)
