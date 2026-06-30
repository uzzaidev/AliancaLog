# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

This repo currently contains **only planning/commercial documents** under [docs/](docs/) — there is **no application code yet** and no commit history. The authoritative source of truth for what to build is the technical scope document `docs/ALIANCA-LOG-ESCOPO-TECNICO-R01.pdf`. When scaffolding the app, follow that document's decisions exactly; the summary below distills the binding parts. Read the PDF directly before making architecture decisions not covered here.

The other docs (`*BUSINESS-PLAN*`, `*PROPOSTA*`, `*ORCAMENTO*`, the Rotta lead PDFs) are commercial/proposal artifacts, not technical specs.

## What this project is

**Aliança Log** is a web platform for **Rotta Logística** (a last-mile distribution company in Serra Gaúcha) that digitizes the full delivery-receipt ("canhoto") lifecycle, connecting management, drivers, and end clients in real time. Today the operation is manual (spreadsheet + WhatsApp + paper receipts); the non-negotiable goal is **real-time control of canhotos**.

Three user roles, each with its own UI surface:
- `gerencia` — management dashboard, Excel import, registrations (cadastros), reports, KPIs, financials
- `motorista` — mobile-first PWA, ultra-simple (one-handed, in sunlight, in a hurry), **must work offline**
- `cliente_final` — read-only portal scoped to that company's own notas fiscais

## Stack (definitive — do not substitute)

- **Frontend:** Next.js 14 **App Router** + TypeScript + TailwindCSS
- **Backend:** Next.js API Routes (serverless on Vercel)
- **DB / Auth / Realtime / Storage:** Supabase (PostgreSQL + RLS, Supabase Auth with JWT 3 roles, Supabase Realtime via WebSockets, Supabase Storage for canhoto photos)
- **Offline:** PWA — Service Worker + IndexedDB (via `next-pwa` / `workbox-webpack-plugin`)
- **Hosting / CI/CD:** Vercel, auto-deploy from GitHub
- Key libs: `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `xlsx` (server-side Excel parser), `react-hook-form`, `swr` or `react-query`

## Planned folder structure

```
app/
  (auth)/login/
  gerencia/{dashboard,importar,cadastros}/
  motorista/{entregas, canhoto/[id]}/
  cliente/notas/
  api/{entregas,canhotos,import,sync}/   # serverless route handlers
components/{ui,gerencia,motorista,cliente}/
lib/{supabase,excel-parser,offline}/     # offline/ = IndexedDB helpers
public/{manifest.json, sw.js}            # PWA
supabase/migrations/                     # SQL migrations
```

## Architecture constraints that drive the code

These are the decisions that span multiple files — get them right:

- **Offline-first for the driver app.** Drivers in Gramado/Canela/Petrópolis have weak/no signal. Flow: Service Worker serves the app from cache → today's deliveries load from IndexedDB → driver photographs the canhoto and sets status while offline → saved locally with a `sincronizado: false` flag → background sync POSTs the batch to `/api/sync` when signal returns. The UI shows a discreet "N registros aguardando sincronização" banner. Never block the driver on network.
- **Realtime, not polling.** Management dashboard and client portal subscribe to Supabase Realtime on the `canhotos` table (`postgres_changes` INSERT). When a driver registers a canhoto the dashboard updates in < 1s. No manual refresh, no polling.
- **Row Level Security is the authorization layer.** RLS policies in Postgres — not app code — enforce that `motorista` sees only their own deliveries for the current date, `cliente_final` sees only their company's notas fiscais, and `gerencia` sees everything. Enable RLS on `notas_fiscais` and `canhotos`. Keep policies in `supabase/migrations/`.
- **Photo upload flow:** compress on the client (max 800px, ~200KB) → upload to the private `canhotos` Supabase Storage bucket → store the returned URL on the canhoto record.
- **Excel import** (`/api/import`): management uploads the clients' `.xlsx`/`.csv`; parse server-side with `xlsx`, show a preview with **configurable column mapping** before confirming (e.g. "NF" may be "NOTA FISCAL" or "NF_NUM"). Required columns: NF number, recipient name, delivery address, client company. Confirmation bulk-creates the day's deliveries.

## Core data model

Tables: `empresas_clientes`, `usuarios` (extends `auth.users`, has `role` CHECK in `gerencia`/`motorista`/`cliente_final`, `empresa_id` only for `cliente_final`), `veiculos`, `motoristas`, `notas_fiscais`, `canhotos`.

Two status enums to keep consistent across UI and DB CHECK constraints:
- `notas_fiscais.status`: `pendente`, `aceita`, `recusada`, `retida`, `item_faltando`
- `canhotos.status`: `aceita`, `recusada`, `retida`, `item_faltando` (when `item_faltando`, the `item_faltante` text is required)

`canhotos.sincronizado BOOLEAN` distinguishes records that came through offline sync. Full schema is in the scope PDF §7 (Banco de Dados).

## Scope discipline (important)

The spec splits work into **MVP A** (auth, management dashboard, Excel import, cadastros, driver PWA with offline canhoto registration, read-only client portal) and **MVP B** (GPS routing via Google Maps API, driver KPIs, financial/profitability module, advanced dashboards/charts, advanced client filters, exportable reports).

Explicitly **out of scope** (v2/v3 — treat as separate change requests, do not build into A/B): automatic WhatsApp/push notifications, CT-e/NF-e emission, ERP integration, native iOS/Android apps (the PWA covers this), multiple coordinator levels, >12 months history retention.

"Regra de ouro" when a new feature request appears mid-development: (1) in scope A? → do it; (2) a bug in a contracted feature? → fix at no cost; (3) genuinely new? → log as a change request with separate pricing. When in doubt about whether something is in scope, ask rather than assume.

## Conventions

- Branch strategy: `main` (production) + `develop` (staging) + feature branches; PRs reviewed (Vitor ↔ Luis). `main` → `aliancalog.uzzai.com.br`, `develop` → `staging.aliancalog.uzzai.com.br`, PRs get preview URLs.
- Domain terminology stays in Portuguese (roles, table/column names, status values, "canhoto" = delivery receipt, "entrega" = delivery, "embarcador" = shipper/client company). Match the schema and the scope doc.
- Driver UI: large touch targets (min 48px), 16px+ fonts, one primary action per screen.

## Commands

No build tooling exists yet. Once the Next.js app is scaffolded the standard commands will be `npm run dev` / `npm run build` / `npm run lint`; update this section with the real scripts (and the test runner / single-test invocation) when `package.json` is created.
