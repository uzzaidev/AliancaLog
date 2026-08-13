# Encaminhamentos — Luis Fernando Boff

> Backend/Infra + PWA Offline + DevOps + Dados/BI + GIS/Maps + QA.
> Origem: [reunião 12/08](../reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md) ·
> Índice geral: [README.md](./README.md).

9 itens, do bug mais simples ao redesenho mais delicado do produto (A-007). Ordem
sugerida: A-001 → A-009 → A-005 → A-004 → A-007 → A-006 → A-010, com QA rodando em
paralelo desde já.

---

## A-001 — Filtro de data preso em "hoje"

**Bug.** Toda a camada de dados filtra por **igualdade de data**, não por intervalo.
Resultado: uma NF importada ontem e não entregue **some do painel hoje** e **não pode
ser bipada** (ver A-009, provável sintoma disto).

### Ocorrências a corrigir

| Arquivo | Função | Filtro atual |
|---|---|---|
| `lib/data/gerencia.ts` | `getResumoHoje` | `.eq("data_entrega", data ?? hojeISO())` |
| `lib/data/gerencia.ts` | `getNotasDoDia` | `.eq("data_entrega", f.data \|\| hojeISO())` |
| `lib/data/gerencia.ts` | `getPainelClientes` | `.eq("data_entrega", data ?? hojeISO())` |
| `lib/data/motorista.ts` | `getRomaneiosDoDia` | `.eq("data", hoje())` |
| `app/gerencia/romaneios/actions.ts` | `buscarNf` → `query()` | `.eq("data_entrega", hoje())` |
| `lib/data/mapa.ts` | `getDestinosGeocodificados` | `.eq("data_entrega", data ?? hojeSP())` |
| `lib/data/mapa.ts` | `contarDestinosPendentesDeGeocode` | `.eq("data_entrega", data ?? hojeSP())` |
| `lib/data/mapa.ts` | `getEntreguesComGps` | `.eq("notas_fiscais.data_entrega", data ?? hojeSP())` |

### O que fazer

- Definir com o Vítor a regra de negócio: o que é "em aberto" (toda NF sem status
  final, independente da data) vs. "do dia" (KPIs específicos de hoje, que devem
  continuar restritos a hoje — ex.: `getResumoHoje` provavelmente quer continuar sendo
  só de hoje, mas `getNotasDoDia`/`buscarNf` precisam enxergar o acumulado em aberto).
- Trocar `.eq("data_entrega", X)` por `.lte("data_entrega", X)` (ou `.gte` com uma
  janela) nas funções que devem listar o acumulado, mantendo `.eq` só onde a métrica é
  intencionalmente "só hoje".
- Avaliar índice em `notas_fiscais(data_entrega, status)` — a query deixa de ser
  pontual e passa a varrer um intervalo.
- `buscarNf` (bipagem) é o mais sensível: hoje ele já teria que casar NF de qualquer
  data em aberto, não só de hoje, senão o bipe "não encontra" NF de romaneio antigo.

### Critério de aceite

- Uma NF importada ontem, ainda pendente, aparece hoje no dashboard e é bipável.
- KPIs do topo do dashboard continuam corretos (não passam a somar histórico
  indevidamente, se a intenção for métrica diária).

---

## A-009 — BIPE não atualiza em tempo real

**Hipótese principal: sintoma do A-001**, não bug isolado. `buscarNf` filtra
`data_entrega = hoje`, então bipar uma NF de ontem já retorna "não encontrada" —
opera-cionalmente indistinguível de "o bipe parou de funcionar".

### O que fazer

1. Corrigir A-001 primeiro.
2. Revalidar com um teste real: bipar uma NF de romaneio de dia anterior e confirmar
   que ela é encontrada e que o dashboard reflete a mudança sem F5.
3. **Se persistir**, investigar a publicação Realtime:
   - `supabase/migrations/0004_realtime.sql` publica `notas_fiscais`, `canhotos`,
     `romaneios` — confirmar que ainda está assim em produção (`alter publication
     supabase_realtime add table ...` não é idempotente-visível; checar via
     `select * from pg_publication_tables where pubname = 'supabase_realtime'`).
   - `components/gerencia/realtime-refresher.tsx` — já foi corrigido nesta sprint
     (canal com sufixo aleatório por montagem, evitando o erro `cannot add
     postgres_changes callbacks ... after subscribe()` do React Strict Mode em dev).
     Confirmar se esse mesmo padrão de erro não aparece em produção.
