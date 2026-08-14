# Checklist — Aliança Log (até o app 100%)

> **Fonte de verdade do progresso.** Marque `[x]` ao concluir cada item.
> Plano completo (com detalhe de cada papel): [PLAN.md](./PLAN.md) · Estado atual: [CHECKPOINT.md](./CHECKPOINT.md).
> Regra: um item só é marcado quando **funciona e foi verificado** (build/teste/uso real).
> Cada sprint mostra o **responsável principal**; itens específicos têm a tag `→ Pessoa` quando relevante.

## Sprint 0 — Fundação ✅
**Responsável:** Luis (infra/backend) + Vítor (frontend/UI base)
- [x] Scaffold Next.js 16 + React 19 + TypeScript + Tailwind v4
- [x] Estrutura de pastas (app / components / lib / supabase / scripts)
- [x] Design system base (tokens de cor, Button/Card/Badge/Field/Input, logo, app-shell) `→ Vítor`
- [x] Clientes Supabase: browser / server / proxy / admin (`@supabase/ssr`) `→ Luis`
- [x] Auth 3 perfis: login (Server Action), logout, DAL (checagem segura) `→ Luis`
- [x] Proxy de roteamento por role (`proxy.ts`) + proteção de área `→ Luis`
- [x] Schema SQL (romaneios → NFs → canhotos → ocorrências) + índices + trigger updated_at `→ Luis`
- [x] RLS completo (gerência / motorista / cliente) via claims do JWT `→ Luis`
- [x] Storage: bucket privado `canhotos` + policies `→ Luis`
- [x] Seed fictício (`scripts/seed.mjs`): empresas, motoristas, romaneio do dia, logins
- [x] PWA manifest (instalável)
- [x] README com setup
- [x] Build + typecheck + lint verdes; dev server servindo login
- [x] Projeto Supabase real criado (sa-east-1) + `.env` preenchido
- [x] Migrations aplicadas no projeto real (`npm run db:migrate`, 0001→0007)
- [x] Seed rodado e login testado de verdade — gerência e motorista confirmados em uso real;
      **cliente_final ainda não testado**
- [~] Push para o GitHub (`uzzaidev/AliancaLog`) ✅ **feito** (remote conectado, commits no ar)
      + **deploy na Vercel ainda pendente** `→ Luis` — ⚠️ é o **caminho crítico**: câmera e
      Service Worker exigem HTTPS, então metade dos testes ao vivo depende disto

## Sprint 1 — Gerência + ingestão
**Responsável:** Vítor (telas e fluxo) + Luis (consultas/RLS por trás)
> Implementado e compilando. Verificação em runtime contra Supabase real ainda pendente.
- [x] Layout/navegação da área de gerência
- [x] Dashboard: contadores do dia (Total/Aceitas/Recusadas/Ocorrência/Em aberto) — "Retida" não é
      mais status próprio desde a migration `0008`; virou tipo de ocorrência `canhoto_retido`
- [x] Dashboard: lista de NFs (NF · empresa · motorista · endereço · status · horário)
- [x] Dashboard: filtros (status, motorista, empresa) + atualização em tempo real
- [x] Importar Excel: upload `.xlsx`/`.csv`
- [x] Importar Excel: parser + preview + **mapeamento configurável de colunas**
- [x] Importar Excel: atribuição de motorista + confirmação cria as NFs do dia
- [x] Romaneio por câmera: criar romaneio (motorista + veículo)
- [x] Romaneio por câmera: bipar NF (`BarcodeDetector` + fallback `@zxing/library`)
- [x] Romaneio por câmera: casar nº bipado com NF importada + fallback manual
- [x] Cadastros: motoristas (cria login + app_metadata)
- [x] Cadastros: empresas clientes (cria login do portal)
- [x] Cadastros: veículos
- [ ] Verificação runtime com Supabase real (import, realtime, RLS, câmera no celular)
- [ ] Deploy + revisão com o cliente

