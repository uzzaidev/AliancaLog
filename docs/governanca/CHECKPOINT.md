# Checkpoint — Aliança Log

> **Onde estamos agora.** Atualize a cada sessão de trabalho.
> Plano: [PLAN.md](./PLAN.md) · Lista marcável: [CHECKLIST.md](./CHECKLIST.md).

**Última atualização:** 2026-08-01
**Sprint atual:** Pré-aplicativo aprovado + ajustes pós-aprovação + **Sprint 3.5 (segurança/confiabilidade)** → próximo é deploy (Vercel/HTTPS) e piloto
**Status geral:** 🟢 MVP A + ajustes + endurecimento de segurança rodando em ambiente real; falta deploy (Vercel/HTTPS) e o piloto em si

**Mudanças de hoje (2026-08-01) — mapa de entregas no dashboard (início da Fase B "Mapas"):**
1. **Migration `0014`**: `lat`/`lng`/`geocode_status`/`geocoded_em` em `notas_fiscais` — coordenada do
   ENDEREÇO da NF (distinto de `canhotos.lat/lng`, que é o GPS do celular no momento do registro).
   **Aplicada em produção.**
2. **`lib/geocode.ts`**: geocodificação via Nominatim/OpenStreetMap (gratuito), 1 req/s (política de
   uso do Nominatim), best-effort — endereço que falha fica `geocode_status='falhou'`, não trava nada.
3. **`app/gerencia/dashboard/geocode-actions.ts`**: Server Action `geocodificarPendentes()`, lotes de
   até 15 NFs do dia por chamada (evita estourar timeout de Server Action com o rate limit do
   Nominatim).
4. **`components/gerencia/mapa-entregas.tsx` + `mapa-leaflet-inner.tsx`**: mapa Leaflet no dashboard da
   gerência, com toggle entre camada "Destino" (geocodificado) e "Entregue (GPS)" (canhoto), cores por
   status usando os tokens existentes (`--color-success`/`danger`/`warning`/`info`/`gray-600`), e botão
   para disparar a geocodificação dos pendentes do dia.
5. **Motorista também ganhou navegação/mapa** (não só gerência): botão "Abrir no Maps"
   (`lib/maps.ts`) na tela de registrar canhoto e em cada card do romaneio — abre o Google Maps do
   celular com direções até o endereço (usa lat/lng se já geocodificado, senão o texto do endereço,
   então funciona mesmo sem geocode). `components/motorista/mapa-romaneio.tsx` mostra um mapa
   pequeno com as paradas do romaneio que já têm coordenada. `components/mapa/leaflet-map.tsx` é o
   componente Leaflet compartilhado entre gerência e motorista (antes vivia só em `components/gerencia/`).
6. **Ainda não testado visualmente com dado real** (precisa geocodificar NFs reais + abrir no browser
   logado como gerência e como motorista) — `npm run build`/`typecheck`/`lint` passam e o dev server
   sobe sem erro, mas a verificação visual completa não foi feita nesta sessão.
7. **Rota/otimização (TSP/VRP) ainda não implementada** — decisão registrada no PLAN.md (Google Maps
   pago vs. OSRM/VROOM self-hospedado), não é bloqueio de piloto.

**Mudanças de hoje (2026-08-01) — resposta à revisão pré-piloto (achados P0/P1):**
1. **Sync do canhoto virou transacional** (migration `0011`, função `registrar_entrega_offline` +
   `app/api/sync/route.ts`): canhoto + update da NF + ocorrência agora são uma única transação de
   banco. Antes eram 3 chamadas separadas — se caísse entre o insert do canhoto e o update da NF, o
   retry via 409 apagava o item da fila com a NF ainda pendente. **Aplicada em produção** (2026-08-01).
2. **Storage de canhotos endurecido** (migration `0012`): path mudou para
   `{motorista_id}/{nf_id}/{client_id}.jpg`; policy exige que a 1ª pasta seja `auth.uid()` para
   motorista; bucket ganhou limite de 5MB e MIME `image/jpeg`/`image/webp`. **Aplicada em produção.**
3. **Rastreabilidade de migração do legado, esqueleto** (migration `0013`): tabela `import_batches` +
   colunas `legacy_source`/`legacy_id`/`import_batch_id` em `empresas_clientes`, `usuarios`,
   `motoristas`, `notas_fiscais`, `canhotos`, com `unique(legacy_source, legacy_id)`. Prepara a A-008
   mas **nenhuma importação real rodou ainda** — só o esqueleto. **Aplicada em produção.**
4. **Romaneio vazio na importação Excel** (`app/gerencia/importar/actions.ts`): se o insert das NFs
   falhar depois do romaneio já criado, o romaneio é removido (compensação) em vez de ficar ativo e
   vazio.
5. **Node 24 formalizado**: `engines` no `package.json` + `.nvmrc` (o `@zxing/library` já exige >=24).
6. **`supabase/setup.sql` deixou de ficar defasado**: agora é gerado por
   `npm run db:setup-sql` (`scripts/gen-setup-sql.mjs`), que concatena `supabase/migrations/*.sql` —
   antes ainda tinha o schema de 0001 sozinho (com `'retida'` como status), incompatível com produção.
