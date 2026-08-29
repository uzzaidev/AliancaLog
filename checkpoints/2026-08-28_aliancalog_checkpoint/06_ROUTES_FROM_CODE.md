# 06 — Rotas e Server Actions, extraídas do código

18 rotas de página + 1 rota de API + 18 Server Actions. Evidência: `find app -name "page.tsx" -o -name "route.ts"`, `grep "^export async function" app/**/actions.ts`.

## Rotas de página

| Rota | Perfil | Arquivo | O que faz |
|---|---|---|---|
| `/` | — | `app/page.tsx` | Sem conteúdo próprio — `proxy.ts` redireciona por role antes de renderizar |
| `/login` | público | `app/login/page.tsx` + `login-form.tsx` | Único caminho público (junto com `/auth`, citado em `proxy.ts` mas sem rota correspondente encontrada — ver Perguntas em Aberto) |
| `/gerencia/dashboard` | gerência | `app/gerencia/dashboard/page.tsx` | Home — KPIs (`stat-cards.tsx`), lista de NFs do dia, mapa, painel por cliente |
| `/gerencia/romaneios` | gerência | `.../page.tsx` | Lista de romaneios (`lib/data/romaneios.ts: listRomaneios`) |
| `/gerencia/romaneios/novo` | gerência | `.../novo/page.tsx` | Criação por câmera (bipagem) |
| `/gerencia/romaneios/[id]` | gerência | `.../[id]/page.tsx` | Detalhe + fechamento (`fecharRomaneio`) |
| `/gerencia/importar` | gerência | `.../page.tsx` | Excel/XML/PDF via `import-wizard.tsx` |
| `/gerencia/cadastros` | gerência | `.../page.tsx` | CRUD de motoristas/empresas/veículos |
| `/motorista/entregas` | motorista | `.../page.tsx` | Home — "Minhas entregas" (`entregas-view.tsx`) |
| `/motorista/romaneio/[id]` | motorista | `.../[id]/page.tsx` | Lista de NFs do romaneio |
| `/motorista/canhoto/[id]` | motorista | `.../[id]/page.tsx` | Registro de entrega/ocorrência (`canhoto-form.tsx`) — grava na fila local, não direto no banco |
| `/motorista/historico` | motorista | `.../page.tsx` | Romaneios passados, read-only (`historico-view.tsx`) |
| `/cliente/notas` | cliente_final | `.../page.tsx` | Home — lista + barra de progresso |
| `/cliente/importar` | cliente_final | `.../page.tsx` | Cliente importa as próprias NFs |

## Rota de API

| Rota | Método | Arquivo | Por que é API e não Server Action |
|---|---|---|---|
| `/api/sync` | `POST` | `app/api/sync/route.ts` | Chamada pelo **Service Worker** (`lib/offline/sync.ts`), fora do contexto de React/Next — Server Actions não são invocáveis de lá. Recebe `FormData` (client_id, nf_id, status, fotos, GPS), autentica por cookie de sessão, chama a RPC `registrar_entrega_offline`. Ver `11_OFFLINE_SYNC_PIPELINE_FROM_CODE.md`. |

**Nota:** `proxy.ts` cita `PUBLIC_PATHS = ["/login", "/auth"]`, mas nenhuma rota `/auth/*` foi encontrada em `app/` — ver Perguntas em Aberto no fim deste arquivo.

## Server Actions por área

### `app/gerencia/cadastros/actions.ts` (9 actions)
`criarEmpresa`, `criarVeiculo`, `criarMotorista`, `alternarAtivoMotorista`, `excluirMotorista`, `alternarAtivoEmpresa`, `excluirEmpresa`, `alternarAtivoVeiculo`, `excluirVeiculo`

### `app/gerencia/dashboard/actions.ts` (4 actions)
- `getComprovanteGerencia` — busca detalhe para o modal
- `atribuirMotorista` — atribui NF solta a um romaneio/motorista
- `trocarMotorista` — move NF de um romaneio para outro (remove do de origem, apaga se ficar vazio)
- `excluirNotas` — exclusão em lote; **bloqueia exclusão de NF com canhoto** (evita apagar prova de entrega via cascade)

### `app/gerencia/dashboard/geocode-actions.ts` (3 actions)
`geocodificarPendentes` (lotes de 15, respeitando rate limit do Nominatim), `corrigirEnderecoEGeocodificar`, `definirCoordenadaManual`

### `app/gerencia/importar/actions.ts` (1 action)
`confirmarImportacao` — cria romaneio + NFs a partir do Excel/XML parseado; compensa (remove o romaneio) se o insert das NFs falhar

### `app/gerencia/romaneios/actions.ts` (3 actions)
`buscarNf` (bipagem por código), `criarRomaneio`, `fecharRomaneio`

### `app/motorista/actions.ts` (1 action)
`confirmarRomaneio` — recebimento do romaneio (`ativo` → NF vira `em_rota`)

### `app/cliente/importar/actions.ts` (1 action)
`confirmarImportacaoCliente` — mesma ideia da gerência, mas `empresa_id` vem do JWT, nunca do formulário (RLS `cli_nf_insert` garante no banco também)

### `app/cliente/notas/actions.ts` (1 action)
`getComprovanteCliente`

### `lib/auth/actions.ts` (2 actions, não fica em `app/`)
`login`, `logout`

## O que NÃO existe como Server Action

O **registro de canhoto** (a ação mais frequente do sistema, feita pelo motorista) não é uma Server Action — é uma escrita local no IndexedDB (`lib/offline/queue.ts`) que depois sincroniza via `/api/sync`. Isso é intencional: uma Server Action falha silenciosamente sem rede; a fila local sobrevive.

## Perguntas em aberto

1. `proxy.ts` protege `/auth` como rota pública, mas não há `app/auth/` no código — resquício de um fluxo removido, ou rota que o Supabase Auth intercepta antes de chegar no Next (ex.: callback de OAuth que nunca foi implementado)?
2. Não há rota/tela de "esqueci minha senha" nem de troca de senha — o reset de senha, se existe, é feito manualmente pela gerência/admin via painel do Supabase, fora do app.
