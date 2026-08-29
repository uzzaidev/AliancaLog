# Checkpoint — Aliança Log

> **Onde estamos agora.** Atualize a cada sessão de trabalho.
> Plano: [PLAN.md](./PLAN.md) · Lista marcável: [CHECKLIST.md](./CHECKLIST.md).

**Última atualização:** 2026-08-28

## Correção do fluxo motorista/mobile e painel (2026-08-28)

1. **Causa confirmada em produção:** o mobile gravava corretamente, mas o deployment
   antigo filtrava `recusada`/`ocorrencia` e mantinha KPIs zerados. A NF 24468 foi
   acompanhada ponta a ponta: banco atualizado, fotos presentes e retirada do
   romaneio; no frontend antigo ela apenas desapareceu.
2. **Fila offline endurecida:** HTTP 400 não apaga mais a prova nem vira falso
   “Registrado”; item fica preservado e identificado como erro, com correção manual.
   Envio ganhou timeout de 45s, falha 5xx de uma NF não bloqueia as seguintes e o
   cache só muda após confirmação do servidor.
3. **PWA:** Service Worker v3 ganhou Background Sync em navegadores compatíveis;
   fallback de reabertura/online/intervalo segue ativo para iOS e demais navegadores.
4. **Reconciliação do motorista:** NF recusada/com ocorrência sai do romaneio local
   após sync; item ainda na fila fica bloqueado contra envio duplicado; Realtime
   invisível atualiza também cabeçalho e dados server-side do motorista.
5. **Migration 0023 aplicada:** backfill conservador corrigiu 1 NF legada (24127:
   `pendente` → `ocorrencia`) e criou `confirmar_romaneio_motorista`, tornando
   confirmação do romaneio + mudança das NFs para `em_rota` uma única transação.
   Backup lógico prévio: `backups/backfill_0023_antes.json`.
6. **Testes:** novo `test:offline`, smoke real ampliado com confirmação atômica;
   typecheck, lint, offline, segurança/RLS e build de produção verdes.

## Histórico — bloqueio de `DATABASE_URL` em 2026-08-20 (resolvido)

Naquela data, `password authentication failed for user "postgres"` derrubava
`db:migrate`, `db:status` e `db:backup`. A conexão foi restabelecida; em 28/08 a
migration 0023 foi aplicada normalmente. A conexão por **service role key**
permaneceu normal durante o incidente.

**Mudanças de 2026-08-20:**
1. **Fluxo de duplicatas na importação corrigido** (reportado em uso real). Três
   problemas: (a) o erro não dizia qual linha era, porque no caminho de fallback o
   servidor não devolvia `duplicadas` — causa raiz: `encontrarDuplicatas` roda com a
   sessão do usuário, e o RLS `cli_nf_select` esconde NF de outra empresa, então a
   checagem prévia passa limpa e só a constraint global barra; (b) remover uma duplicada
   limpava a marcação de todas, porque o estado era indexado por posição; (c) faltava
   remoção em lote. Corrigidos com `duplicatasDoErro()` (lê o `details` do erro do
   Postgres), identidade estável por linha (`__id`) e o botão "Remover N duplicadas".
2. **Banco zerado a pedido do Vítor** para uma rodada limpa de testes: 61 NFs, 13
   canhotos, 4 ocorrências, 12 romaneios e 16 fotos apagados; cadastros e logins
   preservados. Script reaproveitável em `scripts/reset-operacional.mjs`, com dry-run
   por padrão e backup automático em `backups/`.
3. **Revisão de pendências conferida contra o código** — `encaminhamentos/` atualizado
   (MVP A, Fase B, roteiro de testes e os dois arquivos por pessoa). Confirmado nesta
   data: Sentry, Playwright e CI ausentes; `STORE_CACHE` ainda esqueleto; sem deploy.

---

**Última atualização anterior:** 2026-08-14
**Sprint atual:** Encaminhamentos da reunião de 12/08 ([ata](../../reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md)) **concluídos dos dois lados** → o MVP A entra em fase de deploy + validação real
**Status geral:** 🟢 **Todo o código do MVP A está escrito** e passa em typecheck/lint/build + `test:security` 9/9. O que falta para o go-live não é feature: é **infra de produção** (deploy Vercel, Sentry, backup — Luis) e **validação real** (celular, cliente, piloto — Vítor). Levantamento completo em [encaminhamentos/mvp-a-pendencias.md](../../encaminhamentos/mvp-a-pendencias.md).