7. **`npm test`** = typecheck + lint + `scripts/smoke-seguranca.mjs` (era só um script solto, sem
   estar amarrado em nenhum comando).
8. **Higiene do repo**: removidos arquivos vazios acidentais na raiz (`{,+`, `d.index`,
   `n.motorista_id`, etc.) e `material_estudo/`/`material_estudo.zip` (material pessoal, não é do
   produto) — ambos agora no `.gitignore`.
9. **Doc drift corrigido**: CHECKLIST.md ainda listava "Retidas" como status do dashboard (removido
   desde a `0008`); PLAN.md ainda descrevia import XML como Fase B, mas já está implementado
   (`lib/import-nf.ts`) desde a sessão de 13/07.
10. **`db:status`/`db:migrate` travavam com falso "HASH DIVERGE"** em 0001-0010: o hash de
    identidade da migration era calculado sobre o arquivo cru, e `core.autocrlf=true` no Windows
    troca LF↔CRLF no checkout — mudando o hash sem mudar o SQL de verdade. `scripts/migrate.mjs` e
    `scripts/migrate-status.mjs` agora normalizam `\r\n`→`\n` antes de hashear. Senha do banco também
    foi resetada nesta sessão (a antiga não autenticava mais no pooler — `EAUTHQUERY`).

**Pendente desta revisão, ainda não feito (ver contexto completo na conversa que gerou este
checkpoint):**
- Offline-first de verdade (abrir romaneio/NFs do IndexedDB sem rede desde o boot — hoje só funciona
  se a aba já estava aberta).
- Fallback de deduplicação para NF sem `chave_acesso` (hoje só dedup por chave; import de legado
  com número de NF repetido entre emitentes precisa de critério combinado, com cuidado para não gerar
  falso positivo).
- Pipeline de CI (GitHub Actions) e testes E2E (Playwright) — não existem ainda, só o `npm test` local.
- Aprovação formal da A-008 reformulada com a Rotta/Matheus.

**Sprint 3.5 — segurança e confiabilidade (2026-07-13), a partir de revisão cruzada externa:**
1. **Data operacional em São Paulo** (`lib/date.ts` + migration `0010`): `.slice(0,10)` (UTC) trocado
   por dia-calendário de SP no app E na RLS (`mot_nf_select` usava `current_date` UTC → à noite o
   motorista não via as NFs do dia). Instantes `timestamptz` seguem em UTC (correto).
2. **Sync idempotente de ponta a ponta** (migration `0009` + `app/api/sync/route.ts`): reenvio do
   mesmo canhoto é no-op (não reescreve `entregue_em`, não duplica ocorrência — dedup por
   `client_id`); no máximo 1 canhoto por NF (índice único).
3. **Imutabilidade + RLS mais restrita do motorista** (`0009`): NF finalizada não muda mais; motorista
   só altera status/foto/observação; canhoto só na própria NF em romaneio ativo; romaneio fechado não
   reabre. Trigger + policies, validados por `scripts/smoke-seguranca.mjs` (8/8 controles).
4. **Mensagem de sync real** (`canhoto-form.tsx`): usa o resultado do flush — "pendente de
   sincronização" quando não confirmou, em vez de sempre "Registrado".
5. **Cache/fila por usuário** (`public/sw.js` v2 + `LogoutButton`): SW não cacheia mais páginas
   autenticadas; logout limpa caches do SW e a fila/cache no IndexedDB (evita vazamento entre
   motoristas no mesmo aparelho).
6. **Docs/higiene**: README aponta o runner real (`npm run db:migrate`, 0001→0010); removidos
   `pnpm-lock.yaml` (projeto usa npm) e o arquivo vazio `Plano`.
   Verificação: typecheck + lint + build verdes; `smoke-seguranca.mjs` 8/8.

**Mudanças de hoje (2026-07-13) — ajustes pós-aprovação do cliente:**
1. **"Retida" deixou de ser status** (migration `0008`): virou o tipo de ocorrência `canhoto_retido`.
   Dados migrados; checks de status recusam `retida` (validado por smoke test).
2. **Foto obrigatória em TODOS os status** do canhoto (antes só "aceita") — no cliente
   (`canhoto-form.tsx`, botão desabilitado com dica) e no servidor (`app/api/sync/route.ts`).
3. **Cliente importa as próprias NFs** (`/cliente/importar`): empresa vem do JWT, nunca do
   formulário; RLS `cli_nf_insert` (0008) garante no banco (smoke test confirma que cliente NÃO
   consegue inserir para outra empresa). As NFs entram "soltas" e caem no painel da gerência via
   Realtime — sem reimportação manual.
4. **Importação por XML e PDF** (`lib/import-nf.ts`), nos dois perfis: XML de NF-e (recomendado —
   traz tudo + chave de acesso) via `DOMParser`; PDF/DANFE best-effort extrai só a chave (validada
   pelo DV) e o número, resto preenchido à mão. `ImportWizard` unificado por prop `variant`.
