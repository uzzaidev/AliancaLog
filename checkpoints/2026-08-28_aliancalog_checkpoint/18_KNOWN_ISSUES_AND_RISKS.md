# 18 — Riscos Conhecidos (produto/operação)

> Distinção vs. `16_TECH_DEBT_FINDINGS.md`: aqui são riscos de **produto/operação**, a maioria já
> rastreada pelo próprio time em `docs/governanca/PLAN.md`/`CHECKLIST.md`/`CHECKPOINT.md` — resumidos e
> com referência cruzada aqui, não redescobertos. Um item é novo (achado nesta sessão, marcado como tal).

## R-008 — Isolamento entre empresas

O risco mais documentado do projeto: um `cliente_final` da Empresa A não pode ver dado da Empresa B. **Coberto por 4 testes automatizados** (T9a-d, `scripts/smoke-seguranca.mjs`, ver `15_TESTS_COVERAGE_MAP.md`) — inclusive com meta-verificação confirmando que os testes de fato detectam regressão. Risco mitigado, não eliminado — depende da RLS continuar correta a cada mudança futura em `notas_fiscais`/`canhotos`/`ocorrencias`.

## `DATABASE_URL` — histórico de bloqueio de infraestrutura

Já causou bloqueio real em produção (`password authentication failed`, 2026-08-20, `docs/governanca/CHECKPOINT.md`) — derruba `db:migrate`/`db:status`/`db:backup` (inclusive o **backup automático**, que é a única rede de proteção do banco fora do RLS). **Não afeta o app em produção** — este usa a service role key, caminho separado. Já aconteceu 2x historicamente (também em 2026-07-03, `EAUTHQUERY` no pooler) — padrão recorrente o suficiente para valer monitoramento proativo do workflow de backup (`.github/workflows/db-backup.yml` já roda diário; verificar se falhas dele geram algum alerta — ver `14_OBSERVABILITY.md`, resposta é não hoje).

## Offline-first parcial

O Service Worker cacheia o app shell, mas a `entregas-view.tsx`/cache do IndexedDB só funciona **depois** que a aba já foi aberta com rede pelo menos uma vez. Abrir o app do zero em modo avião, sem nunca ter sincronizado antes, não funciona. Documentado como pendência desde 2026-07-13 (`docs/governanca/CHECKPOINT.md`), ainda não resolvido.

## Sem QA/revisor de código formal

Ninguém no time tem esse papel formalmente (Pedro Vitor migrou para App Store/Google Play) — gap sinalizado em `docs/governanca/PLAN.md`. Combinado com o CI que só cobre backup (`16_TECH_DEBT_FINDINGS.md`), o gate de qualidade real é: quem está codando roda os testes manualmente + Vítor aprova o commit.

## Rota/otimização de múltiplas paradas (TSP/VRP) — não implementada

Decisão de arquitetura já registrada (Google Maps pago vs. OSRM/VROOM self-hospedado) em `docs/governanca/PLAN.md`, mas não é bloqueio de piloto — motorista usa "Abrir no Maps" ponto a ponto, sem roteirização automática.

## Fila offline trava inteira num erro de servidor permanente (achado nesta sessão)

Diferente dos itens acima (já tracked), este ponto foi articulado com mais precisão nesta sessão ao documentar o pipeline (`11_OFFLINE_SYNC_PIPELINE_FROM_CODE.md`): a fila é estritamente sequencial — um item que falha por erro de **servidor** (não rede) bloqueia todos os itens atrás dele na mesma fila. Foi exatamente o padrão dos 2 bugs de RLS corrigidos nas migrations 0020/0021 (ver `10_RLS_AND_SECURITY.md`): um motorista com uma ocorrência mal-formada via a fila inteira "travar", incluindo entregas aceitas que só estavam atrás dela na ordem. A causa raiz de cada incidente específico foi corrigida — o **mecanismo** que amplifica um erro isolado em "nada sincroniza" continua lá.

## `import_batches` sem uso real

Ver `16_TECH_DEBT_FINDINGS.md` — listado lá como achado de código; citado aqui porque também é uma decisão de produto em aberto (a A-008/migração de legado ainda vai acontecer, ou não?).

## Matriz de severidade (ajuste subjetivo, para priorização)

| Risco | Probabilidade | Impacto se acontecer | Já mitigado? |
|---|---|---|---|
| R-008 (isolamento) | Baixa (testado) | Muito alto (vazamento entre clientes) | ✅ Testes automatizados |
| `DATABASE_URL` quebrar de novo | Média (já ocorreu 2x) | Alto (backup para, migrations param) | ⚠️ Parcial — sem alerta proativo |
| Fila trava por erro de servidor | Média | Médio (motorista percebe, mas confuso) | ⚠️ Mecanismo não mudou, só causas pontuais |
| Offline-first parcial | Baixa (uso normal já mitiga) | Médio (só afeta 1º uso do dia sem rede prévia) | ❌ Não resolvido |
| Sem QA formal | Alta (é o dia a dia) | Médio, cumulativo | ❌ Gap organizacional, não técnico |