**⚠️ Caminho crítico: deploy na Vercel.** Câmera e Service Worker exigem HTTPS — metade do roteiro de validação do Vítor ([testes-ao-vivo-vitor.md](../../encaminhamentos/testes-ao-vivo-vitor.md)) está bloqueada até o staging subir.

**Revisão de fases (2026-08-14):** CHECKLIST conferido contra o código. Correções aplicadas:
GitHub já estava feito (só a Vercel falta); "imutabilidade forte do canhoto" ficou **obsoleto**
pelo A-007; o smoke test de RLS **já é script versionado**; a pergunta dos XMLs ao Matheus foi
**respondida na reunião** (D-005). E **3 itens listados como Fase B já estão entregues**:
importação de XML (+ `.zip`), fluxo de devolução/reentrega (via A-007) e metade das múltiplas
fotos (via A-010) — ver [encaminhamentos/fase-b-pendencias.md](../../encaminhamentos/fase-b-pendencias.md).

**Mudanças de hoje (2026-08-14) — parte do Vítor (frontend), [encaminhamentos/vitor-pirolli.md](../../encaminhamentos/vitor-pirolli.md):**
1. **A-002** — seletor de período no dashboard, plugado no parâmetro que o backend já expunha.
   O default aparece nomeado ("Hoje + pendências") em vez de placeholder, pra não parecer
   ausência de filtro.
2. **A-003** — upload de `.zip` de XMLs (`fflate`), reaproveitando o `parseNfeXml` que já lia
   lote. Filtra não-XML antes de descompactar e ignora lixo do macOS. Vale para os 2 perfis.
3. **A-008** — regra de "NF parada" isolada em `lib/alertas.ts` (conta da `data_entrega`, só
   status em aberto); badge na linha + chip que também filtra + linha no detalhe.
   `NotaRow` ganhou `data_entrega`.
4. **A-006 (camada visual)** — marcador de motorista no mapa, sobreposto às camadas de NF,
   com "visto há X min" e estado apagado após 5 min sem posição. **Realtime próprio**, sem
   `router.refresh()`, como o Luis pediu: o servidor define quem está ativo, o Realtime só
   sobrepõe posição mais recente.
5. **🐛 Bug encontrado e corrigido nos KPIs**: `getResumoHoje` contava `notas_fiscais.status`,
   mas desde a migration `0016` (A-007) a NF só persiste `pendente`/`em_rota`/`aceita` — os
   cards **"Recusadas" e "Ocorrências" marcavam zero para sempre**. Escapou do code review do
   A-007. Corrigido: os três desfechos passam a vir de `canhotos` (ancorados em
   `registrado_em`, então NF atrasada entregue hoje conta como entrega de hoje) e "Em aberto"
   passou a mostrar o passivo acumulado, batendo com a tabela. `Kpi` ganhou prop `hint`.
6. **Higiene**: removidos arquivos vazios acidentais na raiz (`hojeSP()`, `s`, `├ìndice`).
7. **Nada commitado** — working tree, aguardando aprovação do Vítor (regra do CLAUDE.md).

**Mudanças de hoje (2026-08-14) — encaminhamentos da reunião 12/08 (parte do Luis, [encaminhamentos/luis-fernando-boff.md](../../encaminhamentos/luis-fernando-boff.md)):**
1. **A-001 — filtro de data preso em "hoje" corrigido**: `getNotasDoDia`/`getPainelClientes`
   (`lib/data/gerencia.ts`) trocam `.eq("data_entrega", hoje)` por "hoje + tudo que está em aberto"
   (`NF_STATUS_ABERTOS`); `getNotasDoDia` ganhou `periodo` (`hoje`/`semana`/`mes`/`todos`, mesmo padrão
   de `lib/data/cliente.ts`) para o Vítor plugar o seletor do A-002. `buscarNf` (bipagem) não filtra
   mais por data — NF solta de qualquer dia é "em aberto" por definição. `getRomaneiosDoDia` (motorista)
   passa a filtrar por `status='ativo'` em vez de data. Mapa (`lib/data/mapa.ts`) alinhado ao mesmo
   filtro "aberto".
