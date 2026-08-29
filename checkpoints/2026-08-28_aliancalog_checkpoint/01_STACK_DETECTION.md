# 01 — Detecção de Stack

**Metodologia:** `PROMPT_GENERIC_PROJECT_CHECKPOINT.md` § Fase 0. Toda linha abaixo tem evidência —
nada foi assumido por convenção de mercado sem checar o arquivo real.

## Comandos executados

```bash
ls -la | grep -E "package.json|pom.xml|..."     # → só package.json (Node)
find . -maxdepth 3 -name "*.py" -o -name "*.rb" -o -name "*.java" ...   # → nenhum resultado
grep -r "DATABASE_URL|POSTGRES" . --include="*.env*"                    # → .env.example tem as 3 vars Supabase + DATABASE_URL
ls package-lock.json yarn.lock pnpm-lock.yaml                            # → os dois primeiros existem; pnpm-lock.yaml também (órfão, ver 16)
```

## Resultado

```yaml
stack_detection:
  tipo_projeto: fullstack (PWA)
  linguagem_principal: TypeScript
  framework_principal: Next.js 16.2.9 (App Router)
  package_manager: npm (package-lock.json é o usado de fato)
  versao_package_manager: npm 10.x (via Node 24 — ver .nvmrc)
  database:
    tipo: PostgreSQL (via Supabase, região sa-east-1)
    orm: nenhum — SQL puro em supabase/migrations/ + @supabase/supabase-js / pg direto
  build_tool: Turbopack (padrão do next build no Next 16)
  test_framework: nenhum framework — script Node autoral (scripts/smoke-seguranca.mjs)
  estilo:
    framework: Tailwind CSS v4 (via @theme em app/globals.css, não tailwind.config.*)
  deploy_provavel: Vercel (inferido, ver nota abaixo)
```

## Como cada campo foi confirmado

| Campo | Evidência |
|---|---|
| Next.js 16, App Router | `package.json` (`"next": "16.2.9"`); estrutura `app/` com `page.tsx`/`layout.tsx` |
| React 19 | `package.json` (`"react": "19.2.4"`) |
| TypeScript | `tsconfig.json` presente; 100% dos arquivos de código são `.ts`/`.tsx` |
| Tailwind v4 | `package.json` (`"tailwindcss": "^4"`, `"@tailwindcss/postcss"`); **não** existe `tailwind.config.js` — Tailwind v4 configura via `@theme` direto no CSS (`app/globals.css`) |
| Supabase (Postgres+Auth+Realtime+Storage) | `@supabase/supabase-js` + `@supabase/ssr` em `package.json`; `lib/supabase/*.ts`; `supabase/config.toml`; região `sa-east-1` citada em `README.md` |
| Sem ORM | Nenhuma dependência de Prisma/Drizzle/TypeORM/Knex; migrations são `.sql` puro aplicadas por `scripts/migrate.mjs` (usa `pg` direto) |
| Node ≥24 | `package.json` `engines.node`, `.nvmrc` = `24` — exigido porque `@zxing/library` (scanner fallback) requer Node 24+ |
| Sem framework de teste | Nenhuma dependência Jest/Vitest/Playwright/Mocha em `package.json`; `scripts/smoke-seguranca.mjs` é um script Node puro com `assert` caseiro |
| Deploy Vercel | **Inferido, não confirmado no código** — não há `vercel.json` (mas Next.js na Vercel é zero-config, ausência é esperada); `docs/governanca/CHECKPOINT.md` já citava a Vercel como destino; câmera/Service Worker exigem HTTPS, que só faz sentido com um deploy real |
| PWA | `app/manifest.ts` (convenção do App Router — não é um `public/manifest.json` estático); `public/sw.js` (Service Worker escrito à mão, não gerado por Serwist/Workbox) |
| Sentry | `@sentry/nextjs` + `sentry.{client,edge,server}.config.ts` + `instrumentation.ts` |

## Não encontrado / não aplicável

- **GraphQL:** não usado — `/api/sync` é o único endpoint HTTP, REST simples (`POST` com `FormData`)
- **Mensageria/fila externa** (Redis, SQS, RabbitMQ): não encontrado — a "fila" do sistema é o IndexedDB do navegador, não um serviço de infraestrutura (ver `11_OFFLINE_SYNC_PIPELINE_FROM_CODE.md`)
- **Container/Docker:** nenhum `Dockerfile`/`docker-compose.yml` no repositório
- **Monorepo:** não é — um único `package.json` na raiz, sem workspaces
