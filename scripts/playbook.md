# Playbook — Suítes de Teste Automatizadas

Este arquivo documenta **como os testes automatizados funcionam**, não o que testar manualmente no app —
para isso, veja [encaminhamentos/testes-ao-vivo-vitor.md](../encaminhamentos/testes-ao-vivo-vitor.md)
(roteiro de QA manual do Vítor, produto-a-produto).

Aqui: as duas suítes que rodam com `npm test`, o que cada verificação garante, como interpretar uma
falha, e como adicionar uma verificação nova sem enfraquecer a suíte.

## As duas suítes, em uma frase cada

| Suíte | Comando | O que garante |
|---|---|---|
| `scripts/smoke-seguranca.mjs` | `npm run test:security` | RLS/autorização no banco real — 23 verificações, autenticando como cada role de verdade |
| `scripts/test-offline-sync.mjs` | `npm run test:offline` | A fila offline nunca confunde "o servidor rejeitou" com "deu certo" — teste unitário puro, sem rede/banco |

`npm test` roda `typecheck && lint && test:offline && test:security`, nessa ordem — do mais rápido/barato ao mais lento (`test:security` bate no banco de produção/dev via `DATABASE_URL` + login real de cada role, então é o mais demorado).

---

## `test:security` — como a suíte é montada

### Princípio central: autenticar como o role de verdade, nunca simular com admin

A suíte faz login real (Supabase Auth) como `motorista` e `cliente_final` para testar o que cada um consegue/não consegue fazer. **Nunca** usa a service role key para simular "o que a policy deveria permitir" — só para: (a) montar o cenário antes do teste (criar NF, romaneio, etc. — o "arrange"), e (b) conferir o resultado depois (o "assert" de estado no banco).

**Por que isso importa mais do que parece:** um teste que usa admin para fingir ser motorista não distingue "a RLS bloqueou certo" de "a consulta em si está quebrada" — os dois dão o mesmo resultado (nada retorna). Isso já escondeu um bug real numa versão anterior desta suíte (o antigo teste "T7", reescrito em 2026-08-28). Se você for adicionar um teste, **sempre** autentique como o role que está sendo testado — veja o padrão em qualquer bloco `T5`/`T8`/`T10`.

### Setup e limpeza

```js
const tag = `SMK${Date.now()}`;           // prefixo único desta execução
const criados = { notasFiscais: [], canhotos: [], ocorrencias: [], romaneios: [] };
```

Todo dado criado pelo teste carrega o prefixo `tag` (ex.: `numero_nf: tag + "-alvo"`) e o id vai para `criados`. Um bloco `finally` no fim do script **sempre** limpa tudo — mesmo se um teste no meio lançar exceção. Isso foi adicionado em 2026-08-28 depois de um incidente real: uma falha no meio deixava dado de teste preso no banco de produção. **Se você adicionar um teste, empurre todo id novo para `criados` antes de fazer qualquer asserção** — se a asserção falhar (e ela deve poder falhar), o dado já precisa estar rastreado para a limpeza pegar.

### Os 23 checks, por bloco

| Bloco | Verifica | Adicionado em |
|---|---|---|
| T1 | Destinatário da NF não muda pelo motorista | 2026-07-13 |
| T2 | Motorista finaliza NF (`em_rota` → `aceita`) | 2026-07-13 |
| T3 | NF já aceita é imutável | 2026-07-13 |
| T4a/b/c | Múltiplas tentativas: grava, permite 2ª tentativa (client_id novo), bloqueia reenvio do mesmo client_id | 2026-08-14 (A-007) |
| T5 | Motorista não registra canhoto em NF de outro | 2026-07-13 |
| T6 | Romaneio fechado não reabre pelo motorista | 2026-07-13 |
| T7a/b/c | Sync idempotente ponta a ponta (grava, no-op em retry, não duplica) | 2026-07-13 |
| T8a-e | Ciclo de ocorrência completo: RPC, NF muda de status, sai do romaneio/motorista, motorista mantém histórico, isolamento entre motoristas | 2026-08-14/2026-08-28 |
| **T9, T9b** | **Confirmação atômica do romaneio** (`confirmar_romaneio_motorista`) e **fechamento automático** quando a última NF é aceita | **2026-08-28/29 (migrations 0023-0025)** |
| T10a-d | **Isolamento entre empresas (R-008)** — cliente só vê/insere na própria empresa | 2026-08-28 |

T9/T9b são os mais novos — testam exatamente as migrations `0023`/`0024`/`0025` (ver `docs/governanca/CHECKPOINT.md` de 2026-08-29). T10 já foi T9 numa versão anterior deste arquivo — foi renumerado quando o bloco de confirmação atômica foi inserido antes dele, não porque o teste mudou de conteúdo.

