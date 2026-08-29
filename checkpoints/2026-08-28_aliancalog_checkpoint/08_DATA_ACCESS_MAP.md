# 08 — Mapa de Acesso a Dados

Evidência: `lib/data/*.ts` (leitura), `app/**/actions.ts` (escrita), `supabase/migrations/0011-0022` (funções de banco).

## Parte A — por função (leitura, `lib/data/`)

Todas rodam com o cliente Supabase **autenticado da sessão** (`lib/supabase/server.ts`) — o RLS filtra sozinho, a função não repete `WHERE empresa_id = ...` como checagem de segurança (só como otimização/clareza quando já sabe o valor).

| Arquivo | Função | Tabelas | Filtro aplicado no código (além do RLS) |
|---|---|---|---|
| `gerencia.ts` | `getResumoHoje(data?)` | `notas_fiscais`, `canhotos` | KPIs do dia — "Recusadas"/"Ocorrências" vêm de `canhotos` (ancorado em `registrado_em`), não de `notas_fiscais.status` (ver nota histórica no `19_ESTADO_ATUAL_E_HISTORICO.md` sobre o bug que isso corrigiu) |
| `gerencia.ts` | `getNotasDoDia(filtro)` | `notas_fiscais` | Período (hoje/semana/mês/todos) + `NF_STATUS_ABERTOS` quando "todos" |
| `gerencia.ts` | `getPainelClientes(...)` | `notas_fiscais`, `empresas_clientes` | Agrupa por empresa → por cidade |
| `gerencia.ts` | `listEmpresas/listMotoristas/listVeiculos` | `empresas_clientes`, `motoristas`, `veiculos` | Listagens simples para cadastro |
| `motorista.ts` | `getRomaneiosDoDia()` | `romaneios` | `motorista_id = auth.uid()` (via RLS), status ativo |
| `motorista.ts` | `getHistoricoRomaneios()` | `romaneios` | Todos exceto hoje, `limit(90)` — ~3 meses |
| `motorista.ts` | `getNotasDoRomaneio(id)` / `getNota(id)` | `notas_fiscais` | |
| `cliente.ts` | `getNotasCliente(filtro)` | `notas_fiscais` | RLS já restringe a `empresa_cliente_id = jwt_empresa_id()` |
| `romaneios.ts` | `listRomaneios/getRomaneio/contarPendentes` | `romaneios`, `notas_fiscais` | |
| `mapa.ts` | `getDestinosGeocodificados` | `notas_fiscais` (lat/lng do endereço) | `geocode_status = 'ok'` |
| `mapa.ts` | `contarDestinosPendentesDeGeocode` | `notas_fiscais` | `geocode_status is null or 'falhou'` |
| `mapa.ts` | `getEntreguesComGps` | `canhotos` (lat/lng do GPS do celular) | |
| `mapa.ts` | `getPosicoesMotoristas` | `motorista_posicao` | Só gerência lê (RLS `ger_posicao_select`) |
| `comprovante.ts` | `getComprovante(nfId)` | `notas_fiscais`, `canhotos`, `ocorrencias` | Compartilhado gerência+cliente — cada chamador aplica seu próprio `requireRole` **antes** de chamar isso |

## Parte B — por tabela (quem lê, quem escreve)

| Tabela | Lida por | Escrita por |
|---|---|---|
| `empresas_clientes` | `gerencia.ts`, `cliente.ts` (a própria via RLS) | `cadastros/actions.ts: criarEmpresa` |
| `usuarios` | `dal.ts` (via `auth.users` + `app_metadata`, não SELECT direto nesta tabela no caminho comum) | `admin.ts` (criação de login, service role) |
| `veiculos` | `gerencia.ts` | `cadastros/actions.ts` |
| `motoristas` | `gerencia.ts`, `motorista.ts` (o próprio) | `cadastros/actions.ts: criarMotorista` |
| `romaneios` | `motorista.ts`, `romaneios.ts` | `romaneios/actions.ts: criarRomaneio/fecharRomaneio`, `motorista/actions.ts: confirmarRomaneio`, `dashboard/actions.ts: trocarMotorista` (indireto) |
| `notas_fiscais` | quase todos os arquivos de `lib/data/` | `importar/actions.ts`, `dashboard/actions.ts`, `geocode-actions.ts`, **e a RPC `registrar_entrega_offline`** (via `/api/sync`) |
| `canhotos` | `comprovante.ts`, `mapa.ts` | **só via a RPC `registrar_entrega_offline`** — nenhum código insere em `canhotos` diretamente fora dela |
| `ocorrencias` | `comprovante.ts` | idem — só via a RPC |
| `import_batches` | nenhum (esqueleto, ver `18_KNOWN_ISSUES_AND_RISKS.md`) | nenhum |
| `motorista_posicao` | `mapa.ts` | `posicao-tracker.tsx` (upsert direto, não via RPC) |

**Observação central:** `canhotos` e `ocorrencias` — as duas tabelas mais sensíveis do sistema (evidência de entrega) — só têm **um único caminho de escrita** em todo o código: a função de banco `registrar_entrega_offline`. Isso não é acidente — é o que garante a atomicidade descrita em `05_ARCHITECTURE_FROM_CODE.md`.

## Riscos de performance verificados

- ✅ **Índices existem** para os filtros mais comuns: `idx_nf_data`, `idx_nf_empresa`, `idx_nf_motorista`, `idx_nf_romaneio`, `idx_canhotos_nf` (migration 0001)
- ⚠️ **Paginação:** não encontrada em `getNotasDoDia`/`getPainelClientes` — a lista carrega tudo do período de uma vez. Não é um problema hoje (volume de piloto), mas não escala sem revisão
- ✅ **N+1 evitado** em `getPainelClientes` — agrupa em memória depois de uma query, não faz `SELECT` por empresa em loop (não confirmado linha a linha para todas as funções, mas o padrão observado nas principais é de query única + agrupamento client-side)
- `getHistoricoRomaneios` já limita explicitamente (`limit(90)`) — única função com cap manual encontrada
