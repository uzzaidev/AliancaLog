# 99 — AI Context Pack

> **Se você só vai ler um arquivo desta pasta, seja este.** Resume tudo que uma IA (ou dev novo) precisa
> para começar a trabalhar no Aliança Log em minutos, sem reconstruir o raciocínio dos outros 21 arquivos.
> Cada afirmação aqui tem um arquivo-fonte nesta pasta para aprofundar.

## O produto, em 3 frases

Controle de canhotos de entrega em tempo real para a Rotta Logística. Um PWA com 3 perfis totalmente separados — **gerência** (monta romaneios, acompanha tudo), **motorista** (app de campo, offline-first) e **cliente final** (acompanha as próprias entregas, read-mostly). A unidade central é a **NF (nota fiscal)**: nasce numa importação (Excel/XML/PDF), entra num romaneio, é entregue (ou não) pelo motorista, e o resultado vira um **canhoto** com foto.

## A decisão de arquitetura que explica todo o resto

Só o motorista precisa funcionar sem internet. Isso sozinho explica: por que existe uma fila no IndexedDB (`11_OFFLINE_SYNC_PIPELINE_FROM_CODE.md`), por que existe um Service Worker escrito à mão, por que `/api/sync` é a única rota HTTP do sistema (Server Actions não são chamáveis de fora do React), e por que a idempotência (`client_id` gerado no device) é um tema recorrente em quase toda função de banco.

## A regra de produto que mais gente vai errar de primeira

**`aceita` é o único status final de uma NF.** `recusada` e `ocorrencia` não encerram nada — devolvem a NF ao painel da gerência para uma nova tentativa (decisão A-007, migration 0016, refinada na 0022). Se você está lendo/escrevendo código que assume "recusada = terminou, mal", está lendo a regra de negócio errada. A fonte de verdade é `NF_STATUS_FINAIS = ['aceita']` em `lib/types.ts`. Diagrama de estados completo: `17_ARCHITECTURE_DIAGRAMS.md`.

## A camada que realmente decide quem vê o quê

Não é `proxy.ts`, não é `requireRole()` — é o **RLS do Postgres**. As outras duas são UX (evitar flash de tela errada, redirecionar cedo). Se uma tarefa é "cliente não devia ver X", a mudança certa é uma policy RLS, não um `if` no componente. Ver `05_ARCHITECTURE_FROM_CODE.md` e `10_RLS_AND_SECURITY.md` — este último documenta 2 bugs reais de produção que só existiram por causa de detalhes sutis de como RLS interage com `ON CONFLICT` e com `UPDATE`.

## Onde cada tipo de mudança provavelmente vai

| Você quer... | Vá em... |
|---|---|
| Mudar uma regra de quem pode ver/editar o quê | Uma migration nova em `supabase/migrations/`, RLS — não no componente |
| Mudar o que acontece quando o motorista registra uma entrega | `registrar_entrega_offline` (função de banco) — não em `app/api/sync/route.ts`, que só orquestra upload de foto + chama a função |
| Adicionar um campo à NF | Migration nova + `lib/types.ts` (`NotaMotorista`/`ComprovanteDetalhe`) + a query em `lib/data/*.ts` que precisa dele |
| Mexer na tela do dashboard da gerência | `components/gerencia/notas-list.tsx` (602 linhas — é grande, ver `16_TECH_DEBT_FINDINGS.md`) |
| Adicionar uma nova forma de importar NF | `lib/import-nf.ts` (parsing) + `components/gerencia/import-wizard.tsx` (UI, compartilhada com o cliente via prop `variant`) |
| Mudar como a fila offline se comporta | `lib/offline/{queue,sync}.ts` — mas cuidado: qualquer mudança aqui precisa preservar idempotência por `client_id` |

## Os 3 coisas mais fáceis de esquecer neste codebase

1. **Fuso horário é sempre São Paulo, nunca o do servidor nem o do device.** `lib/date.ts` (app) + `hoje_sp()` (banco) existem porque isso já quebrou 2x em produção (RLS bloqueando o motorista à noite; hidratação React quebrando por hora divergente entre servidor UTC e celular UTC-3).
2. **`canhotos`/`ocorrencias` só têm um caminho de escrita: a RPC `registrar_entrega_offline`.** Nunca insira direto nessas tabelas de outro lugar — quebra a atomicidade que a migration 0011 existe para garantir.
3. **Uma policy de RLS que referencia outra tabela pode causar recursão infinita** se a outra tabela também referencia de volta. A saída é uma função `SECURITY DEFINER` minimalista (ver `motorista_registrou_nf`, migration 0021) — não tente resolver com mais uma condição direto na policy sem checar isso primeiro.

