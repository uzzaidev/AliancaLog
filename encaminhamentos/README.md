# Encaminhamentos — reunião 12/08

Divisão de tarefas dos encaminhamentos da ata de 12/08/2026, já com decisões do Vítor
(PO) aplicadas. Fonte original:
[reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md](../reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md).

## Arquivos desta pasta

- **[reuniao-27-08.md](./reuniao-27-08.md)** — **mais recente**. A D-003 (status de
  ocorrência) foi resolvida pelo PO com a migration `0022`; traz também a lista do que
  já estava resolvido antes da ata ser processada.
- [mvp-a-pendencias.md](./mvp-a-pendencias.md) — fotografia atual do que falta para go-live.
- [testes-ao-vivo-vitor.md](./testes-ao-vivo-vitor.md) — roteiro priorizado de validação real.
- [luis-fernando-boff.md](./luis-fernando-boff.md) — backend/infra/offline/GIS/QA, com histórico técnico.
- [vitor-pirolli.md](./vitor-pirolli.md) — frontend/produto/comercial, com histórico técnico.
- [fase-b-pendencias.md](./fase-b-pendencias.md) — escopo restante do MVP Completo.

## 🔴 Novo em 06/09 — entrega ao cliente na semana de 08–12/09

- O Vítor apresenta o sistema ao cliente para uso real. Os quatro bloqueios de infra do
  Luis (Sentry, backup, logins reais, domínio) passam a ter **prazo**, não só ordem.
  Detalhe em [luis-fernando-boff.md](./luis-fernando-boff.md).
- **Pedido novo do PO:** o motorista assume a NF **bipando** o DANFE, sem a gerência
  atribuir na mão. Implementado; migration `0026` **aplicada em produção** em 06/09
  (26/26), `test:security` 23/23. **Pendente de revisão do Luis** — mexe no trigger
  `nf_guard_motorista` — e dos testes T11a–T11f do caminho novo.
- **Achado:** `npm run db:backup` não funciona na máquina do Vítor (pg_dump v12 contra
  servidor v15+) — mesmo problema que o Luis corrigiu no CI em `6ed0731`. Falta
  instalar o client 17 na máquina do Vítor e rodar o `workflow_dispatch` uma vez.
- 🔴 **O app não abre offline no iPhone** (achado na rodada de testes de 06/09): o
  Service Worker ignora navegações de propósito, então em modo avião o Safari mostra a
  própria tela de erro e o app nem carrega. O cache de dados existe, mas é inalcançável.
  Diagnóstico e conserto proposto em [luis-fernando-boff.md § 0](./luis-fernando-boff.md).
- Roteiro de testes do Vítor priorizado para a entrega:
  [testes-ao-vivo-vitor.md](./testes-ao-vivo-vitor.md).

## ⚠️ Novo em 27/08

- **Modelo de status refinado (migration `0022`)** — a NF passou a guardar o **desfecho
  da última tentativa** (`ocorrencia` / `recusada`) em vez de virar sempre `pendente`.
  Agora `pendente` significa "nunca foi tentada". As duas continuam como "a fazer"
  (`NF_STATUS_ABERTOS`), então nada que dependia de "voltar ao painel" mudou — isso
  sempre dependeu de `romaneio_id`/`motorista_id`, não do status.

- **Bug de produção corrigido:** registrar ocorrência falhava com 500 (duas falhas de
  RLS encadeadas — migrations `0020` e `0021`). Cobertura de teste adicionada (T8a–T8d);
  `test:security` agora com 13 verificações. **Pendente revisão do Luis** (mexe em RLS).
- **Pendência nova para o Luis:** um erro 500 **trava a fila offline inteira** — foi por
  isso que uma entrega aceita, sem problema nenhum, ficou presa atrás da ocorrência
  quebrada. Detalhe em [luis-fernando-boff.md](./luis-fernando-boff.md).

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
