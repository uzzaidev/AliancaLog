# lib/ — Lógica de servidor e utilitários

Toda a lógica fora de componentes e rotas. Subpastas por domínio.

## Subpastas

### `supabase/`
Clientes Supabase — escolha o certo para cada contexto:

| Arquivo | Contexto | Quando usar |
|---------|----------|-------------|
| `client.ts` | Browser ("use client") | Realtime, uploads no client, sync offline |
| `server.ts` | Server Component / Route Handler | Consultas server-side com sessão do usuário |
| `proxy.ts` | `proxy.ts` (root) | Apenas pelo middleware de sessão |
| `admin.ts` | Server-only | Geração de URLs assinadas, criação de usuários — NUNCA no browser |

### `auth/`
- `dal.ts` — `getSessionUser()` (React `cache`), `requireUser()`, `requireRole(role)` — use em todo Server Component protegido
- `actions.ts` — Server Actions `login()` e `logout()`

### `data/`
Consultas server-side, uma por domínio. RLS do banco já filtra por role automaticamente.
- `gerencia.ts` — dashboard, NFs do dia, resumo, listas de motoristas/empresas
- `motorista.ts` — romaneios e NFs do motorista logado
- `romaneios.ts` — CRUD de romaneios, contagem de pendentes
- `comprovante.ts` — padrão RLS-check → URL assinada (usa admin só após confirmar acesso)
- `cliente.ts` — NFs da empresa do cliente, com filtros de período/status/busca

### `offline/`
Stack de sincronização offline para o motorista:
- `db.ts` — wrapper do IndexedDB
- `queue.ts` — enfileira canhotos pendentes com `client_id` UUID (idempotência)
- `sync.ts` — `flushFila()` envia lote para `/api/sync`; trata 409 como sucesso
- `image.ts` — comprime foto para ≤800px / 70% qualidade antes de enfileirar

### `types.ts`
Fonte única de verdade para enums e types de domínio:
`Role`, `NotaStatus`, `CanhotoStatus`, `OcorrenciaTipo`, `ROLE_HOME`, `NOTA_STATUS_META`, `OCORRENCIA_LABEL`.
Adicione novos tipos aqui — não duplique em outros arquivos.