## Sprint 2 — Motorista + Offline
**Responsável:** Vítor (telas) + Luis (offline/sync — papel dele com maior peso na divisão de %)
> Implementado e compilando. Falta validar em runtime com Supabase real (e câmera/offline no celular).
- [x] Lista de romaneios do dia + confirmação de recebimento (→ `em_rota`)
- [x] Tela do romaneio: NFs (nº + destinatário + endereço), progresso, busca
- [x] Registrar canhoto: câmera (`<input capture>`) → preview/refazer
- [x] Registrar canhoto: compressão de imagem (canvas, ~200KB) + upload ao Storage (`/api/sync`)
- [x] Registrar canhoto: 4 status (botões grandes) + ocorrência (tipo + texto obrigatório)
- [x] Regra: foto obrigatória para "Aceita"
- [x] Offline: Service Worker (hand-rolled `public/sw.js`) + cache do app shell
- [x] Offline: fila de canhotos no IndexedDB (foto como blob) + sync idempotente
- [x] Offline: sincronização → `POST /api/sync` idempotente (`client_id`) ao voltar a conexão
- [x] Offline: banner "N aguardando sincronização"
- [ ] Cache offline da LISTA do dia (leitura offline cold-open) — refinamento `→ Luis`
      — confirmado como **não feito** em 14/08: `STORE_CACHE` existe mas nunca é
      escrito nem lido; o motorista só vê a lista offline se a aba já estava aberta
- [x] ~~Imutabilidade forte do canhoto (bloquear re-registro)~~ — **item obsoleto**:
      o A-007 (migration `0016`) fez o oposto de propósito, removendo `uq_canhoto_nf`
      para permitir múltiplas tentativas por NF. A imutabilidade que permanece é a da
      NF já **aceita** (trigger `nf_guard_motorista`)
- [ ] Teste em modo avião → aparece no dashboard ao voltar o sinal (runtime)
- [ ] Deploy + teste no celular (câmera exige HTTPS)

## Sprint 3 — Realtime + Portal + fechamento
**Responsável:** Vítor (portal cliente + modal) + Luis (Realtime/Supabase)
> Implementado e compilando. Verificação em runtime contra Supabase real ainda pendente.
- [x] Supabase Realtime: dashboard atualiza < 3s sem refresh `→ Luis`
- [x] Modal de canhoto: foto em alta + detalhes + timeline da NF `→ Vítor`
- [x] Fechamento de romaneio: resumo (X/Y entregues, ocorrências, recusadas) + arquivar `→ Vítor`
- [x] Regra: romaneio só fecha com todas as NFs resolvidas; recusada não bloqueia
- [x] Portal cliente: lista de NFs da empresa (RLS) `→ Vítor` + `→ Luis`
- [x] Portal cliente: filtros (status, período, NF/cidade) + status realtime `→ Vítor`
- [x] Portal cliente: comprovante (foto via URL assinada + horário + motorista) `→ Luis`
- [ ] Deploy + revisão ponta-a-ponta

## Pré-piloto — Revisão de produto (jul/2026)
> Achados da revisão com pesquisa de mercado (ePOD + legislação NF-e). Itens de código
> implementados e compilando; itens de processo/infra ainda por fazer.
- [x] **Fix scanner**: código de barras do DANFE é a chave de acesso (44 dígitos), não o nº da NF
      — parser em `lib/nfe.ts` (valida DV módulo 11, extrai nNF), match por chave e por número
- [x] Coluna `chave_acesso` em `notas_fiscais` + GPS em `canhotos` (migration `0005`)
- [x] Foto do canhoto: compressão 800px→**1280px @ 0.8** (assinatura legível no zoom)
- [x] **GPS no registro do canhoto**: coleta pontual best-effort (lat/lng/precisão) + link
      "📍 Ver local do registro" no modal de comprovante
