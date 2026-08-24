# MVP A — o que falta para o go-live

> Atualizado em 2026-08-24 após pull dos últimos commits.
> Índice geral: [README.md](./README.md).

## Resumo

Todo o código central do MVP A está escrito. O deploy HTTPS, o cache offline completo,
o Sentry e o workflow de backup já entraram no repositório. O que falta agora é
configuração de secrets, validação real e operação do piloto.

## O que entrou nos últimos commits

### `9984000` — cache offline de romaneios e NFs

- Novo `lib/offline/cache.ts`.
- `/motorista/entregas` usa `EntregasView` com fallback para `STORE_CACHE`.
- `/motorista/romaneio/[id]` cacheia e recupera NFs do romaneio.
- `/motorista/canhoto/[id]` tenta buscar NF do cache se o servidor/rede falhar.
- Ao registrar entrega offline, o status da NF é atualizado no cache local.

### `76f6f56` e `3050ef1` — Sentry + backup

- `@sentry/nextjs` adicionado.
- `instrumentation.ts`, `sentry.client.config.ts`, `sentry.server.config.ts` e
  `sentry.edge.config.ts` criados.
- `next.config.ts` envolvido com `withSentryConfig`.
- `lib/offline/sync.ts` envia falhas relevantes do sync offline ao Sentry.
- `.github/workflows/db-backup.yml` roda `npm run db:backup` diariamente e salva artifact.
- `.env.example` documenta `NEXT_PUBLIC_SENTRY_DSN`.

## Luis — pendências reais

### 1. Configurar e validar Sentry

O código já está plugado, mas falta operação:

- Cadastrar `NEXT_PUBLIC_SENTRY_DSN` na Vercel.
- Confirmar se também serão usados `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT`
  para source maps/release tracking.
- Provocar um erro controlado em produção e confirmar que aparece no painel do Sentry.
- Validar especialmente eventos do `offline-sync`, porque ali ficam falhas silenciosas de campo.

### 2. Validar backup automático

O workflow existe em `.github/workflows/db-backup.yml`.

Falta:

- Cadastrar `DATABASE_URL` em GitHub Secrets.
- Rodar `workflow_dispatch` manualmente uma vez.
- Confirmar que o artifact `db-backup-*` é gerado como `.sql.gz`.
- Conferir retenção de 30 dias e combinar se isso atende ou se precisa backup externo/Supabase pago.

### 3. Criar logins reais

Depende do Vítor/Matheus trazerem as listas:

- 16 motoristas.
- Aproximadamente 20 empresas/clientes.

O fluxo manual existe em `/gerencia/cadastros`; Luis avalia se vale script de carga em lote.

### 4. Domínio definitivo + SSL

`alianca-log.vercel.app` já resolve o HTTPS para teste/piloto. Falta decidir se o go-live
terá domínio próprio.

### 5. E2E/CI geral

Ainda não existe Playwright nem workflow geral de `npm test` em PR/push. Não bloqueia piloto,
mas é a próxima rede de proteção técnica se o time continuar mexendo em paralelo.

## Vítor — pendências reais

### 1. Rodar validação ao vivo

Usar o roteiro em [testes-ao-vivo-vitor.md](./testes-ao-vivo-vitor.md), agora em HTTPS:
`https://alianca-log.vercel.app`.

Prioridade:

- A-007: segunda tentativa não perde foto/status.
- Offline: modo avião, fila e cold-open com `STORE_CACHE`.
- A-006: motorista no mapa em tempo real.
- R-008: cliente não vê NF de outra empresa.

### 2. Testar `cliente_final`

Login do cliente final continua sendo o perfil menos validado. É o ponto principal de
risco de isolamento/RLS.

### 3. Critérios de sucesso do piloto

Transformar em texto acordado com o cliente. Sugestão:

- 2–3 motoristas.
- 5 dias úteis.
- ≥95% das entregas registradas pelo app.
- Zero perda de canhoto no sync.
- Dashboard consultado pelo Matheus sem depender de pedido manual.

### 4. Dados reais

Pegar com Matheus:

- 2–3 planilhas/arquivos reais.
- `.zip` real de XMLs de carga fechada.
- Lista real de motoristas.
- Lista real de empresas/clientes para criação de logins.

### 5. Foto e usabilidade em campo

Validar em celular real:

- Foto de chegada obrigatória.
- Foto do canhoto a 1280px em luz ruim/canhoto amassado/caneta fraca.
- Uso com sol na tela, pressa e toque em campo.

### 6. Piloto + treinamento

- Rodar piloto com 2–3 motoristas.
- Registrar falhas com print/contexto.
- Preparar guia de 1 página e treinamento do coordenador.

## Ordem recomendada

1. Luis: configurar Sentry na Vercel e validar evento.
2. Luis: configurar `DATABASE_URL` nos GitHub Secrets e validar workflow de backup.
3. Vítor: executar testes ao vivo em produção HTTPS.
4. Vítor: coletar dados reais/listas com Matheus.
5. Luis: criar logins reais.
6. Vítor: critérios do piloto + treinamento.
7. Piloto → ajustes → go-live.

## Não é bloqueio imediato

- Playwright/E2E.
- CI geral.
- Fase B.
- Lojas de app.
