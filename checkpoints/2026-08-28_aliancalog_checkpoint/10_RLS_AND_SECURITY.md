# 10 — RLS e Segurança

RLS é a **camada de autorização real** do sistema (ver `05_ARCHITECTURE_FROM_CODE.md`). Este documento
lista o estado atual de cada policy e conta as duas histórias de bug mais instrutivas do projeto — ambas
aconteceram em produção, ambas eram invisíveis em teste manual "feliz", e ambas só foram achadas quando
o motorista testou de verdade no celular.

## Modelo mental

```
jwt_role()        → 'gerencia' | 'motorista' | 'cliente_final' | '' (lido de app_metadata do JWT)
jwt_empresa_id()   → uuid | null (idem, só para cliente_final)
```

Toda policy do sistema é uma combinação de `jwt_role() = '...'` + uma condição de posse (`motorista_id = auth.uid()`, `empresa_cliente_id = jwt_empresa_id()`). Não há papel "admin" separado de "gerência", nem hierarquia entre roles — são 3 conjuntos de regras paralelos e mutuamente exclusivos.

## Policies atuais, por tabela

| Tabela | Policy | Role | Regra |
|---|---|---|---|
| `empresas_clientes` | `ger_all` | gerência | tudo |
| | `cli_empresa_select` | cliente | só a própria (`id = jwt_empresa_id()`) |
| `usuarios` | `ger_all` | gerência | tudo |
| | `self_select` | qualquer | `id = auth.uid()` |
| `veiculos`, `motoristas` | `ger_all` | gerência | tudo (nenhuma policy para motorista/cliente nestas tabelas) |
| `romaneios` | `ger_all` | gerência | tudo |
| | `mot_romaneios_select` | motorista | `motorista_id = auth.uid()` |
| | `mot_romaneios_update` | motorista | idem + `status <> 'fechado'` (0009 — não reabre fechado) |
| `notas_fiscais` | `ger_all` | gerência | tudo |
| | `mot_nf_select` | motorista | **reescrita 3x** — ver linha do tempo abaixo |
| | `mot_nf_update` | motorista | `motorista_id = auth.uid()` USING; `motorista_id = auth.uid() OR motorista_id IS NULL` WITH CHECK (0016 — permite zerar ao devolver) |
| | `cli_nf_select` | cliente | `empresa_cliente_id = jwt_empresa_id()` |
| | `cli_nf_insert` | cliente | idem (0008 — cliente importa as próprias) |
| `canhotos` | `ger_all` | gerência | tudo |
| | `mot_canhoto_insert` | motorista | própria NF **em romaneio ativo** (0009) |
| | `mot_canhoto_select` | motorista | `motorista_id = auth.uid()` |
| | `cli_canhoto_select` | cliente | via `EXISTS` em `notas_fiscais` da própria empresa |
| `ocorrencias` | `ger_all` | gerência | tudo |
| | `mot_ocorrencia_insert` | motorista | NF é dele, via `EXISTS` |
| | `mot_ocorrencia_select` | motorista | **nova em 0020** — mesma condição do insert |
| | `cli_ocorrencia_select` | cliente | via `EXISTS` em `notas_fiscais` da própria empresa |
| `import_batches` | `ger_all` | gerência | tudo (única policy — tabela não usada por outros roles) |
| `motorista_posicao` | `mot_posicao_insert`/`mot_posicao_update` | motorista | só a própria linha |
| | `ger_posicao_select` | gerência | todas |

**Nenhuma policy de DELETE** foi encontrada em nenhuma tabela para motorista ou cliente — exclusão é privilégio exclusivo de `ger_all` (que cobre `for all`, incluindo delete) ou da service role.

## `mot_nf_select` — as 3 versões, e por que cada reescrita aconteceu

Esta é a policy mais reescrita do sistema — 3 vezes, cada uma corrigindo um bug real de produção:

1. **0002 (original):** `motorista_id = auth.uid() AND data_entrega = current_date` — `current_date` é UTC do servidor. A partir das 21h no Brasil, virava o dia seguinte e **o motorista deixava de ver as NFs do próprio dia**.
2. **0010:** troca `current_date` por `hoje_sp()` — resolve o fuso, mas mantém a restrição "só hoje", que por si só já era demais (motorista não via nem o próprio histórico).
3. **0015:** remove o filtro de data inteiramente — motorista vê **todas** as NFs que já foram dele, de qualquer data (mas escrita continua imutável via trigger, então isso é seguro).
4. **0021:** adiciona `OR motorista_registrou_nf(id)` — motorista também vê NFs que **já não são mais dele** (devolvidas ao painel após ocorrência/recusa), senão perde acesso ao próprio histórico assim que uma tentativa não é aceita.

## As duas histórias de bug — RLS interagindo com mecanismos que não são "autorização"