- [x] Migration `0005` aplicada no Supabase real (`npm run db:migrate`)
- [x] **Fix crítico do sync offline**: upload de foto com `upsert: true` violava RLS de
      `storage.objects` (só havia policy de INSERT) → sync retornava 500 e a fila nunca esvaziava.
      Corrigido: upload sem upsert (path já é idempotente pelo `client_id`, 409 tratado como
      sucesso) + índice `uq_canhoto_client_id` trocado de parcial para completo (migrations
      `0006`, `0007`). Validado ponta-a-ponta com sessão real do motorista (RLS aplicado).
- [~] Smoke test de RLS formal (risco R-008) — **script já existe e é versionado**:
      `scripts/smoke-seguranca.mjs` via `npm run test:security`, 9/9 contra o banco real
      (inclui T4a/b/c de múltiplas tentativas, do A-007). Falta confirmar cobertura do
      perfil `cliente_final` e ter isso rodando em CI, não só quando alguém lembra `→ Luis`
- [ ] Monitoramento de erros (Sentry ou similar) antes do piloto `→ Luis`
- [ ] Backup automático do banco (hoje `db:backup` é manual) `→ Luis`
- [ ] Critérios de sucesso do piloto escritos (ex.: 2–3 motoristas × 5 dias, ≥95% das entregas
      pelo app, zero perda no sync, Matheus abrindo o dashboard sem ser lembrado) `→ Vítor`
- [ ] Testar foto 1280px com canhotos reais em luz ruim (validar legibilidade) `→ Vítor` (piloto)
- [x] Perguntar ao Matheus se as empresas conseguem encaminhar os **XMLs das NF-e** —
      ✅ **respondido na reunião de 12/08** (decisão D-005): o cliente manda `.zip` de XMLs
      ao fechar cada carga. Continua o A-012 (alinhar o fluxo operacional com ele) `→ Vítor`

## Sprint 4 — Piloto & Go-Live (MVP A)
> Pendências detalhadas e priorizadas em
> [encaminhamentos/mvp-a-pendencias.md](../../encaminhamentos/mvp-a-pendencias.md);
> roteiro de validação em
> [encaminhamentos/testes-ao-vivo-vitor.md](../../encaminhamentos/testes-ao-vivo-vitor.md).
- [ ] Testes E2E (Playwright) do caminho crítico `→ Luis` — **gap de QA resolvido em 14/08**:
      o papel passou a ser dele. Adiado por decisão explícita, não é bloqueio de piloto
- [ ] Importar Excel reais das empresas `→ Vítor` (comercial, junto com Matheus)
- [ ] Criar logins reais (16 motoristas + ~20 empresas) `→ Luis`
- [ ] Piloto com 2–3 motoristas (primeira entrega real registrada) `→ Vítor` (CS/treinamento)
- [ ] Ajustes pós-piloto
- [ ] Material de apoio (guia 1 página) + treinamento do coordenador `→ Operação`
- [ ] Go-live: 100% dos motoristas + clientes com acesso
- [ ] Domínio + SSL configurados `→ Luis`

## Fase B — MVP Completo
**Responsável:** Luis (Dados/BI + GIS/Maps é papel dele na divisão de %)
> Revisão de 14/08 contra o código: **3 itens desta seção já foram entregues** pelos
> encaminhamentos da reunião de 12/08. Detalhe e escopo restante em
> [encaminhamentos/fase-b-pendencias.md](../../encaminhamentos/fase-b-pendencias.md).
- [ ] Roteirização (Directions API): ordem otimizada, reordenar, janela de entrega, aba "Por Empresa"
      — "Abrir no Maps" ✅ feito (`lib/maps.ts`); mapa de pontos ✅ feito; posição do
      motorista ao vivo ✅ feita (A-006). Falta a **otimização de ordem** (TSP/VRP),
      que depende da decisão Google Routes × OSRM/VROOM registrada no PLAN.md
