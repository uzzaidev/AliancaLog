# 04 — Dependências

Evidência: [package.json](../../package.json). 14 dependências de produção, 9 de desenvolvimento — deliberadamente enxuto (sem framework de UI de componentes, sem state manager, sem ORM).

## Produção

| Pacote | Versão | Papel | Por que essa escolha (quando documentado) |
|---|---|---|---|
| `next` | 16.2.9 | Framework | App Router, Server Actions, Server Components, `proxy.ts` (novo nome do middleware no Next 16) |
| `react` / `react-dom` | 19.2.4 | UI | |
| `@supabase/supabase-js` | 2.108.2 | Cliente DB/Auth/Realtime/Storage | |
| `@supabase/ssr` | 0.12.0 | Cliente Supabase server-side | Explicitamente **não** `@supabase/auth-helpers-nextjs` — descontinuado (`CLAUDE.md`) |
| `pg` | 8.20.0 | Conexão direta Postgres | Só para scripts de infra (`migrate.mjs`, `backup.mjs`, `smoke-seguranca.mjs`) via `DATABASE_URL` — fora do RLS, roda como superusuário/owner |
| `@sentry/nextjs` | 10.71.0 | Error tracking + session replay | |
| `@tabler/icons-react` | 3.45.0 | Ícones | Regra do projeto: nunca emoji em UI renderizada (`CLAUDE.md`) |
| `@zxing/library` | 0.23.0 | Scanner de código de barras (fallback) | Só quando `BarcodeDetector` nativo não existe no navegador; exige Node ≥24 |
| `leaflet` | 1.9.4 | Motor de mapa | |
| `react-leaflet` | 5.0.0 | Bindings React do Leaflet | |
| `xlsx` | 0.20.3 (via CDN da própria SheetJS, não npm registry) | Parser de planilha na importação | `import("xlsx")` sob demanda — não entra no bundle inicial |
| `pdfjs-dist` | 6.1.200 | Extração best-effort de DANFE em PDF | Worker (`public/pdf.worker.min.mjs`) roda fora da main thread |
| `fflate` | 0.8.3 | Descompacta `.zip` de XMLs em lote | |
| `zod` | 4.4.3 | Validação de input | |

**Nota sobre `xlsx`:** a versão em `dependencies` aponta para `https://cdn.sheetjs.com/...tgz`, não o pacote `xlsx` do npm registry (que parou nas versões antigas/vulneráveis). Isso é intencional da própria SheetJS — mas significa que `npm install` depende de acesso de rede a esse CDN especificamente, não só ao registry padrão.

## Desenvolvimento

| Pacote | Versão | Papel |
|---|---|---|
| `typescript` | ^5 | |
| `eslint` + `eslint-config-next` | ^9 / 16.2.9 | Linting — config pareada com a versão exata do Next |
| `tailwindcss` + `@tailwindcss/postcss` | ^4 | Estilo — v4 configura via `@theme` no CSS, não `tailwind.config.js` |
| `@types/node`, `@types/react`, `@types/react-dom`, `@types/leaflet` | — | Tipos |

## Scripts (`package.json`)

| Script | Comando | Notas |
|---|---|---|
| `dev` | `next dev` | |
| `build` | `next build` | Valida TypeScript como parte do build |
| `start` | `next start` | |
| `lint` | `eslint` | |
| `typecheck` | `tsc --noEmit` | |
| `test` | `npm run typecheck && npm run lint && npm run test:security` | Não inclui `build` |
| `test:security` | `node --env-file-if-exists=.env.local --env-file-if-exists=.env scripts/smoke-seguranca.mjs` | |
| `seed` | idem, `scripts/seed.mjs` | |
| `db:migrate` / `db:status` / `db:backup` | idem, respectivos scripts | |
| `db:setup-sql` | `node scripts/gen-setup-sql.mjs` | Sem `.env` — só concatena arquivos locais |

## Lockfiles presentes

| Arquivo | Usado? |
|---|---|
| `package-lock.json` | **Sim** — é o que `npm ci`/CI/scripts assumem |
| `pnpm-lock.yaml` | **Não** — órfão, ver `16_TECH_DEBT_FINDINGS.md` |

## Não encontrado

Nenhuma dependência de: ORM (Prisma/Drizzle/TypeORM), state management (Redux/Zustand/Jotai), CSS-in-JS (styled-components/emotion), biblioteca de componentes (MUI/Chakra/Radix), testing framework (Jest/Vitest/Playwright), HTTP client (axios — usa `fetch` nativo).