## Como o sistema é testado hoje (e como não é)

`npm run test:security` — 21 verificações de RLS/autorização, autenticando como cada role de verdade contra o banco real. **Não há teste de componente, não há E2E, não há teste unitário de função pura.** Se você adicionar uma regra de negócio nova em uma função de banco ou policy, o padrão do projeto é adicionar um bloco `T{N}` novo em `scripts/smoke-seguranca.mjs` seguindo o estilo dos blocos T8/T9 (autentica como o role certo, testa positivo E negativo). Detalhe completo: `15_TESTS_COVERAGE_MAP.md`.

## O que está genuinamente incompleto (não é "esqueceram", é escopo)

- CI só faz backup, não roda testes/build em PR (`14_OBSERVABILITY.md`, `16_TECH_DEBT_FINDINGS.md`)
- Offline-first não cobre "abrir o app pela 1ª vez sem rede" (`11_OFFLINE_SYNC_PIPELINE_FROM_CODE.md`)
- Sem roteirização de múltiplas paradas — motorista usa deep link do Google Maps ponto a ponto (`13_INTEGRATIONS_AND_COST.md`)
- `import_batches` (rastreio de migração de sistema legado) é um esqueleto sem nenhum uso real ainda (`16_TECH_DEBT_FINDINGS.md`, `18_KNOWN_ISSUES_AND_RISKS.md`)

## Mapa rápido dos outros 21 arquivos

| Se sua pergunta é sobre... | Vá para |
|---|---|
| Que stack é essa, versões | `01_STACK_DETECTION.md` |
| Onde fica cada arquivo | `02_REPO_TREE.txt` |
| Como rodar/buildar/deployar | `03_BUILD_RUNBOOK.md` |
| Dependências e por quê | `04_DEPENDENCIES.md` |
| Visão geral de arquitetura | `05_ARCHITECTURE_FROM_CODE.md` |
| Rotas e Server Actions | `06_ROUTES_FROM_CODE.md` |
| Componentes React | `07_UI_COMPONENTS_CATALOG.md` |
| Quem lê/escreve qual tabela | `08_DATA_ACCESS_MAP.md` |
| Schema completo, coluna a coluna | `09_DATABASE_SCHEMA_FROM_MIGRATIONS.md` |
| RLS, policies, os 2 bugs famosos | `10_RLS_AND_SECURITY.md` |
| Fila offline / sync do motorista | `11_OFFLINE_SYNC_PIPELINE_FROM_CODE.md` |
| Login, roles, JWT | `12_AUTH_AND_AUTHZ.md` |
| Integrações externas e custo | `13_INTEGRATIONS_AND_COST.md` |
| Sentry, logs, CI, backup | `14_OBSERVABILITY.md` |
| O que é testado e como | `15_TESTS_COVERAGE_MAP.md` |
| Dívida técnica de código | `16_TECH_DEBT_FINDINGS.md` |
| Diagramas (arquitetura, sequência, estados) | `17_ARCHITECTURE_DIAGRAMS.md` |
| Riscos de produto/operação | `18_KNOWN_ISSUES_AND_RISKS.md` |
| Histórico de sprints, o que mudou até hoje | `19_ESTADO_ATUAL_E_HISTORICO.md` |
| (não aplicável a este projeto) | `20_HERMES_DAEMON_INTEGRATION.md` |
| Manifesto/stats desta geração | `00_MANIFEST.json` |

## Fora desta pasta, mas essencial

- [CLAUDE.md](../../CLAUDE.md) — regras de trabalho no repo (nunca commitar/pushar sem aprovação explícita do Vítor, convenções de cor/ícone, etc.)
- [docs/governanca/PLAN.md](../../docs/governanca/PLAN.md) — produto e **quem no time decide o quê**
- [docs/governanca/CHECKPOINT.md](../../docs/governanca/CHECKPOINT.md) — diário de sessão, narrativa completa (este pack só resume)
