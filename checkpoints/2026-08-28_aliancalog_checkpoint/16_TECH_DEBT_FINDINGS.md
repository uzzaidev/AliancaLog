# 16 — Dívida Técnica (achados de código)

> Distinção deste documento vs. `18_KNOWN_ISSUES_AND_RISKS.md`: aqui é **limpeza/qualidade de código**
> verificável nesta sessão. Lá são **riscos de produto/operação** já rastreados pelo time em outros
> documentos (PLAN/CHECKLIST/CHECKPOINT). Não duplicar entre os dois.

## TODOs/FIXMEs

```bash
grep -rnE "TODO|FIXME|HACK|XXX" app/ components/ lib/ scripts/
```
2 ocorrências, nenhuma é dívida real — são comentários explicando uma regra de negócio ("foto obrigatória em TODOS os status"), não marcadores de trabalho pendente. **Achado positivo:** o código não tem uma pilha de TODOs esquecidos.

## Arquivos acima do limite do próprio `CLAUDE.md` (500 linhas)

| Arquivo | Linhas | Nota |
|---|---|---|
| `components/gerencia/notas-list.tsx` | 602 | Concentra praticamente toda interação da gerência com uma NF (ver `07_UI_COMPONENTS_CATALOG.md`) — candidato natural a split por responsabilidade (tabela vs. `DetailPanel` vs. ações de lote) |
| `components/gerencia/import-wizard.tsx` | 510 | Compartilhado entre 2 variantes (gerência/cliente) × 3 formatos (Excel/XML/PDF) — a combinatória explica o tamanho; split por formato é a divisão mais natural |

Nenhum outro arquivo do projeto passa de 430 linhas — não é um padrão sistêmico, são 2 pontos localizados.

## Lockfile órfão

`pnpm-lock.yaml` está versionado, mas todo o fluxo real (scripts, README, hipoteticamente CI) assume `npm`/`package-lock.json`. Não causa bug hoje, mas é um sinal falso para quem clonar o repo pela primeira vez ("será que é pnpm?"). **Sugestão:** remover, ou confirmar com o time se alguém ainda usa pnpm localmente antes de remover (ver Pergunta em Aberto).

## CI cobre só backup, não qualidade

Único workflow (`db-backup.yml`) não builda/testa/lint em push ou PR — ver `14_OBSERVABILITY.md`. Hoje o gate de qualidade é 100% manual (rodar `npm test`/`npm run build` antes de pedir aprovação de commit). Funciona enquanto o time for pequeno e disciplinado, mas não escala e não pega regressão antes do review humano.

## `import_batches` — esqueleto sem uso

Migration 0013 criou a tabela + colunas de rastreio de legado (`legacy_source`/`legacy_id`/`import_batch_id`) em 5 tabelas, preparando uma futura migração de dados do sistema antigo (A-008). **Nenhum código lê ou escreve nessas colunas hoje** (confirmado via `grep` — zero resultados fora das próprias migrations). Não é bug, é trabalho futuro que nunca chegou — mas vale decidir explicitamente se ainda está no roadmap ou se deveria ser removido para não confundir quem olhar o schema achando que é uma feature ativa.

## `sincronizado` (coluna de `canhotos`) parece não usada na prática

`canhotos.sincronizado boolean not null default true` (migration 0001) — comentário original diz "`false` = veio do sync offline". `registrar_entrega_offline` sempre insere com `sincronizado: true` em todas as suas 4 versões (0011/0016/0018/0022). Não encontrado nenhum caminho de código que grave `false`. Pode ser um campo morto, ou um campo pensado para um cenário (sync que grava direto, sem passar pela fila) que nunca foi implementado.

## Prioridade sugerida (adaptando o formato do prompt genérico)

### P0 — Quick wins
1. Decidir e documentar o destino de `pnpm-lock.yaml` (remover ou justificar) — 5 min
2. Confirmar se `canhotos.sincronizado` é campo morto; se for, documentar o motivo em vez de deixar ambíguo — 15 min

### P1 — Médio prazo
1. CI mínimo em PR: `typecheck` + `lint` + `test:security` (o próprio `npm test` já existe, só falta o workflow) — algumas horas
2. Split de `notas-list.tsx` e `import-wizard.tsx` — meio dia cada, sem mudança de comportamento

### P2 — Quando o roadmap justificar
1. Decidir sobre `import_batches`: implementar a migração de legado (A-008) ou remover o esqueleto
2. Cobertura de teste além de RLS (ver `15_TESTS_COVERAGE_MAP.md` § Prioridade sugerida)
