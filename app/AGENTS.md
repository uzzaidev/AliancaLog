# app/ — Rotas Next.js (App Router)

Cada pasta é uma rota. Arquivos `page.tsx` são Server Components por padrão.
`layout.tsx` nas subpastas aplica o layout do perfil (sidebar, nav, verificação de role).

## Organização por perfil

| Rota | Perfil | Descrição |
|------|--------|-----------|
| `/login` | público | Formulário de login (Server Action em `lib/auth/actions.ts`) |
| `/gerencia/dashboard` | gerencia | Painel em tempo real com lista de NFs e filtros |
| `/gerencia/romaneios` | gerencia | CRUD de romaneios; `/[id]` é o detalhe com fechamento |
| `/gerencia/importar` | gerencia | Upload de Excel → preview → confirmar NFs |
| `/gerencia/cadastros` | gerencia | Motoristas, empresas, veículos |
| `/motorista/entregas` | motorista | Lista de romaneios do dia |
| `/motorista/romaneio/[id]` | motorista | NFs do romaneio; confirmação de saída |
| `/motorista/canhoto/[id]` | motorista | Registro: foto + 4 status + ocorrência (offline-first) |
| `/cliente/notas` | cliente_final | Portal read-only: NFs da empresa com filtros e comprovantes |
| `/api/sync` | motorista | POST — recebe canhotos offline, faz upsert idempotente |

## Padrões de uso

- `searchParams` é uma Promise no Next.js 16 — sempre `await searchParams`
- Mutações: Server Actions em `actions.ts` dentro da própria rota
- Proteção de role: chame `requireRole("gerencia")` de `lib/auth/dal.ts` antes de qualquer dado
- Realtime: `<RealtimeRefresher channel="nome-unico" />` de `components/gerencia/realtime-refresher.tsx`
