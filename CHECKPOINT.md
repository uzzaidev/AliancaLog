# Checkpoint — Aliança Log

> **Onde estamos agora.** Atualize a cada sessão de trabalho.
> Plano: [PLAN.md](./PLAN.md) · Lista marcável: [CHECKLIST.md](./CHECKLIST.md).

**Última atualização:** 2026-07-03
**Sprint atual:** Sprints 0–3 implementados (compilando) + correções pré-piloto → próximo é o Sprint 4 (piloto)
**Status geral:** 🟢 MVP A completo no código; falta validar em runtime contra Supabase real e fazer deploy

**Mudanças de hoje (2026-07-03):**
1. **Sprint 3 concluído**: portal do cliente (filtros + lista + comprovante), modal de canhoto
   compartilhado (foto assinada + timeline), fechamento de romaneio com validação de pendentes,
   Realtime generalizado (canal configurável).
2. **Revisão de produto completa** (pesquisa ePOD + legislação NF-e) — achados e decisões em
   [PLAN.md § 7](./PLAN.md). Destaque: **bug crítico corrigido no scanner** — o código de barras do
   DANFE contém a chave de acesso (44 dígitos), não o número da NF; a bipagem nunca casaria com a
   importação. Novo parser em `lib/nfe.ts` + migration `0005` (chave_acesso + GPS do canhoto) +
   foto 1280px + carimbo de GPS no registro.
3. AGENTS.md por pasta (app/, components/, lib/, supabase/) para agent-readiness.

---

## ✅ Concluído (Sprint 0 — Fundação)
- App em `alianca-log/` (Next.js 16 + React 19 + TS + Tailwind v4).
- Autenticação dos 3 perfis: login/logout, DAL de checagem segura, `proxy.ts` roteando por papel e protegendo áreas.
- Banco modelado: `supabase/migrations/` (schema, RLS, storage).
- Seed fictício: `scripts/seed.mjs`.
- UI base + manifest PWA + README.

## ✅ Implementado (Sprint 1 — Gerência + ingestão) — compila, falta validar com Supabase real
- Sub-navegação da gerência (Painel / Romaneios / Importar / Cadastros).
- **Dashboard**: contadores do dia + lista de NFs + filtros + atualização em tempo real (Supabase Realtime via `realtime-refresher`).
- **Importar Excel**: assistente client (SheetJS sob demanda) com mapeamento de colunas + preview + criação das NFs (`importar/actions.ts`).
- **Romaneio por câmera**: scanner (`BarcodeDetector` + fallback `@zxing/library`), casamento com NF importada, entrada manual, criação do romaneio (`romaneios/actions.ts`).
- **Cadastros**: motoristas/empresas/veículos com criação de login via service role (`cadastros/actions.ts`).
- Migration `0004_realtime.sql` (habilita Realtime nas tabelas).
- **Verificado:** `npm run build`, `typecheck`, `lint` verdes (13 rotas). **NÃO** verificado em runtime (precisa de Supabase real; câmera precisa de HTTPS + celular).

## ✅ Implementado (Sprint 2 — Motorista + offline-first) — compila, falta validar com Supabase real
- **Entregas do dia**: lista de romaneios + **confirmação de recebimento** (→ `em_rota`) (`motorista/actions.ts`).
- **Romaneio**: lista de NFs (nº+destinatário+endereço) + progresso + busca (`romaneio-view`).
- **Registrar canhoto**: foto via `<input capture>` + **compressão por canvas** (~200KB), 4 status grandes, ocorrência (tipo + texto); foto obrigatória p/ "Aceita" (`canhoto-form`).
- **Offline-first**: fila no **IndexedDB** (foto como blob) → `POST /api/sync` **idempotente** (`client_id`); sincroniza ao voltar a conexão / reabrir / a cada 30s; **banner** de pendências (`lib/offline/*`, `sync-banner`).
- **Service Worker** próprio (`public/sw.js`) para abrir o app offline.
- **Verificado:** build/typecheck/lint verdes (14 rotas, incl. `/api/sync`). **NÃO** testado em runtime (offline/câmera precisam de celular + HTTPS).