2. **A-009 — BIPE não atualizava em tempo real**: era sintoma do A-001 (bipar NF de romaneio antigo
   retornava "não encontrada", nunca chegava a gravar nada, logo nunca disparava Realtime). Realtime em
   si já estava correto (canal com sufixo aleatório, publicação já incluía as 3 tabelas).
3. **A-005 — troca de motorista de entrega já atribuída**: nova server action `trocarMotorista`
   (`app/gerencia/dashboard/actions.ts`) — remove a NF do romaneio de origem, encaixa no romaneio ativo
   do motorista destino (reaproveita um existente hoje, senão cria), apaga o romaneio de origem se
   ficar vazio. UI no `DetailPanel` de `components/gerencia/notas-list.tsx`.
4. **A-004 — exclusão em lote de notas duplicadas**: `excluirNotas` (mesmo arquivo) bloqueia exclusão de
   NF com canhoto (evita apagar prova de entrega via cascade). UI: seleção múltipla + "marcar
   duplicadas" (mesmo `numero_nf`) em `notas-list.tsx`.
5. **A-007 — nota não aceita volta ao painel (o item mais delicado)**: decisão do PO, sobrescreve D-006
   da ata — `recusada`/qualquer `ocorrencia` devolvem a NF pro painel como `pendente`, disponível para
   nova tentativa; só `aceita` é final. Migration `0016`: idempotência de `registrar_entrega_offline`
   passa a ser por `client_id` (tentativa), não mais por NF — permite múltiplos canhotos por NF
   (`uq_canhoto_nf` removido); trigger `nf_guard_motorista` e RLS `mot_nf_update` ajustados pra permitir
   o motorista zerar `romaneio_id`/`motorista_id` numa tentativa não aceita; `fecharRomaneio` simplifica
   `STATUS_FINAIS` pra `["aceita"]` (consolidado em `NF_STATUS_FINAIS`, `lib/types.ts`, usado em todo
   lugar que antes tinha essa lista duplicada). **Backfill incluído na migration** pra NFs que já
   estavam presas em `recusada`/`ocorrencia` de antes. Comprovante (`lib/data/comprovante.ts` +
   `ComprovanteModal`) agora lista todas as tentativas na timeline, com foto por tentativa.
6. **A-006 — rastreamento ao vivo dos motoristas**: migration `0017`, tabela `motorista_posicao` (1
   linha por motorista, upsert, `atualizado_em` sempre via trigger no servidor — não confia no relógio
   do celular), RLS (motorista só escreve a própria linha, gerência lê todas), Realtime habilitado.
   `components/motorista/posicao-tracker.tsx`: `watchPosition` ligado só com romaneio ativo E
   confirmado, throttle de 30s/50m. `getPosicoesMotoristas()` (`lib/data/mapa.ts`) pronta pro Vítor
   plugar a camada visual no mapa (fora do escopo do Luis).
7. **A-010 — foto obrigatória de chegada**: migration `0018`, `canhotos.foto_chegada_url` (mesma linha
   da tentativa, não tabela própria — decisão registrada no comentário da migration). Fluxo do motorista
   (`canhoto-form.tsx`) vira 2 passos: 1) foto de chegada (obrigatória, antes de tudo) → 2) foto do
   canhoto + status. Fila offline/`/api/sync` sobem as duas fotos em paralelo. Comprovante (gerência e
   cliente) mostra as duas fotos lado a lado.
8. **QA — code review completo** (skill `/code-review` em nível alto, 6 agentes em paralelo) encontrou e
   corrigiu 11 problemas reais introduzidos pelos itens acima, os dois mais sérios: **portal do cliente
   mostrava "Canhoto registrado" (sucesso) numa entrega recusada** (`components/cliente/notas-list.tsx`
   não tinha sido atualizado pro novo modelo de tentativas) e **fila offline travava para sempre** num
   item antigo sem foto de chegada (400 fazia `break` e bloqueava todos os itens seguintes). Lista
   completa dos 11 no relatório de findings da sessão.
