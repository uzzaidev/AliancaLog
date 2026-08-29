# 15 — Mapa de Cobertura de Testes

## Framework: nenhum — script Node autoral

Sem Jest/Vitest/Mocha/Playwright instalado. `scripts/smoke-seguranca.mjs` (reescrito integralmente em 2026-08-28, mesma sessão deste checkpoint) é um script Node com uma função `ok(condição, descrição)` caseira — sem `assert` de biblioteca, sem runner, sem relatório HTML.

**Decisão deliberada, não descuido:** o script autentica como **cada role de verdade** (login real via Supabase Auth), não usa a service role key para simular. Motivo documentado no próprio código e na sessão que o reescreveu: um teste que usa admin para simular um role não discrimina "RLS bloqueou corretamente" de "a consulta está quebrada" — foi exatamente esse ponto cego que escondeu um bug real na versão anterior da suíte (o antigo teste "T7").

## Execução

```bash
npm run test:security
# = node --env-file-if-exists=.env.local --env-file-if-exists=.env scripts/smoke-seguranca.mjs
```

Roda contra o **banco real** (produção ou o ambiente apontado por `.env`/`.env.local`), não um banco de teste isolado — `DATABASE_URL` para setup direto via `pg`, mais logins reais de cada role via Supabase Auth para as asserções.

## As 21 verificações, por bloco

| Bloco | Verificações | Cobre |
|---|---|---|
| T1 | 1 | Destinatário da NF não muda pelo motorista |
| T2 | 1 | Motorista finaliza NF (`em_rota` → `aceita`) |
| T3 | 1 | NF já aceita é imutável |
| T4 | 3 (a/b/c) | Múltiplas tentativas: 1ª grava, 2ª tentativa (client_id novo) é permitida, reenvio do mesmo client_id é bloqueado |
| T5 | 1 | Motorista não registra canhoto em NF de outro |
| T6 | 1 | Romaneio fechado não reabre pelo motorista |
| T7 | 3 (a/b/c) | Sync idempotente ponta-a-ponta: grava, no-op em retry, não duplica (`canhotos=1, ocorrencias=1`) |
| T8 | 5 (a/b/b2/c/d/e — 6 na prática) | Ciclo de ocorrência completo: registra via RPC, NF muda de status, sai do romaneio/motorista, motorista mantém acesso ao próprio histórico, outro motorista não vê a NF solta, motorista não vê NF de outro |
| T9 | 4 (a/b/c/d) | **R-008 — isolamento entre empresas**: cliente vê a própria, não vê de outra empresa, não cria NF para outra empresa, não vê ocorrência de NF alheia |

**Total: 21** (conferido rodando a suíte, não só contando `ok(` no arquivo — grep simples de `ok(` subcontava por causa de chamadas multi-linha).

## Meta-verificação: o teste discrimina de verdade?

Na mesma sessão que reescreveu a suíte, foi feito um teste adicional (script temporário, descartado depois) que **sabotava deliberadamente** a policy `cli_nf_select` dentro de uma transação revertida, e confirmava que o T9b acusaria a regressão:

```
[1] policy intacta   : cliente não vê ❌ a NF alheia  → correto
[2] policy sabotada  : cliente VÊ a NF alheia         → T9b teria pego isso
```

Isso é o padrão de qualidade que faltava na versão anterior da suíte (o "T7" antigo passava sempre, com ou sem bug, porque usava admin).

## Limpeza de dados de teste

`try/finally` garante remoção dos dados criados pelo teste **mesmo se um teste no meio falhar** — corrigido nesta mesma sessão (antes, uma falha no meio deixava dados de teste presos no banco de produção). Verificado após a reescrita: zero NFs/ocorrências/canhotos com prefixo de teste (`SMK%`) sobrando no banco.

## Cobertura por camada

| Camada | Coberto? |
|---|---|
| RLS / autorização (Postgres) | ✅ Sim — é o foco quase exclusivo da suíte |
| Funções de banco (`registrar_entrega_offline`, triggers) | ✅ Indiretamente — os testes chamam a RPC de ponta a ponta |
| Server Actions (`app/**/actions.ts`) | ❌ Não testado diretamente |
| Componentes React | ❌ 0% — nenhum teste de componente/render |
| Fluxo E2E completo (login → import → bipagem → entrega → comprovante) | ❌ Não existe |
| Parsers (`lib/nfe.ts`, `lib/import-nf.ts`) | ❌ Não hoje — havia menção histórica de "parser XML testado (5/5 campos)" numa sessão anterior (`docs/governanca/CHECKPOINT.md`, 2026-07-13), mas não há teste automatizado versionado para isso hoje |
| Funções puras (`lib/date.ts`, `lib/alertas.ts`) | ❌ Sem teste unitário — só verificadas manualmente/por uso |

## Planejado, não implementado

Playwright (E2E) — citado em `CLAUDE.md` e `docs/governanca/CHECKPOINT.md` como "Sprint 4", nenhuma dependência ou config encontrada no repositório.

## Prioridade sugerida se cobertura for expandida

1. Teste automatizado do parser de chave de acesso (`lib/nfe.ts`) — é uma regra de negócio pura (validação de dígito verificador), fácil de testar isoladamente e já teve um bug crítico documentado no histórico do produto (scanner lendo a chave errada)
2. Smoke E2E de 1 fluxo completo (login motorista → registrar canhoto → aparece no dashboard da gerência) — pegaria classes inteiras de regressão de integração que os testes de RLS não veem
3. Testes de Server Action com mock de Supabase — mais barato que E2E, cobre lógica de `trocarMotorista`/`excluirNotas` que hoje só é validada manualmente