- [ ] KPIs de motorista (total, taxa sucesso/problema, tempo médio, ranking, histórico, gráficos)
- [ ] Financeiro (custo/km, custo/hora, tarifa por empresa, rentabilidade, indicador 🟢🟡🔴, Distance Matrix)
- [ ] Dashboards/relatórios (gráficos, mapa de calor, top empresas, filtros avançados, exportação Excel/CSV)

### Adições da revisão de produto (jul/2026)
- [x] **Importar XML da NF-e** (formato nacional único — mata o mapeamento de colunas do Excel;
      parse nativo via `DOMParser`, preenche chave de acesso + destinatário + endereço completos)
      — ✅ `lib/import-nf.ts`; desde 14/08 aceita também **`.zip` de XMLs** (A-003), nos 2 perfis
- [x] **Fluxo de devolução/reentrega** — ✅ **entregue pelo A-007** (migration `0016`): toda NF não
      aceita volta ao painel como `pendente`, desatribuída, pronta para nova tentativa; o histórico
      de tentativas fica em `canhotos` e aparece na timeline do comprovante. Decisão do PO
      sobrescreveu a D-006 da ata (recusada também volta). Não existe mais "recusada para sempre"
- [ ] **Web Push para o motorista** ("romaneio novo chegou") — Android ok; iOS exige PWA instalado
      (iOS 16.4+). É também a resposta à pressão por "app nas lojas"
- [ ] **E-mail resumo para embarcadores** (diário/semanal, ou alerta de ocorrência) — portal hoje é
      só consulta passiva
- [~] Múltiplas fotos por canhoto (frente/verso, avaria) — **metade feita**: o A-010
      trouxe 2 fotos por tentativa (chegada + canhoto, migration `0018`). Falta
      generalizar para N fotos; atenção ao peso no IndexedDB da fila offline

## Fase C — Visão de longo prazo (argumento de recorrência)
- [ ] **Comprovante de Entrega Eletrônico (CE-e) oficial na SEFAZ** (Ajuste SINIEF 38/21):
      assinatura na tela + foto + GPS + timestamp registrados como evento fiscal — substitui o
      canhoto físico com validade jurídica. "Hoje digitalizamos seu canhoto; amanhã eliminamos o papel."

## Lojas de app (App Store / Google Play) — escopo novo
**Responsável:** Pedro Vitor
- [ ] Decidir abordagem técnica (Capacitor/TWA sobre o PWA existente, ou app nativo separado)
- [ ] Conta de desenvolvedor Apple (US$99/ano) e Google Play (US$25 único)
- [ ] Empacotamento e ícones/assets das lojas
- [ ] Submissão e processo de revisão
- [ ] Processo de atualização contínua (toda mudança no PWA precisa de novo build nas lojas?)

## Governança e negócio (não-técnico)
**Responsável:** UzzAI Empresa (jurídico + financeiro)
- [ ] Contrato de desenvolvimento assinado (escopo, cronograma, pagamento, IP, confidencialidade, SLA, rescisão)
- [ ] NDA assinado antes de receber dados reais do cliente
- [ ] Política de privacidade e termos de uso publicados (LGPD — fotos de canhoto, dados de motoristas/clientes)
- [ ] DRE do projeto revisado (margem, impostos, custo de API)
- [ ] Definição de prazo mínimo de contrato (crítico na modalidade só-recorrência)

## Definition of Done (transversal — checar antes de cada go-live)
- [ ] Cada role loga, é redirecionado e **não acessa** área de outro role
- [ ] Motorista não vê entrega de outro motorista (RLS)
- [ ] Cliente não vê NF de outra empresa (RLS)
- [ ] Offline funciona em modo avião e sincroniza ao voltar
- [ ] Realtime registro → gerência < 3s
- [ ] Carga inicial < 3s em 4G · upload de foto < 5s · roda em Android 9+/2GB
- [ ] Tudo HTTPS · fotos só por URL assinada (não indexável) · sem dado sensível em localStorage