9. **Migrations `0015`–`0018` aplicadas em produção** via `npm run db:migrate` (0015 — histórico do
   motorista — também estava pendente, nunca tinha sido aplicada apesar do código já assumir que
   estava). `npm run test:security` 9/9 contra o banco real, incluindo os 3 testes novos de múltiplas
   tentativas (T4a/b/c).
10. **Nada commitado nesta sessão** — mudanças só no working tree, aguardando confirmação pra commit
    (regra do CLAUDE.md: commit/push sempre pede aprovação explícita do Vítor a cada vez).
11. **Bug reportado à parte (não estava na ata): "importei 5 NFs, só 2 apareceram no mapa"**.
    Causa raiz, nada a ver com os itens acima: geocodificação é manual/em lote (botão
    "Geocodificar") contra o Nominatim gratuito, e um endereço que falhasse
    (`geocode_status='falhou'`) nunca era tentado de novo nem mostrava o motivo — ficava
    invisível no mapa pra sempre, em silêncio. Corrigido (migration `0019`, coluna
    `notas_fiscais.geocode_erro`, **aplicada em produção**):
    - `geocodificarPendentes` (`app/gerencia/dashboard/geocode-actions.ts`) agora reprocessa
      `'falhou'` também, não só nunca-tentados (nunca-tentados vão primeiro no lote).
    - `lib/geocode.ts` devolve o motivo específico da falha (endereço não encontrado, erro de
      rede, serviço indisponível...), guardado em `geocode_erro`.
    - Novo bloco "Localização" no `DetailPanel` de `components/gerencia/notas-list.tsx`: mostra
      o motivo da falha, deixa corrigir o endereço e tentar de novo, ou informar `lat`/`lng`
      manualmente como último recurso (endereço rural/informal que o Nominatim nunca resolve).
    - Também corrigido de passagem: o contador do botão "Geocodificar (N)" já usava o filtro
      "hoje + em aberto" (do item A-001 acima), mas a ação que geocodificava de fato tinha
      ficado presa em "só hoje" — uma NF pendente de dias anteriores contava no botão mas nunca
      era processada ao clicar.

**Pendente (parte do Vítor, ver [encaminhamentos/vitor-pirolli.md](../../encaminhamentos/vitor-pirolli.md)):**
A-002 (seletor de período na UI, backend já pronto), A-003 (upload de `.zip`), A-008 (alerta de NF
parada +7 dias), camada visual "Motoristas" no mapa (API do A-006 já pronta). Também pendente: Playwright
E2E (adiado nesta sessão — combinado explicitamente, não é esquecimento) e verificação visual no
navegador real dos fluxos novos (foto de chegada em 2 passos, troca de motorista, exclusão em lote) —
esta sessão não teve acesso a browser/celular.

**Mudanças de hoje (2026-08-01) — organização de docs + design system (cores/ícones) + nav mobile da gerência:**
1. **`docs/` reorganizado por assunto**, com índice novo:
   - `docs/governanca/` — PLAN.md, CHECKLIST.md, CHECKPOINT.md
   - `docs/db/` — MIGRATIONS.md
   - `docs/comercial/` — propostas, contrato, escopo técnico R01, planilhas
   - `docs/auxilio/` — material de apoio (diagrama de arquitetura)
   - `docs/README.md` (novo) — índice das pastas + regra de "onde colocar documento novo"
   - Todos os links cruzados (`CLAUDE.md`, `README.md`, `PLAN.md`, `CHECKPOINT.md`, `supabase/config.toml`) atualizados pros caminhos novos.
2. **Auditoria de cor hardcoded**: ~15 ocorrências de hex cru (`bg-[#f37312]`, `bg-[#1e1e1e]` etc.) em
   11 componentes, apesar de já existir um design token system completo via `@theme` do Tailwind v4 em
   `app/globals.css`. Todas trocadas pelas classes de token (`bg-brand`, `bg-dark`, `border-dark-3`...).
   Adicionados 3 tokens que faltavam: `success-bright`, `danger-bright`, `offline` (variantes pra uso
   em fundo escuro/estado offline). Regra "nunca hardcode, sempre token" documentada no
   [CLAUDE.md § Convenções](../../CLAUDE.md) e no [PLAN.md § Stack técnico](./PLAN.md).
