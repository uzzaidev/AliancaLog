# 07 — Catálogo de Componentes

42 componentes em `components/`. Nenhuma biblioteca de componentes externa (MUI/Chakra/Radix) — tudo autoral sobre Tailwind v4 + tokens em `app/globals.css`. Evidência: comentário de topo de cada arquivo + leitura direta dos 4 mais complexos.

## `components/ui/` — design system genérico (7 arquivos, server-safe)

| Componente | Papel |
|---|---|
| `dark-shell.tsx` | Faixa escura reutilizável — base visual da topbar da gerência, header do motorista, hero do cliente |
| `index.tsx` | Primitivos compartilhados (Badge, Button, Card, Spinner, StatusBadge — usados em quase todo componente de área) |
| `kpi.tsx` | Card de KPI: ícone colorido 38px + número grande + label + `hint` opcional |
| `modal.tsx` | Modal genérico: backdrop + painel centralizado, fecha em Escape/clique fora |
| `pill.tsx` | Pílula clicável/estática — status do motorista, filtros de toolbar, pills do hero |
| `progress.tsx` | Barra de progresso laranja, label "X de Y · %" |
| `timeline.tsx` | Linha do tempo com dots + conector vertical — usada no card do cliente e no comprovante |

## `components/gerencia/` (15 arquivos)

| Componente | Papel |
|---|---|
| `barcode-scanner.tsx` | `BarcodeDetector` nativo, fallback `@zxing/library` |
| `cadastro-forms.tsx` | Formulários de motorista/empresa/veículo |
| `cadastro-item-actions.tsx` | Botões desativar/reativar/excluir de um item de cadastro |
| `empresas-painel.tsx` | Faixa de clientes no dashboard — clicar abre lista agrupada por cidade |
| `fechar-romaneio-button.tsx` | Botão de fechamento, só habilita com zero pendentes |
| `filtros.tsx` | Barra de filtros do dashboard — escreve na URL (`searchParams`) |
| `import-wizard.tsx` (510 linhas) | Ver detalhe abaixo |
| `mapa-entregas.tsx` | Mapa de entregas do dashboard — toggle Destino/Entregue |
| `nav.tsx` | Dois formatos no mesmo arquivo: `GerenciaNav` (topbar, `sm:` +) e `GerenciaBottomNav` (mobile, fixa embaixo) |
| `notas-list.tsx` (602 linhas) | Ver detalhe abaixo |
| `realtime-refresher.tsx` | Escuta Supabase Realtime, dispara `router.refresh()` |
| `romaneio-builder.tsx` | Fluxo de criação de romaneio por câmera |
| `side-panel.tsx` | Painel lateral read-only — progresso de cada motorista no dia |
| `stat-cards.tsx` | Faixa de KPIs do dia (padrão "Track-POD") |
| `topbar.tsx` | Topbar escura — desktop: logo+nav+avatar; mobile: só logo+avatar+sair |

## `components/motorista/` (10 arquivos)

| Componente | Papel |
|---|---|
| `canhoto-form.tsx` (424 linhas) | Ver detalhe abaixo |
| `confirmar-button.tsx` | Confirmação de recebimento do romaneio |
| `entregas-view.tsx` | Home do motorista — sincroniza cache local com `initialRomaneios` do servidor via `useEffect`, ouve `EVENTO_FILA` |
| `header.tsx` | Header escuro mobile-first — logo + identidade + stats |
| `historico-view.tsx` | Lista de romaneios passados — usa `formatarData` local (string pura, sem `Date`, evita bug de fuso) |
| `mapa-romaneio.tsx` | Mapa com as paradas do romaneio (só as já geocodificadas) |
| `posicao-tracker.tsx` | GPS ao vivo — liga só com romaneio ativo E confirmado; `watchPosition` com throttle 30s/50m |
| `romaneio-view.tsx` | Lista de NFs do romaneio + progresso + busca |
| `sw-register.tsx` | Registra o Service Worker |
| `sync-banner.tsx` | Estado de sincronização — tenta esvaziar a fila ao montar |

## `components/cliente/` (5 arquivos)

`filtros.tsx`, `header.tsx`, `hero.tsx`, `nav.tsx`, `notas-list.tsx` (230 linhas — cada card expande inline com o comprovante, sem navegação de página).

## `components/mapa/` e `components/brand/`

`mapa/leaflet-map.tsx` — único ponto que de fato importa `leaflet`/`react-leaflet` (`"use client"`, carrega só no browser — `mapa-entregas.tsx` e `mapa-romaneio.tsx` são wrappers que fazem dynamic import disso). `brand/logo.tsx` — wordmark recriado em SVG a partir do logo oficial.

## Componentes na raiz de `components/`

`app-shell.tsx` (casca das áreas autenticadas), `comprovante-modal.tsx` (compartilhado gerência+cliente — cada um passa sua própria Server Action de busca como prop, aplicando seu próprio `requireRole` antes), `logout-button.tsx` (limpa cache do SW + fila do IndexedDB antes de encerrar sessão — evita vazamento de dado entre motoristas no mesmo aparelho).

---

## Detalhe dos 3 componentes mais complexos (candidatos a split, ver `16_TECH_DEBT_FINDINGS.md`)

### `components/gerencia/notas-list.tsx` — 602 linhas

Tabela de entregas do dia (padrão "Track-POD"): linha clicável expande um painel de detalhe (`DetailPanel`) com ações — trocar motorista, ver localização/geocodificação, marcar duplicadas, excluir em lote. É o componente que mais Server Actions consome (`trocarMotorista`, `excluirNotas`, `atribuirMotorista`, `getComprovanteGerencia`, as 3 de `geocode-actions.ts`) — concentra praticamente toda a interação da gerência com uma NF individual numa tela só.

### `components/gerencia/import-wizard.tsx` — 510 linhas

Compartilhado entre gerência e cliente (prop `variant`) para os 3 formatos de importação: Excel (SheetJS, mapeamento de colunas + preview), XML de NF-e (`lib/import-nf.ts`, recomendado — traz a chave de acesso), PDF/DANFE (best-effort). Também trata duplicatas (`lib/import-duplicatas.ts`) e upload de `.zip` em lote (`fflate`).

### `components/motorista/canhoto-form.tsx` — 424 linhas

Fluxo de 2 passos desde a A-010 (migration 0018): 1) foto de chegada obrigatória → 2) foto do canhoto + status (4 opções grandes, alvo de toque ≥48px) + tipo/descrição de ocorrência se aplicável. Não escreve no banco diretamente — monta o item e chama `lib/offline/queue.ts`, que persiste no IndexedDB e dispara a tentativa de sync.

## Convenções observadas (confirma o que `CLAUDE.md` documenta como regra)

- **Zero cor hardcoded** — checado nesta sessão via grep, nenhuma ocorrência de `#hex`/`bg-[#...]` fora de `app/globals.css`
- **Zero emoji em UI** — só ícones `@tabler/icons-react`
- Componentes de `ui/` são "server-safe" (sem `"use client"`, sem estado) — só os de área (`gerencia/`, `motorista/`, `cliente/`) usam `"use client"` quando precisam de interatividade