4. A tela de bipagem (`/gerencia/romaneios/novo`, componente
   `components/gerencia/romaneio-builder.tsx`) **não monta nenhum `RealtimeRefresher`**
   — isso é esperado (quem bipa não precisa de push, é o dashboard que precisa saber
   que uma NF foi bipada). Se a queixa for "o *dashboard* não atualiza depois que
   alguém bipa em outra tela", confirmar que `criarRomaneio`
   (`app/gerencia/romaneios/actions.ts`) dispara o evento Realtime esperado ao fazer
   `insert`/`update` em `notas_fiscais` — deveria disparar automaticamente via
   Postgres, então se não está chegando, o problema é a subscription do lado do
   dashboard, não o backend de bipagem.

### Critério de aceite

- Bipar uma NF em uma aba e ver o dashboard (aberto em outra aba/dispositivo)
  atualizar sozinho em até ~3s, sem refresh manual — inclusive para NF de dia anterior.

---

## A-005 — Trocar motorista de uma entrega já atribuída

**Estado atual:** `atribuirMotorista` (`app/gerencia/dashboard/actions.ts`) só
funciona para NF **solta** — a query trava com `.is("romaneio_id", null)`. Não existe
caminho para reatribuir uma NF que já está em um romaneio.

### O que fazer

- Nova server action (ou estender `atribuirMotorista`) que:
  - Aceita uma NF já vinculada a romaneio.
  - Remove a NF do romaneio atual (`romaneio_id = null` ou move para um romaneio novo
    do motorista destino — decidir com o Vítor qual UX faz mais sentido).
  - Se o romaneio de origem ficar **vazio** depois da remoção, decidir: apaga o
    romaneio vazio automaticamente (mesmo padrão já usado em `atribuirMotorista`
    quando `count === 0`) ou deixa órfão para a gerência limpar depois.
  - Atualiza `motorista_id` na NF.
- Cuidado de concorrência: replicar o padrão que `atribuirMotorista` já usa (reler
  `romaneio_id` no `update` para não reatribuir algo que mudou entre o clique e a
  confirmação).
- Revalidar `/gerencia/dashboard` e `/gerencia/romaneios/[id]` (os dois romaneios
  envolvidos, origem e destino).

### Critério de aceite

- Trocar o motorista de uma NF que já está `em_rota` não deixa a NF "presa" em dois
  romaneios nem deixa romaneio fantasma sem nenhuma NF.

---

## A-004 — Excluir notas duplicadas em lote

**Estado atual:** existe **prevenção** na importação (`lib/import-duplicatas.ts`,
função `encontrarDuplicatas`, que compara por `chave_acesso` e retorna a linha
duplicada para o usuário corrigir/remover antes de confirmar). **Não existe** exclusão
do que já foi importado e já está no banco.

### O que fazer

- Server action de exclusão em lote (`gerencia`, `requireRole("gerencia")`).
- Operação **destrutiva** — precisa de trava real no servidor, não só confirmação na
  tela:
  - Só permite excluir NF sem canhoto associado (senão apaga prova de entrega).
  - `on delete cascade` de `notas_fiscais` já cobre `ocorrencias`
    (`references public.notas_fiscais(id) on delete cascade`, migration `0001`) —
    confirmar que cobre tudo que deveria em cascata, e nada que não deveria.
- RLS: confirmar que a policy de delete em `notas_fiscais` existe e está restrita a
  `gerencia` (conferir `supabase/migrations/0002_rls.sql`).

### Critério de aceite

- Selecionar N NFs duplicadas e excluir de uma vez, sem conseguir excluir uma que já
  tem canhoto.

---

## A-007 — Toda nota não aceita volta ao painel

**Decisão do PO** (sobrescreve D-006 da ata): `recusada`, `ocorrencia` (todos os
tipos) — tudo que não é `aceita` volta para o painel, disponível para nova tentativa
de entrega. Nenhuma entrega encerra sem ser aceita.

Este é o item **tecnicamente mais delicado** do sprint porque toca o núcleo do
offline-first do produto.

### Por que não é só trocar um status

**1. A RPC trava por NF, não por tentativa.**
`registrar_entrega_offline` (`supabase/migrations/0011_registrar_entrega_transacional.sql`):

```sql
if exists (select 1 from public.canhotos where nota_fiscal_id = p_nota_fiscal_id) then
  return query select true;  -- ja_existia = true, vira no-op
  return;
end if;
```

Assim que a NF ganha **qualquer** canhoto, todo registro seguinte dela é tratado como
duplicata idempotente e descartado. Com a nova regra, uma NF pode legitimamente
receber um 2º (ou 3º) canhoto de tentativas diferentes — e hoje a função silenciosamente
ignora o segundo.

**2. A mesma trava existe na saída rápida do `/api/sync`.**
`app/api/sync/route.ts`, antes mesmo de chamar a RPC:

```ts
const { data: jaRegistrada } = await supabase
  .from("canhotos")
  .select("client_id")
  .eq("nota_fiscal_id", nfId)
  .limit(1);
if (jaRegistrada && jaRegistrada.length > 0) {
  return NextResponse.json({ ok: true, already: true }, { status: 409 });
}
```