3. **Auditoria de emoji na UI**: 5 ocorrências (📍/✅/✕) em 4 componentes trocadas por ícones
   `@tabler/icons-react` (`IconMapPin`, `IconX`) — consistente com o resto do app, que já usa Tabler em
   todo lugar. Regra "sem emoji em UI, usar Tabler" documentada no CLAUDE.md (emoji em Markdown de
   `docs/` como marcador de status continua normal, não é o mesmo problema).
4. **Auditoria de largura/altura hardcoded**: nada de errado — padrões existentes (`h-[52px]` em
   toolbar, `max-w-[1400px]` como teto de container, `min-w-[...] flex-1`) já são responsivos.
5. **Nav mobile da gerência reformulada** (estava feia/apertada no celular — nav horizontal com 4
   itens + logo + avatar disputando espaço numa única linha, texto cortando no meio por causa do
   scroll interno):
   - `components/gerencia/nav.tsx` ganhou um segundo export, `GerenciaBottomNav`: barra de abas fixa
     embaixo (ícone + rótulo curto), só visível abaixo do breakpoint `sm`, com
     `padding-bottom: env(safe-area-inset-bottom)` pro home indicator do iOS.
   - `GerenciaNav` (a nav horizontal original, dentro da topbar) agora só aparece a partir do `sm:` —
     no mobile ela desaparece, substituída pela bottom nav.
   - `components/gerencia/topbar.tsx`: no mobile fica só logo + avatar + sair.
   - `app/gerencia/layout.tsx`: renderiza `GerenciaBottomNav` e dá `pb-20` no `<main>` no mobile (só
     `pb-5` no desktop) pra conteúdo não ficar escondido atrás da barra fixa.
   - `components/brand/logo.tsx`: `whitespace-nowrap` no wordmark (parava de quebrar em "Aliança" /
     "Log" quando o espaço apertava).
   - **Ainda não confirmado visualmente** — `typecheck`/`lint`/`build` passam limpos, mas a verificação
     no navegador real fica para quem rodar o `npm run dev` (a sessão que gerou este checkpoint não tem
     acesso a browser).
6. **Nada commitado nesta sessão** — mudanças só no working tree, aguardando confirmação pra commit
   (regra do CLAUDE.md: commit/push sempre pede aprovação explícita do Vítor).

**Mudanças de hoje (2026-08-01) — resumo da sessão:**

*Parte 1 — resposta à revisão pré-piloto externa (achados P0/P1):*
1. **Sync do canhoto virou transacional** (migration `0011`, função `registrar_entrega_offline` +
   `app/api/sync/route.ts`): canhoto + update da NF + ocorrência agora são uma única transação de
   banco. Antes eram 3 chamadas separadas — se caísse entre o insert do canhoto e o update da NF, o
   retry via 409 apagava o item da fila com a NF ainda pendente. **Aplicada em produção.**
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

*Parte 2 — mapa de entregas no dashboard (início da Fase B "Mapas"):*
11. **Migration `0014`**: `lat`/`lng`/`geocode_status`/`geocoded_em` em `notas_fiscais` — coordenada do
    ENDEREÇO da NF (distinto de `canhotos.lat/lng`, que é o GPS do celular no momento do registro).
    **Aplicada em produção.**
12. **`lib/geocode.ts`**: geocodificação via Nominatim/OpenStreetMap (gratuito), 1 req/s (política de
    uso do Nominatim), best-effort — endereço que falha fica `geocode_status='falhou'`, não trava nada.
13. **`app/gerencia/dashboard/geocode-actions.ts`**: Server Action `geocodificarPendentes()`, lotes de
    até 15 NFs do dia por chamada (evita estourar timeout de Server Action com o rate limit do
    Nominatim).