5. **Fornecedor na bipagem**: ao bipar, o toast e a lista do romaneio mostram a empresa embarcadora
   (fornecedor) + destino; XML/chave fazem a nota casar por match exato.
6. **Painel por cliente no dashboard** (`empresas-painel.tsx`): faixa de cards por empresa (avatar
   colorido, total, "N aguardando bipagem"); clicar abre a lista de NFs **agrupada por cidade**
   (número da NF, cliente final, cidade), priorizando a roteirização.
7. **Polish visual**: status badges com dot de cor, stat-cards com indicador, empty state do cliente
   com CTA de importação.
   Verificação: typecheck + lint + build verdes; parser XML testado (5/5 campos); smoke test de RLS
   e constraints no banco real passou.

**Mudanças de 2026-07-06:**
1. **Projeto Supabase real conectado**: `.env` preenchido e validado; migrations 0001→0005 aplicadas
   (o runner estava travado por hash mismatch em 0001–0004, editadas após aplicadas — hashes
   reconciliados com o conteúdo atual dos arquivos).
2. **Bug crítico do sync offline corrigido**: o upload de foto usava `{ upsert: true }`, que exige
   permissão de UPDATE em `storage.objects` — só havia policy de INSERT (migration `0003`). Todo
   registro de canhoto retornava 500, a fila do motorista nunca esvaziava e o dashboard nunca
   recebia o evento de Realtime. Corrigido em duas frentes: `app/api/sync/route.ts` faz upload
   sem `upsert` (o path já é idempotente pelo `client_id`; um 409 "already exists" no re-sync é
   tratado como sucesso) e o índice `uq_canhoto_client_id` foi trocado de parcial para completo,
   já que `ON CONFLICT (client_id)` não funciona com índice parcial (migrations `0006`, `0007`).
   Validado com sessão real do motorista (RLS aplicado): 1ª sync e re-sync retornam 200.
3. Dashboard 404 pós-login corrigido (cache stale do `.next` sem as sub-rotas registradas).
4. `package.json`: scripts `seed`/`db:*` agora carregam `.env.local` **ou** `.env` (antes só
   aceitavam `.env.local`, e o projeto usa `.env`).

**Mudanças de 2026-07-03:**
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

## ✅ Sprints 1–2 validados em runtime (2026-07-06)
Itens 1–4 da lista original concluídos: Supabase real criado, `.env` preenchido, migrations
aplicadas, seed rodado. Fluxo completo testado: login (gerência + motorista) → dashboard →
motorista registra canhoto offline → sync → dashboard atualiza via Realtime. Falta apenas:
- Testar o ciclo em **modo avião real** num celular (o teste desta sessão validou a chamada
  ao `/api/sync` diretamente, não o Service Worker/IndexedDB no dispositivo)
- Login do **cliente_final** (portal) ainda não testado de verdade
- Repo no GitHub + deploy na Vercel — **a câmera e o offline exigem HTTPS**, que a URL da Vercel fornece

## ✅ Implementado (Sprint 3 — Realtime + Portal + fechamento) — compila, falta validar com Supabase real
- **Modal de comprovante** compartilhado gerência/cliente: foto via URL assinada (RLS-check antes de assinar), timeline (criação → ocorrências → entrega), local do registro (GPS).
- **Fechamento de romaneio**: página de detalhe com progresso, botão só habilita com zero pendentes.
- **Portal do cliente**: lista de NFs da empresa (RLS) + filtros (status/período/busca) + realtime.
- **Verificado:** build/typecheck/lint verdes (14 rotas). **NÃO** testado em runtime.

## ✅ Correções da revisão de produto (2026-07-03) — compila, migration 0005 pendente de aplicar
- **Scanner**: `lib/nfe.ts` interpreta a chave de acesso do DANFE (valida DV, extrai o nº da NF); `buscarNf` casa por chave (exato) e por número; chave é gravada na NF ao bipar (enriquecimento).
- **Foto**: 1280px @ 0.8 (era 800px @ 0.7) — assinatura legível no zoom.
- **GPS**: coleta pontual no registro do canhoto (best-effort, nunca bloqueia) → colunas `lat/lng/gps_precisao` em `canhotos` → link "📍 Ver local do registro" no comprovante.
- **Migration `0005_chave_acesso_gps.sql`** — **aplicada** no Supabase real em 2026-07-06.

## ▶️ Próximo bloco de trabalho (Sprint 4 — Piloto & Go-Live)
Pré-piloto: falta smoke test de RLS formal (script versionado, 3 perfis), Sentry, backup
automático, critérios de sucesso do piloto. Depois: deploy (GitHub + Vercel), dados reais, logins,
piloto com 2–3 motoristas, treinamento, go-live.
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
- **Time e % de remuneração** consolidados em [PLAN.md](./PLAN.md) e [docs/comercial/ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx](../comercial/ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx).
- **Gap aberto:** ninguém tem o papel de QA/testes formalmente (PV migrou para App Store/Google Play). Ver PLAN.md.

## Comandos úteis
```bash
npm run dev        # desenvolvimento
npm run build      # build de produção (valida TS)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run seed       # popula dados fictícios (precisa de .env.local)
```
