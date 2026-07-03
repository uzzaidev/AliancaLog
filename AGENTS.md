<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Key breaking change: **middleware.ts is now proxy.ts** — exports `proxy` (not `middleware`). Do NOT recreate middleware.ts.
<!-- END:nextjs-agent-rules -->

---

# Aliança Log — Visão geral para agentes

App web PWA de gestão de canhotos (recibos de entrega) para a Rotta Logística.
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase · Vercel.

## Leia antes de qualquer coisa

O arquivo de configuração completo do projeto está em [`CLAUDE.md`](./CLAUDE.md).
Ele contém: stack real, arquitetura implementada, convenções, time, e todos os comandos.

## Estrutura rápida

```
app/          → rotas Next.js (3 perfis: gerencia, motorista, cliente)
components/   → componentes React (organizados por perfil)
lib/          → lógica de servidor: auth, dados, offline, Supabase clients
supabase/     → migrations SQL (schema + RLS)
scripts/      → runner de migrations e seed
public/       → Service Worker PWA + assets
docs/         → documentação comercial e técnica
```

## Regras críticas

- Não crie `middleware.ts` — o proxy de sessão está em `proxy.ts` (root)
- Clientes Supabase: use `lib/supabase/{client,server,proxy}.ts`; nunca `admin.ts` no browser
- Mudanças de schema: novo arquivo numerado em `supabase/migrations/`, rode `npm run db:migrate`
- Tipos de domínio centralizados em `lib/types.ts` — não duplique enums
