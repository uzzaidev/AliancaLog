# 05 — Arquitetura, extraída do código

## A forma do sistema em uma frase

Um app Next.js de 3 perfis (gerência / motorista / cliente final) onde **quase toda mutação é uma Server Action**, a leitura passa por funções server-side em `lib/data/`, e a autorização real não está no código de aplicação — está no **RLS do Postgres**. O único endpoint HTTP de verdade (`/api/sync`) existe porque o Service Worker roda fora do contexto de React e não pode chamar Server Actions.

## Os 3 perfis não são só "roles de UI" — são 3 apps diferentes

| | Gerência | Motorista | Cliente final |
|---|---|---|---|
| Dispositivo típico | Desktop | Celular | Desktop/celular |
| Modo de rede | Sempre online (assumido) | **Precisa funcionar offline** | Sempre online |
| Escrita | Server Actions diretas | Fila IndexedDB → `/api/sync` | Server Actions diretas (só a importação) |
| RLS | `ger_all` — vê/edita tudo | `mot_*` — só o que é seu | `cli_*` — só a própria empresa, majoritariamente leitura |
| Home | `/gerencia/dashboard` | `/motorista/entregas` | `/cliente/notas` |

Essa assimetria (só o motorista precisa de offline-first) é a decisão arquitetural mais consequente do projeto — explica por que existe uma fila no IndexedDB, um Service Worker, e por que `/api/sync` existe como rota HTTP separada em vez de Server Action (ver `11_OFFLINE_SYNC_PIPELINE_FROM_CODE.md`).

## As 3 camadas de autorização (nenhuma é suficiente sozinha)

```
1. proxy.ts        → otimista, lê role do JWT sem tocar o banco (UX: evita flash de tela errada)
2. lib/auth/dal.ts → requireRole()/requireUser(), roda no servidor, redireciona se falhar
3. RLS no Postgres → a camada REAL. Mesmo que 1 e 2 tivessem um bug, o banco recusa a query.
```

Evidência de que a camada 3 é a que importa de verdade: a suíte de testes (`scripts/smoke-seguranca.mjs`) autentica como cada role e ataca o banco direto — não testa `proxy.ts` nem `dal.ts`. E os bugs mais sérios encontrados em produção (migrations 0020/0021) foram **bugs de RLS**, não de roteamento.

## Onde a lógica de negócio mora

Não há uma camada de "services" ou "use cases" separada — a lógica se distribui em 3 lugares, por tipo:

| Tipo de lógica | Onde mora | Exemplo |
|---|---|---|
| Regra que precisa ser **atômica** (não pode dar meio-certo) | Função de banco (`registrar_entrega_offline`) | Canhoto + update da NF + ocorrência numa transação só |
| Regra de **autorização** | RLS (policy) ou trigger (`nf_guard_motorista`) | Motorista não edita NF finalizada |
| Regra de **fluxo/UX** que não precisa ser atômica | Server Action (`app/*/actions.ts`) | `trocarMotorista`, `excluirNotas` |
| Cálculo/formatação sem I/O | `lib/*.ts` puro | `lib/alertas.ts` (NF parada), `lib/date.ts` (fuso) |

Isso significa que entender uma regra de negócio às vezes exige ler o SQL da migration, não só o TypeScript — ver `09_DATABASE_SCHEMA_FROM_MIGRATIONS.md` e `10_RLS_AND_SECURITY.md`.

## Fluxo de dados: como uma tela fica atualizada

Duas estratégias coexistem, deliberadamente diferentes por perfil:

- **Gerência (desktop, sempre online):** Supabase **Realtime** — `components/gerencia/realtime-refresher.tsx` escuta mudanças e dispara `router.refresh()`. Sem polling.
- **Motorista (celular, GPS ao vivo):** Realtime *também*, mas numa tabela dedicada (`motorista_posicao`, 1 linha por motorista, sobrescrita) em vez de trilha/histórico — decisão explícita de escopo (migration 0017: "sem trilha nem histórico de trajeto").
- **Fila offline → servidor:** não é Realtime nem polling — é um evento DOM síncrono (`EVENTO_FILA`, `lib/offline/sync.ts`) disparado quando a fila muda, para os componentes que leem do IndexedDB local re-renderizarem.

## O que este projeto explicitamente NÃO tem

- Camada de cache HTTP (nenhum Redis, nenhum `unstable_cache`) — cada leitura vai ao Postgres
- Fila de background job (BullMQ, Sidekiq-like) — a única "fila" é o IndexedDB do navegador
- Microserviços — é um único app Next.js monolítico
- API pública/externa — `/api/sync` só é chamado pelo próprio Service Worker do próprio app

## Ver também

- `06_ROUTES_FROM_CODE.md` — inventário completo de rotas e Server Actions
- `10_RLS_AND_SECURITY.md` — como a camada 3 (RLS) é implementada policy por policy
- `17_ARCHITECTURE_DIAGRAMS.md` — os mesmos conceitos acima, em diagrama
