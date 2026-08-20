# Encaminhamentos — reunião 12/08

Divisão de tarefas dos 12 encaminhamentos da ata de 12/08/2026, já com as decisões
tomadas pelo Vítor (PO) aplicadas. Fonte original:
[reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md](../reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md).

## Arquivos desta pasta

### Reunião de 12/08 — ✅ código concluído em 14/08
- [luis-fernando-boff.md](./luis-fernando-boff.md) — backend/infra/offline/GIS + QA (9 itens)
- [vitor-pirolli.md](./vitor-pirolli.md) — frontend/produto/PO + comercial (5 de dev + 3 de processo)

### Visão de fases — revisão de 14/08, conferida contra o código
- [mvp-a-pendencias.md](./mvp-a-pendencias.md) — **o que falta para o go-live** (7 do Luis + 7 do Vítor)
- [fase-b-pendencias.md](./fase-b-pendencias.md) — o que falta do MVP Completo (quase tudo do Luis)
- [testes-ao-vivo-vitor.md](./testes-ao-vivo-vitor.md) — **roteiro priorizado do que precisa ser visto rodando**

**Status geral (revisado em 2026-08-20):** todo o código do MVP A está escrito e passa
em typecheck/lint/build + `test:security` 9/9. O que falta para o go-live é
**infraestrutura de produção** (Luis) e **validação real** (Vítor). Nenhuma feature nova
bloqueia o piloto — **o gargalo é operação, não desenvolvimento.**

### ⚠️ Dois bloqueios em série

```
DATABASE_URL quebrado  →  Deploy Vercel  →  Testes ao vivo  →  Piloto  →  Go-live
   (Luis, rápido)          (Luis, ⏫)         (Vítor)
```

1. **`DATABASE_URL` com senha inválida** (descoberto em 20/08) — derruba `db:migrate`,
   `db:status` e `db:backup`. **Nenhuma migration nova pode ser aplicada** até resolver.
2. **Deploy na Vercel** — câmera e Service Worker exigem HTTPS, então 5 das 7
   pendências do Vítor ficam paradas até o staging subir.

### Contagem de pendências

| | MVP A | Fase B |
|---|---|---|
| **Luis** | 8 itens | quase tudo |
| **Vítor** | 7 itens + 2 de processo | 4 decisões que destravam o Luis |

## Decisões tomadas nesta rodada (sobrescrevem a ata onde conflitam)

- **A-011** (tela de propostas) — descartado.
- **A-014** (rota de Montenegro / IMEX) — descartado, foi fala avulsa na reunião.
- **A-006** — o pedido real é acompanhar a posição de cada motorista em tempo real no
  mapa da gerência (não é roteirização/otimização de rota).
- **A-007** — **sobrescreve a decisão D-006 da ata.** Toda nota que não for `aceita`
  volta ao painel para nova tentativa — incluindo `recusada`. Nenhuma entrega encerra
  sem ser aceita.
- **QA** — o gap de "sem responsável formal" registrado no
  [PLAN.md](../docs/governanca/PLAN.md) fica com o Luis.

## Balanço

| | Itens | Área |
|---|---|---|
| **Luis Fernando Boff** | 9 | Backend · Supabase · Offline · DevOps · GIS/Maps · QA |
| **Vítor Pirolli** | 5 dev + 3 processo | Frontend · Produto/PO · Comercial · Treinamento |

O sprint é pesado no lado do Luis: as duas frentes mais complexas (A-007 e A-006 — esta
última era Fase B no [PLAN.md](../docs/governanca/PLAN.md), trazida para agora pela ata)
são dele, e o QA entra por cima disso. Vale confirmar cronograma com ele antes de travar
a ordem abaixo.

## ⚠️ Alerta antes de tocar no A-007

A função `registrar_entrega_offline` (migration `0011`) e a saída rápida do
`/api/sync` travam por `nota_fiscal_id`: assim que uma NF ganha um canhoto, qualquer
registro seguinte dela é tratado como duplicata e descartado silenciosamente (vira
`ja_existia = true` / HTTP 409, que o app trata como sucesso).

Implementar "nota volta ao painel" **sem** rechavear essa idempotência faz a
**segunda tentativa de entrega sumir junto com a foto** na primeira sincronização.
Detalhe técnico completo em [luis-fernando-boff.md § A-007](./luis-fernando-boff.md#a-007--toda-nota-não-aceita-volta-ao-painel).

## Ordem sugerida

1. **Bloco bugs** — A-001 → validar A-009 → A-002
2. **Bloco ganho rápido** — A-003 → A-005 → A-004 + A-008
3. **Bloco pesado** — A-007 (com o redesenho de idempotência) → A-006 → A-010

Dependência de processo (não é código, mas atrasa se passar batido): **A-012** (alinhar
com o cliente o envio de XML em `.zip`) precisa acontecer **antes** do A-003 ir para
produção — não adianta o sistema ler `.zip` se o cliente continua mandando nota a nota.

## Registro visual

Versão resumida em cartões, publicada como referência rápida:
https://claude.ai/code/artifact/3206b721-0d74-44f2-b853-8be444a53df8
