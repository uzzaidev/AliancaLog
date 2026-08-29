# docs/ — índice

Documentação do projeto, organizada por assunto. Para visão geral e setup do app, veja o
[README.md](../README.md) na raiz; para orientação de trabalho no repositório, veja o
[CLAUDE.md](../CLAUDE.md) na raiz.

## Estrutura

| Pasta | Conteúdo | Comece por |
|---|---|---|
| [governanca/](./governanca/) | Plano do produto, checklist de progresso e checkpoint de sessão | [PLAN.md](./governanca/PLAN.md) |
| [db/](./db/) | Documentação do banco de dados (fluxo de migrations) | [MIGRATIONS.md](./db/MIGRATIONS.md) |
| [comercial/](./comercial/) | Propostas, contrato, escopo técnico original (R01), planilhas de percentuais/orçamento | [ALIANCA_LOG_DOCUMENTO_MESTRE.md](./comercial/ALIANCA_LOG_DOCUMENTO_MESTRE.md) |
| [auxilio/](./auxilio/) | Material de apoio (diagramas de arquitetura, checkpoint técnico) | [aliancalog-arquitetura.excalidraw](./auxilio/aliancalog-arquitetura.excalidraw) |

### governanca/ — plano, progresso, estado atual

- [PLAN.md](./governanca/PLAN.md) — produto, arquitetura e **quem no time é responsável por quê**. Fonte de verdade do escopo.
- [CHECKLIST.md](./governanca/CHECKLIST.md) — passo a passo marcável por sprint, com responsável em cada item. Fonte de verdade do progresso.
- [CHECKPOINT.md](./governanca/CHECKPOINT.md) — snapshot de "onde estamos agora", atualizado a cada sessão de trabalho.

### db/ — banco de dados

- [MIGRATIONS.md](./db/MIGRATIONS.md) — como criar, aplicar e revisar migrations (`supabase/migrations/`, runner `scripts/migrate.mjs`).

### comercial/ — negócio, propostas e contrato

- `ALIANCA-LOG-BUSINESS-PLAN-R01.pdf`, `ALIANCA-LOG-ESCOPO-TECNICO-R01.pdf` — escopo técnico e plano de negócio originais (R01), base do que foi contratado.
- `ALIANCA_LOG_DOCUMENTO_MESTRE.md` — documento mestre consolidando o histórico comercial.
- `ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx` — percentuais e valores de remuneração do time (ver [PLAN.md § Time e responsabilidades](./governanca/PLAN.md#time-e-responsabilidades)).
- `ALIANCA_LOG_ORCAMENTO_INTERATIVO_APENAS_PROJETO_COMERCIAL.xlsx`, `ALIANCA_LOG_PROPOSTA_B_PERSONAS_COMPLETO.xlsx`, `UZZAI_TEMPLATE_GERAL_PROJETOS_DESENVOLVIMENTO_EMPRESA.xlsx` — planilhas de orçamento/proposta.
- `Proposta_*.html`, `Proposta_*.docx`, `proposta_alianca_log*.docx`, `comparativo_escopo_alianca_log.docx`, `perguntas-escopo-rotta.pdf` — versões da proposta comercial e material de negociação.
- `Matheus-Rotta-Lead*.pdf` — material do lead/cliente (Rotta Logística).
- `Contrato/CONTRATO.pdf` — contrato assinado com o cliente.

### auxilio/ — material de apoio

- `aliancalog-arquitetura.excalidraw` — diagrama de arquitetura (abrir em [excalidraw.com](https://excalidraw.com) ou na extensão do VSCode).
- [CHECKPOINT_TECNICO.md](./auxilio/CHECKPOINT_TECNICO.md) — raio-x do sistema **extraído do código** (stack, rotas, componentes, schema, auth, integrações, testes, dívida técnica), não do histórico de decisões. Complementa o diagrama acima com texto verificável; ao contrário do `CHECKPOINT.md` de governança, não é atualizado a cada sessão — só quando a arquitetura muda de forma relevante.

## Como organizar novos documentos

- **governanca/** — só os 3 arquivos vivos de gestão do projeto (PLAN/CHECKLIST/CHECKPOINT). Não adicione outros documentos aqui; se for um novo tipo de documento de gestão, crie uma pasta nova.
- **db/** — documentação sobre o banco de dados, schema, RLS, migrations. Não é o lugar para migrations em si (`supabase/migrations/`), só para docs *sobre* elas.
- **comercial/** — qualquer coisa vinda do relacionamento comercial com o cliente: propostas, contratos, escopos assinados, planilhas de valores. Se é sobre "quanto custa" ou "o que foi vendido", vai aqui.
- **auxilio/** — material de apoio que não se encaixa nas outras pastas: diagramas, glossários, referências soltas. Categoria "guarda-chuva" — se crescer muito em um assunto específico, promova para uma pasta própria (ex.: `docs/diagramas/`).
- Ao criar uma pasta nova, atualize a tabela acima e o `CLAUDE.md`/`README.md` da raiz se a pasta virar leitura obrigatória.