14. **`components/gerencia/mapa-entregas.tsx` + `components/mapa/leaflet-map.tsx`**: mapa Leaflet no
    dashboard da gerência, toggle entre camada "Destino" (geocodificado) e "Entregue (GPS)" (canhoto),
    cores por status usando os tokens existentes, botão para disparar geocodificação dos pendentes.
15. **Motorista também ganhou navegação/mapa**: botão "Abrir no Maps" (`lib/maps.ts`) na tela de
    registrar canhoto e em cada card do romaneio — abre o Google Maps do celular com direções até o
    endereço (usa lat/lng se já geocodificado, senão o texto do endereço). `mapa-romaneio.tsx` mostra
    um mapa pequeno com as paradas do romaneio que já têm coordenada.
16. **Rota/otimização (TSP/VRP) ainda não implementada** — decisão registrada no PLAN.md (Google Maps
    pago vs. OSRM/VROOM self-hospedado), não é bloqueio de piloto.

*Parte 3 — histórico do motorista:*
17. **Migration `0015`**: relaxa `mot_nf_select` (RLS de `notas_fiscais`) — antes travava em
    `data_entrega = hoje_sp()`, então o motorista literalmente não conseguia ler NF de dia anterior,
    nem no banco direto. Agora só continua restrito a `motorista_id = auth.uid()` (sempre só o dele).
    Escrita não muda: `mot_nf_update` já não tinha filtro de data, e o trigger `nf_guard_motorista`
    (`0009`) já bloqueia edição de NF finalizada, de qualquer data. **Aplicada em produção.**
18. **`lib/data/motorista.ts`**: `getHistoricoRomaneios()` — todos os romaneios do motorista exceto o
    de hoje (já coberto por "Minhas entregas"), limitado a 90 (~3 meses) por consulta.
19. **`/motorista/historico`** (`historico-view.tsx`): lista read-only por data, reaproveitando
    `/motorista/romaneio/[id]` pra ver o detalhe (a tela já vira "read-only" sozinha quando todas as
    NFs estão finalizadas). Link "Histórico" no header do motorista, visível em todas as telas.

**Verificação técnica desta sessão:** `npm run typecheck`/`lint`/`build` passam depois de cada bloco de
mudanças; `scripts/smoke-seguranca.mjs` 8/8 depois das migrations 0011-0013; 15/15 migrations aplicadas
em produção (`npm run db:status`). **Não feito:** verificação visual no browser logado (gerência e
motorista) com dado real — mapa e histórico não foram vistos rodando de fato, só validados por
build/typecheck.

**Pendente, ainda não feito (contexto completo na conversa que gerou este checkpoint):**
- Offline-first de verdade (abrir romaneio/NFs do IndexedDB sem rede desde o boot — hoje só funciona
  se a aba já estava aberta).
- Fallback de deduplicação para NF sem `chave_acesso` (hoje só dedup por chave; import de legado
  com número de NF repetido entre emitentes precisa de critério combinado, com cuidado para não gerar
  falso positivo).
- Pipeline de CI (GitHub Actions) e testes E2E (Playwright) — não existem ainda, só o `npm test` local.
- Aprovação formal da A-008 reformulada com a Rotta/Matheus.
- Rota/otimização de múltiplas paradas (TSP/VRP) — decisão de arquitetura registrada, não implementada.

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
- **Localização do projeto:** `C:\Users\USER\Desktop\UZZ. AI\AliancaLog` — repo Git conectado ao
  GitHub (`uzzaidev/AliancaLog`). **Movido para fora do OneDrive em 2026-08-28** (o Vítor desinstalou o
  OneDrive): a sincronização parou no meio e partiu o projeto — inclusive o `.git` — em duas metades
  complementares entre o caminho antigo (`OneDrive\Desktop\...`) e o novo (`Desktop\...`). Nada foi
  perdido (as metades não tinham arquivos em comum), mas foi preciso encerrar o `OneDrive.exe`, consolidar
  os dois lados com robocopy e revalidar `git fsck` + `typecheck`/`lint`/`build`/`test:security` do zero.
  **Não deixe o projeto voltar para dentro de uma pasta sincronizada (OneDrive/Google Drive/Dropbox)** —
  sincronização em tempo real e um repositório Git não combinam bem quando há muita escrita concorrente.
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