**3. O app trata 409 como sucesso e apaga da fila.**
`lib/offline/sync.ts`, `flushFila`:

```ts
} else if (res.status === 409) {
  ultimoErro = null;
  await removerDaFila(c.client_id);
  enviados++;
}
```

Junte os três: motorista tenta entregar de novo (2ª tentativa), tira foto, confirma →
a RPC (ou a saída rápida) vê que já existe canhoto para aquela NF, responde
"já existia" → o app remove da fila achando que deu certo → **a foto e o status da 2ª
tentativa somem para sempre**, sem erro visível para ninguém.

**4. `fecharRomaneio` exige status final em todas as NFs.**
`app/gerencia/romaneios/actions.ts`:

```ts
const STATUS_FINAIS = ["aceita", "recusada", "ocorrencia"];
...
const pendentes = (nfs ?? []).filter((n) => !STATUS_FINAIS.includes(n.status)).length;
if (pendentes > 0) return { error: `Ainda há ${pendentes} NF(s) sem status final...` };
```

Se uma nota volta a `pendente` depois de uma ocorrência, ela nunca mais bate como
"status final" — **o romaneio nunca fecha**, mesmo que o motorista já tenha tentado
entregar tudo.

### O que fazer (proposta de redesenho)

1. **Rechavear a idempotência por tentativa, não por NF.**
   `canhotos` já tem `client_id` com índice único
   (`supabase/migrations/0006_fix_client_id_index.sql`,
   `uq_canhoto_client_id`) — esse é o identificador de tentativa correto. Trocar a
   checagem de "existe canhoto para esta NF" por "existe canhoto para este
   `client_id`" tanto na RPC quanto na saída rápida do `/api/sync`. Isso já é
   idempotente do jeito certo: reenviar o *mesmo* registro (retry de rede) continua
   sendo no-op; um *novo* registro (nova tentativa, `client_id` novo) passa.

2. **Migration nova** para:
   - Ajustar `registrar_entrega_offline` com a nova checagem de idempotência.
   - Decidir a regra por tipo de ocorrência: com a decisão do PO, **todas** voltam
     (não precisa mais diferenciar `cliente_ausente` de `canhoto_retido` etc. para
     efeito de "volta ou não volta" — simplifica o que a ata original pedia).
   - Quando a NF volta ao painel: `notas_fiscais.status = 'pendente'` (ou `em_rota`,
     a decidir) e `romaneio_id = null` — para não travar o `fecharRomaneio` do
     romaneio antigo. A NF passa a aparecer de novo como "não atribuída"/"aguardando"
     no painel, pronta para nova atribuição (reaproveitando o fluxo que já existe em
     `empresas-painel.tsx` / `atribuirMotorista`).
   - `recusada` deixa de ser status final também — hoje `fecharRomaneio` trata
     `recusada` como final ("`recusada` não bloqueia o fechamento"); isso muda.

3. **Fila offline** (`lib/offline/queue.ts`, `lib/offline/sync.ts`): confirmar que
   nada assume "uma NF = um canhoto" em algum outro ponto (ex.: cache local, tela de
   histórico do motorista).

4. **Histórico/timeline:** com múltiplos canhotos por NF possível, o comprovante
   (`lib/data/comprovante.ts`, `components/comprovante-modal.tsx`) precisa listar
   **todas** as tentativas em ordem, não só a mais recente — hoje o modal assume um
   comprovante por NF.

### Critério de aceite

- Motorista registra "cliente ausente" → NF some do romaneio dele e reaparece no
  painel da gerência como pendente/não atribuída.
- Gerência reatribui (mesmo motorista ou outro) → motorista tenta de novo → registra
  "aceita" → **a foto e o status da 2ª tentativa são persistidos** (não são
  descartados como duplicata).
- Comprovante mostra as duas tentativas na timeline.
- Fechar o romaneio original não trava esperando a NF que já saiu dele.

---

## A-006 — Rastreamento ao vivo dos motoristas no mapa

**Decisão do PO:** rastreia só enquanto o motorista tem romaneio ativo; guarda só a
última posição (sem trilha/histórico de trajeto).

**Estado atual: não existe nada.** A migration `0005_chave_acesso_gps.sql` registra
explicitamente: *"Não é rastreamento contínuo do veículo, que segue fora de
escopo."* — hoje o GPS só é capturado **uma vez**, no instante do canhoto
(`components/motorista/canhoto-form.tsx`, `navigator.geolocation.getCurrentPosition`).
Isso era Fase B no [PLAN.md](../docs/governanca/PLAN.md); a ata trouxe para agora.

### O que fazer

