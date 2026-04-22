
## Prompt principal

```text
Analise este projeto como um engenheiro sênior de onboarding técnico.
Quero que você gere documentação para outra IA que não terá acesso ao código.

Antes de gerar os arquivos finais, crie internamente um inventário do projeto contendo:
- módulos encontrados
- entidades encontradas
- endpoints encontrados
- serviços encontrados
- componentes encontrados
- regras de negócio identificadas
- triggers/procedures/views encontradas
- padrões recorrentes

Use esse inventário como base para a documentação final.
Não mostre o inventário bruto se não for necessário.


Dividi a terefa em 3 etapas: 

```

## Etapa 1 — mapa do projeto

```text
Analise este projeto como um engenheiro sênior de onboarding técnico.
Quero que você gere documentação para outra IA que não terá acesso ao código.

Nesta etapa, gere apenas:
- 00-visao-geral.md
- 01-arquitetura.md
- 03-estrutura-de-pastas.md
- 04-modulos-e-responsabilidades.md
- 05-padroes-e-convencoes.md

Regras:
- Não seja genérico.
- Explique responsabilidade, padrão, dependências e acoplamentos.
- Transforme lógica implícita em explicação explícita.
- Registre ambiguidades quando existirem.
- Não copie código sem necessidade; sintetize comportamento e intenção.
```

## Etapa 2 — negócio e banco
```text

Continue a documentação técnica do projeto para outra IA sem acesso ao código.

Nesta etapa, gere apenas:
- 02-fluxos-principais.md
- 06-regras-de-negocio.md
- 07-entidades-e-relacionamentos.md
- 08-api.md
- 09-servicos-e-casos-de-uso.md
- 10-banco-de-dados.md

Regras:
- Priorize regras de negócio reais.
- Consolide regras espalhadas em múltiplos arquivos.
- Relacione banco, serviços e comportamento do sistema.
- Destaque validações, estados, transições e efeitos colaterais.
```

## Etapa 3 — manutenção

```text
Finalize a documentação técnica do projeto para outra IA sem acesso ao código.

Nesta etapa, gere apenas:
- 11-frontend-ou-interface.md
- 12-setup-e-ambiente.md
- 13-erros-conhecidos-e-debitos-tecnicos.md
- 14-roadmap-e-pendencias.md
- 15-glossario.md

Regras:
- Destaque riscos práticos de manutenção.
- Aponte fragilidades e inconsistências.
- Explique o que precisa ser sabido para evoluir o sistema com segurança.
- Seja objetivo e útil.
```