### Bug 1 (migration 0020): `ON CONFLICT` precisa de `SELECT`, não só de `INSERT`

**Sintoma em produção (27/08):** motorista registrava uma **ocorrência** → `POST /api/sync` retornava 500, "new row violates row-level security policy for table ocorrencias". **Aceitar** a entrega funcionava normalmente. E porque o 500 interrompia o flush da fila inteira, parecia que "nada mais sincroniza" — na verdade só aquele item específico travava, mas bloqueava os que vinham atrás na fila (fila é sequencial, não teve retry independente por item até esse ponto).

**Causa raiz:** `registrar_entrega_offline` grava com `INSERT ... ON CONFLICT (client_id) DO NOTHING`. Para resolver o `ON CONFLICT`, o Postgres precisa **consultar** a linha conflitante via o índice único — isso é uma leitura implícita. `canhotos` tinha `mot_canhoto_select` (SELECT liberado); `ocorrencias` só tinha `mot_ocorrencia_insert` — **sem SELECT**. A leitura implícita do `ON CONFLICT` era negada pela RLS, e o erro subia disfarçado de "violação na inserção".

**Correção:** adicionar `mot_ocorrencia_select` com a mesma condição de posse que o INSERT já tinha — não abre acesso novo, só espelha o alcance que a policy de escrita já concedia implicitamente.

**Por que isso escapou de revisão manual:** um `INSERT` simples (sem `ON CONFLICT`) como motorista passava normalmente nos testes ad-hoc — só falhava especificamente pelo caminho da RPC com conflito. A causa raiz só foi confirmada testando os dois casos lado a lado (documentado no comentário da própria migration 0020).

### Bug 2 (migration 0021): RLS de SELECT também se aplica à linha NOVA de um UPDATE — e resolver isso por função criou risco de recursão infinita

**Sintoma (mesma sessão, 27/08):** depois de corrigir o Bug 1, o erro **andou** para a etapa seguinte da mesma transação: agora era `notas_fiscais` reclamando de RLS no UPDATE.

**Causa raiz:** o Postgres aplica as policies de `SELECT` também à **linha resultante** de um `UPDATE` (não só a linha antes de mudar). `registrar_entrega_offline` zera `motorista_id` ao devolver a NF ao painel (A-007) — e `mot_nf_select`, na época, só enxergava `motorista_id = auth.uid()`. Ao zerar esse campo, a linha nova deixa de satisfazer a policy, e o próprio `UPDATE` que o motorista está fazendo é recusado — **ele perde visibilidade da linha no exato momento em que tenta editá-la**.

**Por que a correção não foi "adicionar mais uma condição direto na policy":** a saída óbvia seria a policy de `notas_fiscais` consultar `canhotos` (`motorista registrou canhoto nesta NF?`). Mas `cli_canhoto_select` já consulta `notas_fiscais` de volta — duas policies se referenciando mutuamente causa `"infinite recursion detected in policy"` no Postgres.

**Correção:** isolar a checagem numa função `SECURITY DEFINER` (`motorista_registrou_nf`) — roda com os privilégios do dono da função, **não dispara RLS internamente**, quebrando o ciclo. É `stable`, só devolve um `boolean`, não expõe nenhuma linha — superfície de escalação de privilégio mínima.

**Por que isso é a parte mais avançada de RLS no projeto:** `SECURITY DEFINER` é poderoso e perigoso por padrão (roda como o dono, ignorando RLS de quem chama) — teria sido fácil escrever uma função que devolve mais do que um boolean e vazar dado sem querer. A migration documenta explicitamente esse raciocínio no comentário SQL.

## O que a suíte de testes (`scripts/smoke-seguranca.mjs`) cobre disso

Ver `15_TESTS_COVERAGE_MAP.md` — os blocos T8 (ciclo de ocorrência) e T9 (isolamento entre empresas) autenticam como cada role de verdade contra o banco real, especificamente para pegar esta classe de bug de novo se ela voltar.

## O que NÃO está coberto por RLS (depende de outra coisa)

- **Storage** (fotos) não usa `jwt_role()`/`jwt_empresa_id()` nas mesmas policies de tabela — tem seu próprio conjunto (`canhotos_insert_motorista`, `canhotos_insert_gerencia`, `canhotos_select`), documentado em `09_DATABASE_SCHEMA_FROM_MIGRATIONS.md` § Storage
- **`SUPABASE_SERVICE_ROLE_KEY`** (usada em `lib/supabase/admin.ts` para criar login) **ignora RLS por completo** — é por isso que só pode ser chamada no servidor, nunca exposta ao browser (`CLAUDE.md` já documenta essa regra)
- **`DATABASE_URL`** (usada pelos scripts de infra — `migrate.mjs`, `backup.mjs`, e o próprio `smoke-seguranca.mjs` para configurar o cenário de teste) conecta como owner/superuser do banco, também fora do RLS
