# 03 — Build Runbook

Evidência: [README.md](../../README.md), [package.json](../../package.json), [docs/db/MIGRATIONS.md](../../docs/db/MIGRATIONS.md).

## Pré-requisitos

- **Node ≥24** — exigido por `@zxing/library` (fallback do scanner). Ver `.nvmrc`.
- Projeto Supabase (região **South America / São Paulo**, `sa-east-1`) — a escolha de região importa: `lib/date.ts` e as funções de banco (`hoje_sp()`) assumem fuso `America/Sao_Paulo`, mas a região do Supabase em si é sobre latência, não fuso.

## Variáveis de ambiente

Copiar `.env.example` → `.env.local` (ou `.env` — todos os scripts do projeto tentam `.env.local` **ou** `.env`, nessa ordem, via `--env-file-if-exists`).

| Variável | Uso | Onde é lida |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | `lib/supabase/{client,server,proxy}.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (RLS aplica) | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta — **só servidor**, nunca no bundle client | `lib/supabase/admin.ts` (criação de login) |
| `DATABASE_URL` | Conexão direta Postgres (fora do RLS) | `scripts/migrate.mjs`, `migrate-status.mjs`, `backup.mjs`, `smoke-seguranca.mjs` — via `pg` |
| `NEXT_PUBLIC_SENTRY_DSN` (ou `SENTRY_DSN` no servidor/edge) | Error tracking | `sentry.*.config.ts` — **sem ela, Sentry fica `enabled: false`, silenciosamente** |

**Risco operacional conhecido:** `DATABASE_URL` já causou um bloqueio real em produção (`password authentication failed`, 2026-08-20, ver `docs/governanca/CHECKPOINT.md`) — derruba `db:migrate`/`db:status`/`db:backup`, mas **não** afeta o app em si (que usa a service role key, caminho separado).

## Sequência de setup (ambiente novo)

```bash
npm install
cp .env.example .env.local        # preencher com dados do projeto Supabase
npm run db:status                 # confere migrations aplicadas x pendentes
npm run db:migrate                # aplica supabase/migrations/*.sql em ordem, cada uma em transação
npm run seed                      # popula empresas/motoristas/romaneio fictícios + logins de demo
npm run dev                       # http://localhost:3000
```

**Logins de demonstração** (senha `alianca123`): `gerencia@rotta.com.br`, `joao@rotta.com.br`, `acesso@leitetravizao.com.br`.

## Ciclo de desenvolvimento

```bash
npm run dev         # Turbopack dev server
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # build de produção — TAMBÉM valida TypeScript (roda tsc internamente)
npm run test        # = typecheck && lint && test:security (NÃO inclui build)
npm run test:security   # scripts/smoke-seguranca.mjs sozinho, contra o banco real
```

**Nota:** `npm run test` não roda `build` — só `typecheck` (mais rápido, sem gerar output). Rodar `build` continua sendo manual antes de qualquer deploy/PR, não está automatizado em lugar nenhum (ver `14_OBSERVABILITY.md` sobre o gap de CI).

## Migrations

```bash
npm run db:status       # mostra o que está aplicado vs. pendente em public.schema_migrations
npm run db:migrate      # aplica pendentes em ordem numérica, cada uma em transação isolada
npm run db:backup       # pg_dump do schema public → backups/ (rodar antes de algo arriscado)
npm run db:setup-sql    # gera supabase/setup.sql concatenando todas as migrations (bootstrap rápido, não é o caminho de produção)
```

Regra do projeto (`CLAUDE.md`): **nunca editar uma migration já aplicada** — sempre criar um arquivo novo numerado (`00XX_descricao.sql`). Fluxo completo em [docs/db/MIGRATIONS.md](../../docs/db/MIGRATIONS.md).

## Deploy

**Não confirmado no código** (sem `vercel.json`, sem workflow de deploy no `.github/`) — inferido como Vercel por:
- Câmera (`BarcodeDetector`) e Service Worker exigem HTTPS — a URL da Vercel fornece isso de graça
- `docs/governanca/CHECKPOINT.md` cita a Vercel como destino desde Sprint 1
- Ausência de config de deploy é o padrão esperado para Next.js na Vercel (zero-config)

Se o deploy for de fato pela Vercel: variáveis de ambiente acima precisam estar configuradas no painel do projeto (⚠️ nomes com `NEXT_PUBLIC_` vazam pro bundle do cliente por design do Next.js — é esperado para as duas chaves públicas do Supabase, mas `SUPABASE_SERVICE_ROLE_KEY`/`DATABASE_URL` **nunca** devem ganhar esse prefixo).

## CI existente

Único workflow: [.github/workflows/db-backup.yml](../../.github/workflows/db-backup.yml) — `pg_dump` diário agendado (06:00 UTC) + `workflow_dispatch` manual. **Não builda, não testa, não faz deploy.** Ver `16_TECH_DEBT_FINDINGS.md`.
