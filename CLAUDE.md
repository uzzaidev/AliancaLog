# CLAUDE.md

Orientação para o Claude Code (ou qualquer agente) trabalhando neste repositório.

## Estado atual (não é mais um plano — já tem código real)

Sprints 0, 1 e 2 estão **implementados e compilando** (`npm run build`/`typecheck`/`lint` verdes). Sprint 3
em diante ainda não foi feito. Antes de assumir que algo "ainda não existe", **leia o código** —
[CHECKLIST.md](./CHECKLIST.md) tem o status real, item a item.

Documentos de referência, nesta ordem de leitura:
1. [README.md](./README.md) — visão geral e setup
2. [PLAN.md](./PLAN.md) — produto, arquitetura e **quem no time é responsável por quê**
3. [CHECKLIST.md](./CHECKLIST.md) — passo a passo marcável
4. [CHECKPOINT.md](./CHECKPOINT.md) — snapshot do estado atual, atualizar a cada sessão
5. `docs/` — documentos comerciais e o escopo técnico original (R01) em PDF

`AGENTS.md` (gerado pelo `create-next-app`) avisa que este projeto usa **Next.js 16**, que tem breaking
changes relevantes. O principal: **o antigo `middleware.ts` agora se chama `proxy.ts`** (mesma função,
arquivo na raiz, export `proxy`). Não recrie um `middleware.ts` — não existe mais.

## Stack real (não substituir sem necessidade clara)

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Supabase**: PostgreSQL + RLS + Auth (JWT, 3 roles) + Realtime + Storage, região `sa-east-1`
- Cliente Supabase: `@supabase/ssr` (não `auth-helpers-nextjs`, que está descontinuado)
- Offline: Service Worker próprio (`public/sw.js`, hand-rolled, não Serwist) + fila no IndexedDB
- Scanner de código de barras: `BarcodeDetector` nativo, fallback `@zxing/library`
- Parser de Excel: `xlsx` (SheetJS), carregado sob demanda no client (`import("xlsx")`)

## Arquitetura que já existe — usar, não recriar

- **Auth/roteamento por perfil**: `proxy.ts` faz checagem otimista (lê role do JWT) + redireciona por área;
  `lib/auth/dal.ts` faz a checagem segura (`requireRole`, `requireUser`) em Server Components; RLS no
  Postgres é a camada de autorização real (`supabase/migrations/0002_rls.sql`).
- **Clientes Supabase**: `lib/supabase/{client,server,proxy,admin}.ts` — `admin.ts` usa a service role
  key e só deve ser chamado no servidor (criação de login, etc.), nunca exposto ao browser.
- **Modelo de dados**: `empresas_clientes → usuarios → motoristas`, e `romaneios → notas_fiscais → canhotos
  / ocorrencias`. Romaneio é montado por **Excel** (dados ricos da NF) e/ou **câmera** (bipagem, casa com
  a NF já importada). Ver `supabase/migrations/0001_schema.sql`.
- **Offline**: `lib/offline/{db,queue,sync,image}.ts`. Fila no IndexedDB com `client_id` gerado no
  cliente (idempotência) → `POST /api/sync` faz upload da foto + grava o canhoto + atualiza a NF, tudo
  com upsert idempotente (`onConflict: "client_id"`).
- **Dados por área**: `lib/data/{gerencia,motorista,romaneios}.ts` — consultas server-side, já respeitando
  RLS pela sessão do usuário.

## Convenções

- Terminologia em português no domínio: `canhoto`, `romaneio`, `notas_fiscais`, `motorista`, `empresa_cliente`.
  Mantenha consistência entre nomes de tabela/coluna, enums em `lib/types.ts` e o texto da UI.
- UI do motorista: alvo de toque mínimo 48px (classe `.touch-target`), 1 ação principal por tela, sem
  mostrar itens/produtos da NF (o motorista já tem a NF física em mãos).
- Commits/PRs: `main` é produção. Sem branch `develop` formalizada ainda — confirmar com o time antes de
  assumir uma convenção de branches.
- **Git commit e git push exigem confirmação explícita do Vítor a cada vez** — nunca assuma que uma
  aprovação anterior (de uma tarefa, ou de um commit/push específico) autoriza os próximos. Pergunte
  antes de cada `git commit` e de cada `git push`, mesmo que a tarefa em si já esteja aprovada.

## Time — quem decide o quê

Ver [PLAN.md § Time e responsabilidades](./PLAN.md#time-e-responsabilidades) para o detalhe completo.
Resumo rápido para saber a quem perguntar/atribuir:
- **Vítor Pirolli** — Product Owner, decide escopo/prioridade, dono do frontend
- **Luis Fernando Boff** — dono do backend/infra/offline/DevOps e de toda a Fase B
- **Pedro Vitor Pagliarin** — App Store/Google Play (não envolvido no dia a dia do código web)
- Não há QA/revisor de código formal no momento — ver gap sinalizado no PLAN.md

## Comandos

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção (valida TS)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run seed       # popula dados fictícios (precisa de .env.local preenchido)
npm run db:status  # migrations aplicadas x pendentes
npm run db:migrate # aplica as migrations pendentes (supabase/migrations/*.sql)
npm run db:backup  # dump do schema public em backups/ (antes de algo arriscado)
```

**Migrations**: mudança de estrutura do banco é sempre um arquivo novo numerado em
`supabase/migrations/` (`0005_...sql`) aplicado com `npm run db:migrate`. O runner
(`scripts/migrate.mjs`, driver `pg`) roda cada uma em transação e registra em
`public.schema_migrations`; não edite migrations já aplicadas. Fluxo completo em
[docs/MIGRATIONS.md](./docs/MIGRATIONS.md). Requer `DATABASE_URL` no `.env.local`.

Não há suíte de testes automatizados ainda (Playwright está planejado no Sprint 4, não implementado).
