# Encaminhamentos — reunião 12/08

Divisão de tarefas dos encaminhamentos da ata de 12/08/2026, já com decisões do Vítor
(PO) aplicadas. Fonte original:
[reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md](../reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md).

## Arquivos desta pasta

- [mvp-a-pendencias.md](./mvp-a-pendencias.md) — fotografia atual do que falta para go-live.
- [testes-ao-vivo-vitor.md](./testes-ao-vivo-vitor.md) — roteiro priorizado de validação real.
- [luis-fernando-boff.md](./luis-fernando-boff.md) — backend/infra/offline/GIS/QA, com histórico técnico.
- [vitor-pirolli.md](./vitor-pirolli.md) — frontend/produto/comercial, com histórico técnico.
- [fase-b-pendencias.md](./fase-b-pendencias.md) — escopo restante do MVP Completo.

## Status atual — 24/08/2026

O MVP A não está mais bloqueado por código de produto.

Entrou/foi confirmado:

- `DATABASE_URL` resolvido: migrations/status/backup voltaram a funcionar.
- Deploy HTTPS ativo em `alianca-log.vercel.app`.
- Cache offline completo do `STORE_CACHE` implementado para romaneios/NFs do motorista.
- Sentry integrado com `@sentry/nextjs` e captura adicional no sync offline.
- Backup automático criado em `.github/workflows/db-backup.yml`.
- Revisões de segurança de `lib/import-duplicatas.ts` e `getResumoHoje` aprovadas.

Ainda falta configurar/validar operação:

- Sentry precisa de `NEXT_PUBLIC_SENTRY_DSN` na Vercel e confirmação de evento no painel.
- Backup precisa de `DATABASE_URL` em GitHub Secrets e um `workflow_dispatch` validado.
- Bateria de testes ao vivo precisa rodar no celular/cliente real.
- Logins reais dependem das listas do Vítor/Matheus.

## Caminho crítico atualizado

```
✅ DATABASE_URL
  → ✅ Deploy HTTPS / alianca-log.vercel.app
  → ⚙️ Secrets Sentry + backup
  → 📱 Testes ao vivo
  → Piloto
  → Go-live
```

## Contagem de pendências

| Pessoa | MVP A — pendências reais |
|---|---|
| **Luis** | Configurar/validar Sentry, validar backup automático, criar logins reais quando receber listas, domínio definitivo, E2E/CI geral se decidido |
| **Vítor** | Testes ao vivo, login `cliente_final`, critérios do piloto, arquivos reais, validação de fotos, piloto, treinamento |

## Decisões tomadas nesta rodada histórica

- **A-011** (tela de propostas) — descartado.
- **A-014** (rota de Montenegro / IMEX) — descartado, foi fala avulsa na reunião.
- **A-006** — o pedido real é acompanhar a posição de cada motorista em tempo real no mapa da gerência.
- **A-007** — toda nota que não for `aceita` volta ao painel para nova tentativa, incluindo `recusada`.
- **QA** — o gap de responsável formal fica com o Luis.

## Ordem recomendada agora

1. Luis configura `NEXT_PUBLIC_SENTRY_DSN` na Vercel e valida evento no Sentry.
2. Luis cadastra `DATABASE_URL` nos GitHub Secrets e roda o workflow de backup manualmente uma vez.
3. Vítor executa o roteiro de testes ao vivo em `alianca-log.vercel.app`.
4. Vítor pega arquivos reais/listas com Matheus e define critérios do piloto.
5. Luis cria logins reais quando as listas chegarem.
6. Piloto com 2–3 motoristas, ajustes e go-live.
