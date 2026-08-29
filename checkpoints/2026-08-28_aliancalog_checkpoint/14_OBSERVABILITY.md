# 14 — Observabilidade

## Error tracking — Sentry

3 configs separados por runtime (`sentry.client.config.ts`, `sentry.edge.config.ts`, `sentry.server.config.ts`), carregados via `instrumentation.ts` (convenção do App Router — `register()` roda uma vez por processo, escolhe server/edge por `NEXT_RUNTIME`).

| Config | `tracesSampleRate` | Replay | Ativo quando |
|---|---|---|---|
| Client | 1.0 (100%) | `replaysOnErrorSampleRate: 1.0`, `replaysSessionSampleRate: 0.1` | `NEXT_PUBLIC_SENTRY_DSN` definida |
| Edge | 1.0 | — | `NEXT_PUBLIC_SENTRY_DSN` ou `SENTRY_DSN` |
| Server | 1.0 | — | idem |

100% de trace sample rate é agressivo — apropriado para fase de piloto (poucos usuários, quer ver tudo), mas se o volume crescer sem revisar essa taxa, o custo de Sentry (que cobra por evento em planos pagos) cresce proporcionalmente ao tráfego, não a incidentes.

`onRequestError = Sentry.captureRequestError` (`instrumentation.ts`) — captura erros de rota automaticamente, sem precisar de try/catch manual em cada handler.

**Ponto cego confirmado:** o Sentry só funciona se a variável de ambiente estiver setada **no ambiente de deploy** — isso não é verificável a partir do repositório local. Se a variável não estiver configurada na Vercel (ou onde quer que o deploy aconteça), `enabled: false` silenciosamente, e nenhum erro de produção chega a lugar nenhum.

## Logging

Nenhum logger estruturado (Winston, Pino, `pino-http`, etc.) — `console.log`/`console.error` implícitos onde existirem, mais o que o Sentry captura automaticamente. Não há correlação de request ID entre logs.

## Health check

Não encontrado — nenhuma rota `/health`, `/healthz`, `/api/health`, ou `/api/status`. Um serviço de monitoramento de uptime externo não teria um endpoint dedicado para checar; teria que apontar para alguma página normal e inferir saúde pelo HTTP 200.

## CI/CD

Único workflow: [.github/workflows/db-backup.yml](../../.github/workflows/db-backup.yml).

```yaml
on:
  schedule: [cron: "0 6 * * *"]   # 03:00 horário de Brasília
  workflow_dispatch:              # disparo manual
jobs:
  backup: pg_dump → gzip → upload como artifact do GitHub (retenção 30 dias)
```

**O que este workflow NÃO faz:** não builda, não testa, não lint, não faz deploy. É estritamente um backup diário de banco. **Não há nenhum workflow que rode em `push`/`pull_request`** — `typecheck`/`lint`/`test:security`/`build` hoje só rodam manualmente, na máquina de quem está codando, antes de pedir aprovação para commit (que por sua vez precisa de aprovação explícita do Vítor a cada vez, regra do `CLAUDE.md`).

Consequência prática: é possível (embora contra a convenção do time) commitar/push código que não builda, sem nenhum gate automático impedindo. Ver `16_TECH_DEBT_FINDINGS.md`.

## Backup

`scripts/backup.mjs` (`npm run db:backup`) — dump do schema `public` para `backups/`, chamado tanto manualmente (recomendado antes de operação arriscada, ver `CLAUDE.md`) quanto pelo workflow agendado. `scripts/reset-operacional.mjs` também gera backup automático antes de zerar dados operacionais (usado em 2026-08-20 para limpar o banco antes de uma rodada de testes).

## Alertas / notificação proativa

Não encontrado nenhum canal de alerta (Slack, email, PagerDuty) conectado a Sentry ou a qualquer outro sinal — descoberta de incidente hoje depende de alguém abrir o Sentry ou o app e notar o problema.