### Como ler uma falha

```
✗ T8b NF guarda o desfecho da tentativa (ficou ocorrencia) — ERRO: <mensagem do Postgres>
```

O padrão do arquivo é sempre incluir a mensagem de erro real do Postgres/Supabase na string de falha (`+ (error ? " — ERRO: " + error.message : "")`) — não precisa adicionar `console.log` para depurar, a causa já vem na linha.

### Meta-verificação: os testes discriminam de verdade?

Antes de confiar num teste negativo (`T5`, `T10b`, etc.), vale perguntar: **ele falharia se a proteção fosse removida?** Um teste que passa com ou sem a policy correta é decoração. Na sessão de 2026-08-28, isso foi confirmado para `T10b` sabotando deliberadamente `cli_nf_select` numa transação revertida via `pg` direto e conferindo que o teste acusaria — não é parte do arquivo (era um script descartável), mas é o padrão a seguir ao **desconfiar** de um teste negativo novo antes de dar como pronto.

### Como adicionar um bloco novo

1. Autentique como o role certo (`cli.rpc(...)`/`cli.from(...)` para motorista, `cliLeite`/equivalente para cliente — veja `mkCliente`/`mkMotorista` no topo do arquivo)
2. Monte o cenário com a **service role** (`admin.from(...)`), registre todo id em `criados`
3. Execute a ação **como o role sendo testado**
4. Confira o resultado — pode ser com `admin` (estado no banco) ou com o próprio cliente do role (o que ele consegue ver)
5. Para um teste **negativo** ("motorista NÃO consegue X"), pare e pergunte: esse teste passaria também se a policy estivesse quebrada? Se sim, ele está fraco — normalmente falta um `ok(!error, ...)` positivo emparelhado, ou o teste está checando ausência de dado sem garantir que a consulta em si funcionou

---

## `test:offline` — o que é, por que é pequeno de propósito

Diferente de `test:security`, este **não** toca rede nem banco — é um teste unitário puro de `lib/offline/sync-result.ts`:

```
classificarRespostaSync(status) → "sucesso" | "validacao" | "autenticacao" | "tentar_novamente"
mensagemRespostaSync(nf, status, detalhe) → texto mostrado no SyncBanner
```

**O que ele existe para prevenir:** antes da correção de 2026-08-28, um `HTTP 400` (o servidor recusou os dados — ex.: falta a foto de chegada) podia ser tratado como sucesso pela fila, apagando o registro do IndexedDB e mostrando "Registrado" ao motorista — **perdendo a prova da tentativa de entrega em silêncio**. O teste garante:
- `400` classifica como `"validacao"`, nunca `"sucesso"`
- a mensagem de um `400` nunca contém a palavra "Registrado"
- a mensagem menciona explicitamente que o registro **foi preservado no aparelho**
- `401`/`403` orientam a pedir novo login (`"Entre novamente"`)
- `409` (idempotência — já foi enviado antes) **é** sucesso, não erro

Rode `node scripts/test-offline-sync.mjs` direto (sem `.env`) se só quiser este teste — não precisa de banco.

**Quando estender:** se `lib/offline/sync.ts` ganhar uma nova categoria de resposta do servidor (por exemplo, um código de rate-limit específico), adicione o caso em `classificarRespostaSync` e um par de linhas aqui confirmando a classificação — o objetivo é este arquivo continuar pequeno e rápido, não crescer para um mock de `fetch` inteiro.

---

## Cobertura real, sem inflar

| Camada | Coberto por teste automatizado? |
|---|---|
| RLS / autorização no Postgres | ✅ `test:security` |
| Atomicidade das funções de banco (`registrar_entrega_offline`, `confirmar_romaneio_motorista`) | ✅ `test:security` (via efeito observado, não teste de unidade da função em si) |
| Classificação de resposta HTTP da fila offline | ✅ `test:offline` |
| Server Actions (`app/**/actions.ts`) | ❌ Não testado automaticamente |
| Componentes React / renderização | ❌ 0% |
| Fluxo E2E (login → import → bipagem → entrega → comprovante) | ❌ Não existe (Playwright planejado, não implementado) |
| Parsers (`lib/nfe.ts`, `lib/import-nf.ts`) | ❌ Não hoje |

Para o que só um humano com celular consegue validar (câmera, GPS, PWA offline cold-open, legibilidade de foto), use [testes-ao-vivo-vitor.md](../encaminhamentos/testes-ao-vivo-vitor.md) — este playbook cobre só a parte automatizável.