1. **Migration nova** — tabela `motorista_posicao`:
   ```sql
   create table public.motorista_posicao (
     motorista_id uuid primary key references public.motoristas(id),
     lat double precision not null,
     lng double precision not null,
     atualizado_em timestamptz not null default now()
   );
   ```
   Upsert por `motorista_id` (uma linha por motorista, sobrescrita a cada envio —
   consistente com "só a última posição"). Adicionar à publicação Realtime
   (mesmo padrão do `0004_realtime.sql`).

2. **RLS:** motorista só escreve a própria linha (`motorista_id = auth.uid()`
   traduzido pela relação `motoristas`, mesmo padrão de `mot_nf_update`/
   `mot_canhoto_insert` em `0002_rls.sql`); gerência lê todas.

3. **App do motorista:** `watchPosition` (não `getCurrentPosition`) ligado/desligado
   conforme existência de romaneio com `status = 'ativo'` e `confirmado_em` setado
   (ver `getRomaneiosDoDia`). Desliga ao fechar/entregar tudo.

4. **Política de frequência:** throttle de envio (ex.: a cada N segundos ou M metros
   de deslocamento) para não estourar bateria/dados — decidir os valores com base em
   teste de campo real (a Serra tem sinal fraco, é o problema central que o cliente
   quer resolver, conforme o próprio PLAN.md).

5. **Offline:** posição é **descartável** se antiga — diferente da fila de canhotos
   (que não pode perder dado), aqui o que importa é "onde ele está agora". Não
   enfileirar posição no IndexedDB; se não há rede, simplesmente não envia e tenta a
   próxima leitura do `watchPosition`.

6. **Camada no mapa da gerência** (a cargo do Vítor, mas a API que ele consome é sua):
   expor uma função de leitura tipo `getPosicoesMotoristas()` em `lib/data/mapa.ts`,
   já filtrando só motoristas com romaneio ativo hoje.

### Critério de aceite

- Gerência abre o dashboard e vê um marcador por motorista com romaneio ativo,
  atualizando sozinho (Realtime) conforme ele se desloca.
- Motorista sem romaneio ativo não aparece / não está sendo rastreado.
- Fechar a última entrega do dia para de enviar posição.

---

## A-010 — Foto obrigatória da chegada no cliente

Mitiga o **R-002** da ata (motorista alegar porta fechada sem comprovação). É foto
**separada** da foto do canhoto — hoje só existe uma foto no fluxo inteiro
(`components/motorista/canhoto-form.tsx`).

### O que fazer

- Migration: nova coluna/tabela para a foto de chegada (avaliar se cabe em
  `canhotos.foto_chegada_url` ou se merece registro próprio, considerando que a
  chegada pode acontecer sem finalizar a entrega — ex.: cliente ausente, ainda assim
  precisa da foto).
- Fila offline (`lib/offline/queue.ts`) hoje carrega **um** `Blob` por item
  (`CanhotoPendente.foto?: Blob`). Precisa suportar duas fotos por tentativa (chegada
  + canhoto) — ajustar tipo, `enfileirar`, `/api/sync` (novo campo no `FormData`) e o
  upload no Storage (novo path, ex.: `${user.id}/${nfId}/${clientId}-chegada.jpg`).
- Definir com o Vítor **quando** a foto de chegada é tirada no fluxo (antes de
  escolher o status? é o primeiro passo da tela de canhoto?).

### Critério de aceite

- Não é possível registrar nenhum status (aceita/recusada/ocorrência) sem a foto de
  chegada.
- As duas fotos aparecem no comprovante da gerência e do cliente.

---

## QA — code review, testes, segurança

Gap registrado no [PLAN.md](../docs/governanca/PLAN.md): desde que o Pedro Vitor
migrou para App Store/Play, não há responsável formal. Fica com o Luis a partir de
agora.

### O que fazer

- **Code review** antes de merge — principalmente nos itens desta lista que mexem em
  RLS/schema (A-007, A-006, A-004, A-010).
- **Validar RLS a cada entrega**, com foco no **R-008** (cliente final enxergar dados
  de outra empresa) — fica mais caro agora porque A-007 e A-006 mexem exatamente em
  RLS e em tabela nova.
- **Testes E2E (Playwright)** — estava previsto para o Sprint 4 no
  [CLAUDE.md](../CLAUDE.md) e nunca foi implementado. Não precisa ser tudo de uma vez;
  priorizar o caminho crítico (login por role, registrar canhoto offline→sync, RLS
  entre empresas) antes do go-live.

### Critério de aceite

- Nenhum PR que toque RLS ou migration vai para produção sem revisão.
- Pelo menos um teste automatizado cobrindo "cliente A não consegue ver NF da empresa
  B" antes do go-live com o cliente real.