## ⏳ Pendências para validar os Sprints 1–2 (dependem da sua conta)
1. Criar projeto **Supabase** (região **São Paulo / sa-east-1**).
2. `cp .env.example .env.local` e preencher as 3 chaves.
3. Aplicar migrations `0001`→`0004` (`supabase db push` ou SQL Editor).
4. `npm install && npm run seed`.
5. Testar fluxo completo: gerência importa/cria romaneio → motorista confirma e registra canhoto (inclusive em modo avião) → dashboard atualiza em tempo real → (Sprint 3: portal do cliente).
6. (Para publicar) repo no GitHub + Vercel — **a câmera e o offline exigem HTTPS**, que a URL da Vercel fornece.

## ✅ Implementado (Sprint 3 — Realtime + Portal + fechamento) — compila, falta validar com Supabase real
- **Modal de comprovante** compartilhado gerência/cliente: foto via URL assinada (RLS-check antes de assinar), timeline (criação → ocorrências → entrega), local do registro (GPS).
- **Fechamento de romaneio**: página de detalhe com progresso, botão só habilita com zero pendentes.
- **Portal do cliente**: lista de NFs da empresa (RLS) + filtros (status/período/busca) + realtime.
- **Verificado:** build/typecheck/lint verdes (14 rotas). **NÃO** testado em runtime.

## ✅ Correções da revisão de produto (2026-07-03) — compila, migration 0005 pendente de aplicar
- **Scanner**: `lib/nfe.ts` interpreta a chave de acesso do DANFE (valida DV, extrai o nº da NF); `buscarNf` casa por chave (exato) e por número; chave é gravada na NF ao bipar (enriquecimento).
- **Foto**: 1280px @ 0.8 (era 800px @ 0.7) — assinatura legível no zoom.
- **GPS**: coleta pontual no registro do canhoto (best-effort, nunca bloqueia) → colunas `lat/lng/gps_precisao` em `canhotos` → link "📍 Ver local do registro" no comprovante.
- **Migration `0005_chave_acesso_gps.sql`** criada — **aplicar com `npm run db:migrate`** no Supabase real.

## ▶️ Próximo bloco de trabalho (Sprint 4 — Piloto & Go-Live)
Pré-piloto: aplicar migration 0005, smoke test de RLS, Sentry, backup automático, critérios de
sucesso do piloto. Depois: dados reais, logins, piloto com 2–3 motoristas, treinamento, go-live.
Ver [CHECKLIST.md](./CHECKLIST.md) (seções "Pré-piloto" e "Sprint 4").

---

## Ambiente / decisões operacionais
- **Localização do projeto:** `C:\Users\USER\OneDrive\Desktop\UZZ. AI\AliancaLog` — repo Git conectado ao
  GitHub (`uzzaidev/AliancaLog`). **Está dentro do OneDrive**: `node_modules`/`.next` vão sincronizar e gerar
  ruído. Se ficar lento, considere excluir essas pastas do OneDrive (botão direito → "Liberar espaço" não
  resolve sync contínuo; o caminho mais confiável é mover o repo pra fora do OneDrive de novo e só
  empurrar pro GitHub via `git push`, sem depender da pasta sincronizada).
- **Next.js 16:** o antigo `middleware` agora é **Proxy** (`proxy.ts` na raiz). Não criar `middleware.ts`. O `create-next-app` deixou um `AGENTS.md` orientando a ler `node_modules/next/dist/docs/` antes de codar — seguir para futuras mudanças do Next 16.
- **Logins de demonstração** (senha `alianca123`): `gerencia@rotta.com.br`, `joao@rotta.com.br`, `acesso@leitetravizao.com.br`.
- **Time e % de remuneração** consolidados em [PLAN.md](./PLAN.md) e [docs/ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx](./docs/ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx).
- **Gap aberto:** ninguém tem o papel de QA/testes formalmente (PV migrou para App Store/Google Play). Ver PLAN.md.

## Comandos úteis
```bash
npm run dev        # desenvolvimento
npm run build      # build de produção (valida TS)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run seed       # popula dados fictícios (precisa de .env.local)
```
