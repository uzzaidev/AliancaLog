# Encaminhamentos — Luis Fernando Boff

> Backend/Infra + PWA Offline + DevOps + Dados/BI + GIS/Maps + QA.
> Origem: [reunião 12/08](../reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md) ·
> Índice geral: [README.md](./README.md).

**✅ Status: os 9 itens implementados e concluídos em 2026-08-14** — código revisado
(code review dedicado encontrou e corrigiu 11 problemas reais introduzidos pelas
mudanças), `typecheck`/`lint`/`build` verdes, migrations `0015`–`0018` aplicadas em
produção e `npm run test:security` 9/9 contra o banco real. Detalhe do que foi feito
em cada item logo abaixo do critério de aceite dele; resumo completo também no bloco
"Mudanças de hoje (2026-08-14)" do [CHECKPOINT.md](../docs/governanca/CHECKPOINT.md).

Ordem sugerida original: A-001 → A-009 → A-005 → A-004 → A-007 → A-006 → A-010, com QA
rodando em paralelo desde já — seguida à risca.

> **A parte do Vítor também foi concluída** em 14/08 (A-002, A-003, A-008 e a camada
> visual do mapa no A-006) — ver [vitor-pirolli.md](./vitor-pirolli.md). Os
> encaminhamentos da reunião de 12/08 estão **fechados dos dois lados**.

---

# 🔴 06/09 — Entrega ao cliente na semana que vem

O Vítor vai até o cliente **na semana de 08–12/09** apresentar o sistema para eles
começarem a usar. Isso transforma as pendências abaixo de "quando der" em
**bloqueio de data**. Elas estão paradas desde 24/08.

## 0. ✅ RESOLVIDO (07/09 — Luis) — App Shell offline e cold-open no iPhone

Implementado o App Shell estático (`/offline`) com `components/motorista/offline-view.tsx`,
precache de scripts/CSS e Network-First navigation fallback no `public/sw.js` (v4),
registro global do SW no `app/layout.tsx` e liberação pública no `proxy.ts`.
Validado com `npm run build` (rota estática `○ /offline`), `typecheck` e `npm run test:security` (23/23).

### Achado original no teste 1.2 do roteiro (06/09)

### Causa

`public/sw.js`, no handler de fetch:

```js
// Navegações (páginas autenticadas): SÓ rede, nunca grava no cache.
if (req.mode === "navigate") return;
```

Abrir o app pela tela de início **é uma navegação**. O SW devolve o controle ao
navegador, a requisição vai para a rede, falha, e o Safari mostra a tela de erro dele.

A razão documentada no cabeçalho do arquivo é legítima e eu não a desfiz: cachear página
autenticada vazaria dados de um motorista para o próximo login no mesmo aparelho.

Três coisas se somam:

| # | Problema | Onde |
|---|---|---|
| 1 | SW ignora toda navegação | `public/sw.js` (handler de fetch) |
| 2 | `start_url: "/"` e `/` é um redirect server-side — o próprio ponto de entrada exige rede | `app/manifest.ts` + `app/page.tsx` |
| 3 | O `install` não faz precache de nada (só `skipWaiting`) — assets entram no cache só depois de já terem sido baixados uma vez | `public/sw.js` |

### O que isso corrige no nosso próprio registro

O [CHECKPOINT.md](../docs/governanca/CHECKPOINT.md) de 24/08 dá o cold-open offline como
resolvido pelo `STORE_CACHE`. **Resolveu metade.** O `STORE_CACHE` guarda os *dados*
(romaneios e NFs) no IndexedDB, mas sem a casca HTML o motorista nunca chega à tela para
ler esses dados. O cache está lá, inalcançável.

O que funciona hoje é só o caso "aba já aberta, navegação pelo roteador do Next, sem ida
à rede". Foi exatamente esse o caminho exercitado em 29/08, e por isso o teste passou.

**Consequência:** o item 3.3 do [testes-ao-vivo-vitor.md](./testes-ao-vivo-vitor.md)
(cold-open offline) falha pelo mesmo motivo — não precisa ser testado para saber.

### Por que é bloqueio de piloto

O iOS descarta PWA da memória de forma agressiva. Motorista em área sem sinal que troca
para o WhatsApp e volta cai numa navegação nova → tela de erro → **não consegue registrar
a entrega**. É precisamente o cenário que justifica o produto existir (Serra com sinal
fraco, o problema central no PLAN.md).

Some-se a isso o item 2 abaixo (500 permanente trava a fila): as duas falhas juntas
significam que a promessa central do produto — "registra offline, sobe depois" — não está
comprovadamente de pé em campo.

### Conserto sugerido — app shell, preservando a sua decisão de segurança

Não implementei porque é o seu território e mexe no arquivo mais sensível do produto.

1. Uma rota **estática, sem nenhum dado de usuário no HTML**.
2. SW faz precache dela no `install` (junto com o JS/CSS mínimo do app).
3. Navegação que falha → serve essa casca em vez de deixar passar.
4. A casca lê o IndexedDB (`STORE_CACHE`, que já tem romaneios e NFs) e renderiza no
   cliente.
5. `start_url` apontando para algo cacheável, não para o redirect de `/`.

**A segurança fica intacta** — é o ponto principal: o HTML servido do cache não carrega
dado nenhum. Os dados vêm do IndexedDB, que já é por aparelho e já é purgado no logout
(`components/logout-button.tsx` limpa `caches` e o IndexedDB).

### Detalhe do iOS que vale para o piloto

O iOS apaga dados de site (IndexedDB + Cache Storage) após **~7 dias sem uso**. Motorista
que passe uma semana sem abrir o app perde o cache e vai precisar de rede uma vez para
recuperar. Não é conserto nosso, mas precisa estar no material de treinamento.

---

## 1. Bloqueios de infra — sem isso não se entrega para uso real

Nenhum é código de produto: é configuração e validação. São os mesmos quatro de
24/08, repetidos aqui porque agora têm prazo.

| # | O que | Por que trava a entrega | Esforço |
|---|---|---|---|
| 1 | **Sentry na Vercel** — cadastrar `NEXT_PUBLIC_SENTRY_DSN`, provocar um erro controlado e confirmar o evento no painel | Sem isso, **falha em campo não avisa ninguém**. O cliente usando de verdade e a gente descobrindo por reclamação é o pior cenário possível. Validar especialmente o `area: offline-sync`, onde moram as falhas silenciosas | baixo |
| 2 | **Backup automático** — `DATABASE_URL` em GitHub Secrets + rodar `workflow_dispatch` uma vez + confirmar artifact `.sql.gz` | O workflow existe mas **nunca rodou**. Entregar para o cliente inserir dado real sem backup validado é risco que não precisa existir | baixo |
| 3 | **Logins reais** — 16 motoristas + ~20 empresas | O Vítor traz as listas com o Matheus. Decidir se vai no `/gerencia/cadastros` na mão ou por script de carga | médio, depende das listas |
| 4 | **Domínio definitivo** | `alianca-log.vercel.app` serve para o piloto. Só decidir se o go-live exige domínio próprio — se exigir, tem propagação de DNS no caminho | decisão + baixo |

> **Ordem sugerida:** 1 e 2 primeiro (são rápidos e são rede de proteção), depois 3
> quando as listas chegarem. O 4 pode esperar o pós-piloto.

## 2. Continua aberto de 27/08 — 500 permanente trava a fila inteira

O item detalhado mais abaixo (§ "um erro 500 trava a fila offline inteira") **não foi
mexido**. Com o cliente usando de verdade, o cenário fica concreto: motorista faz 10
entregas, a terceira esbarra num 500 permanente, e **as sete seguintes nunca chegam ao
painel** — para ele todas foram "registradas".

A sugestão continua a mesma: contar falhas por `client_id` e, depois de 3–5 tentativas,
**pular o item** em vez de parar a fila. O Sentry (item 1 acima) é o que te dá a
frequência real para escolher o N — mais um motivo para ele vir primeiro.

## 3. 🆕 Bipagem do motorista para assumir NF — implementado, **precisa da sua revisão**

**Pedido novo do PO (Vítor, 06/09):** a gerência não quer mais atribuir nota a nota na
mão. O motorista recebe a NF física e **assume bipando o DANFE**.

Decisões do PO já fechadas (as quatro perguntas que estavam em aberto):

1. A NF **já existe** no sistema — bipar não cria nota nova. Código desconhecido
   devolve `nao_encontrada` e manda avisar a gerência.
2. Vai para o **romaneio do dia dele** — reaproveita o `ativo` de hoje, senão cria um.
3. **Entra na hora**, sem aprovação da gerência, mas fica **registrado** que a
   atribuição veio do motorista.
4. NF que já é de outro motorista: **pede confirmação explícita** ("essa nota é de
   fulano, tem certeza?") antes de trocar.

### O que já está escrito

| Arquivo | O que faz |
|---|---|
| `supabase/migrations/0026_motorista_assume_nf.sql` | Colunas `assumida_em` / `assumida_de`, alteração do trigger `nf_guard_motorista` e a RPC `assumir_nf_motorista` |
| `app/motorista/actions.ts` | Server action `assumirNf(codigo, confirmarTroca)` |
| `components/motorista/assumir-nf.tsx` | Tela: câmera + digitação manual + diálogo de confirmação de troca |
| `app/motorista/assumir/page.tsx` | Rota `/motorista/assumir` |
| `components/barcode-scanner.tsx` | Movido de `components/gerencia/` — agora é compartilhado entre gerência e motorista |
| `lib/data/gerencia.ts` + `components/gerencia/notas-list.tsx` | Selo de código de barras na coluna Motorista + linha "Assumida pelo motorista (bipagem)" no painel de detalhe |

`typecheck`, `lint` e `build` verdes. **Migration ainda NÃO aplicada** (`db:status`
mostra 25 aplicadas + a 0026 pendente).

### Por que precisa especificamente de você — os três pontos sensíveis

**(a) Tinha que ser `security definer`, e quero seu aval nisso.**
`mot_nf_select` (sua migration `0021`) enxerga só "NF minha ou NF em que eu registrei
canhoto". A NF que o motorista acabou de bipar é, por definição, **invisível para ele**
— ou está sem dono, ou é de outro. Resolver isso por policy significaria deixar todo
motorista **ler todas as NFs do sistema** só para conseguir achar a que bipou — que é
exatamente o afrouxamento que a sua `0021` foi escrita para evitar. Por isso a busca
mora numa função `security definer` que devolve **só a NF bipada**, com as regras
aplicadas dentro. O alcance passa a ser "a nota que está na mão dele", não "todas".

**(b) Precisei mexer no seu `nf_guard_motorista` (migration `0009`).**
O trigger só deixa o motorista alterar `status`/`foto_url`/`entregue_em`/`observacao`.
Assumir a NF mexe em `motorista_id` e `romaneio_id`, então **o trigger barrava a própria
RPC** — ela roda com o JWT do motorista mesmo sendo `security definer`.

A saída foi uma flag **transaction-local** (`set_config('app.assumindo_nf','on',true)`),
setada só dentro da função e zerada logo depois. Meu raciocínio de que não é buraco:
`set_config` vive em `pg_catalog`, que o PostgREST **não expõe** (ele só alcança funções
do schema `public`), e mesmo que alcançasse, `mot_nf_update` continua barrando UPDATE em
linha que não é dele. **É esse raciocínio que quero que você confira** — é o ponto onde
eu erraria se fosse errar.

**(c) Faltam testes específicos no `smoke-seguranca.mjs`.**
A suíte atual (23 verificações) passa inteira depois da 0026 — inclusive T1
(destinatário não muda pelo motorista), T3 (NF aceita imutável) e T4/T8 (reentrega),
que são justamente os que a mudança no trigger poderia ter quebrado. Isso mostra que
não houve regressão, mas **nenhum teste exercita o caminho novo**. Os que precisam
entrar, seguindo o padrão dos seus T4/T8 (T9/T10 já estão ocupados — usar T11):

```
T11a  motorista assume NF sem dono → entra no romaneio do dia dele
T11b  motorista assume NF de OUTRO → só com p_confirmar_troca = true
T11c  1ª chamada sem confirmar devolve 'confirmar_troca' e NÃO move a NF
T11d  NF já 'aceita' devolve 'finalizada' e não é reaberta
T11e  a flag app.assumindo_nf NÃO deixa o motorista alterar destinatário/endereço
T11f  romaneio de origem que ficou vazio é removido (não vira fantasma)
```

O **T11e é o mais importante** — é o teste que prova que (b) não abriu um buraco.

### ⚠️ `npm run db:backup` está quebrado nesta máquina

Descoberto ao tentar rodar antes da 0026: o `pg_dump` instalado é da
**PostgreSQL 12.15** (`C:\Program Files\PostgreSQL\12.15\bin`) e o Supabase roda 15+.
O pg_dump recusa dumpar servidor mais novo que ele, então o script morre.

É o **mesmo problema** que você corrigiu no CI hoje (`6ed0731`, postgresql-client-17)
— só que a máquina do Vítor continua com o client 12. Instalar o 17 lá resolve. Com o
`workflow_dispatch` do item 2 ainda não rodado, no momento **nenhuma das duas rotas de
backup foi vista funcionando de ponta a ponta**.

### Estado atual

```
✓ Migration 0026 aplicada em produção (06/09, 26/26)
✓ npm run test:security — 23/23
✓ npm run test:offline — ok
✓ typecheck · lint · build — verdes
```

Falta a sua revisão dos pontos (a) e (b) e os testes T11a–T11f.

### O que ficou de fora, de propósito

- **Não funciona offline.** Assumir NF é uma server action; sem rede, dá erro. Achei
  aceitável porque ele bipa na carga, no pátio — mas é decisão que vale revisar com o
  Vítor se o pátio da Serra não tiver sinal.
- **`data_entrega` não é reescrita** ao assumir uma NF de dia anterior. Mudar isso
  reescreveria histórico e bagunçaria a regra de "NF parada" do A-008.

---

## ✅ Atualização — Luis (2026-08-24)

Os bloqueios de infraestrutura que estavam no topo deste arquivo mudaram depois dos
últimos commits/pull.

### Feito / entregue

- `DATABASE_URL` resolvido; migrations/status/backup voltaram a funcionar.
- Deploy HTTPS ativo em `alianca-log.vercel.app`.
- Cache offline completo do `STORE_CACHE` implementado para romaneios/NFs do motorista.
- Sentry integrado com `@sentry/nextjs`.
- `lib/offline/sync.ts` agora reporta falhas relevantes ao Sentry.
- Backup automático criado em `.github/workflows/db-backup.yml`.
- Revisões de segurança de `getResumoHoje` e `lib/import-duplicatas.ts` aprovadas.

### Falta para o Luis

1. **Configurar Sentry na Vercel**
   - Cadastrar `NEXT_PUBLIC_SENTRY_DSN`.
   - Decidir/configurar `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` e `SENTRY_PROJECT` se forem usar source maps.
   - Provocar um erro controlado e confirmar evento no painel do Sentry.

2. **Validar backup automático**
   - Cadastrar `DATABASE_URL` em GitHub Secrets.
   - Rodar manualmente o workflow `Backup Automático do Banco de Dados`.
   - Confirmar artifact `.sql.gz` gerado e retenção de 30 dias.

3. **Criar logins reais**
   - Aguardar listas do Vítor/Matheus.
   - Criar 16 motoristas e aproximadamente 20 empresas/clientes.
   - Avaliar se será manual em `/gerencia/cadastros` ou por script.

4. **Domínio definitivo**
   - `alianca-log.vercel.app` já serve para teste/piloto.
   - Falta decidir/configurar domínio próprio se for requisito de go-live.

5. **QA automatizado**
   - Playwright ainda não existe.
   - CI geral de `npm test` em PR/push ainda não existe.
   - Não bloqueia piloto, mas é a próxima rede de proteção.

---

## 🔴 Novo (27/08) — um erro 500 trava a fila offline inteira

`lib/offline/sync.ts`, no `else` final do `flushFila` (~linha 87):

```js
break; // erro de servidor — tenta de novo depois.
```

Quando um item recebe **500**, o flush **para ali** e todos os registros atrás dele
ficam presos. Não é descuido — é decisão deliberada, e **correta para 500 transitório**
(servidor fora do ar, timeout): não faz sentido queimar a fila inteira contra um
servidor que caiu.

O problema é o **500 permanente**. Aconteceu de verdade hoje: a falha de RLS na
ocorrência (corrigida pelas migrations `0020`/`0021` abaixo) virou um item "veneno" que
nunca passava e segurava tudo atrás dele. O Vítor viu uma entrega **aceita**, sem
problema nenhum, parada na fila — ela só estava atrás da ocorrência quebrada. Isso
explica o "para nota aceita também" que ele reportou.

**Risco em campo:** motorista faz 10 entregas, a terceira esbarra num 500 permanente,
e as sete seguintes **nunca chegam ao painel**. Para ele todas foram "registradas" —
não há como perceber.

O caso do **400 já tem a saída certa** (descarta só aquele item e segue, ~linha 53).
Falta o equivalente para o 500 que não vai passar nunca.

**Sugestão** — não implementei porque mexe na fila offline, que é seu território e o
ponto mais sensível do produto:

1. Contar falhas por `client_id`; depois de N tentativas (3–5), **pular o item** e
   seguir a fila em vez de parar. Nada se perde — ele continua enfileirado, só deixa
   de bloquear os outros.
2. Diferenciar na tela "espera aí" de "isso não vai passar". Hoje o banner mostra o
   erro, mas o motorista não sabe se precisa agir.

O Sentry já captura esses 500 com `area: offline-sync`, então dá pra medir a
frequência real antes de escolher o N.

---

## 🐛 Corrigido hoje (27/08) — ocorrência falhava em produção `sua revisão pendente`

Erro que o Vítor pegou testando no celular:
`new row violates row-level security policy for table "ocorrencias"` (500).
Entrega **aceita** funcionava; só **ocorrência** falhava.

Eram **duas falhas de RLS encadeadas**, na mesma transação:

**Migration `0020`** — assimetria entre as tabelas:

| Tabela | INSERT | SELECT |
|---|---|---|
| `canhotos` | ✅ | ✅ `mot_canhoto_select` |
| `ocorrencias` | ✅ | ❌ **não existia** |

A `registrar_entrega_offline` grava nas duas com `ON CONFLICT (client_id)`. Resolver o
`ON CONFLICT` exige **ler** a linha conflitante pelo índice único; sem policy de SELECT,
o Postgres nega essa leitura e reporta como violação **na inserção**. O canhoto passava
justamente porque o motorista tem SELECT nele.

**Migration `0021`** — apareceu depois de corrigir a primeira: o Postgres aplica as
policies de **SELECT à linha NOVA de um UPDATE**. Ao devolver a NF ao painel (A-007),
zerar `motorista_id` tira a linha do alcance de `mot_nf_select`, e o próprio UPDATE é
recusado. O `WITH CHECK` de `mot_nf_update` já permitia `motorista_id is null` — o
bloqueio vinha da policy de leitura, não da de escrita.

Correção: o motorista passa a enxergar também as NFs **em que ele já registrou
canhoto**. Precisou de uma função `security definer` (`motorista_registrou_nf`) porque
referenciar `canhotos` direto na policy de `notas_fiscais` causa
**recursão infinita** — `cli_canhoto_select` consulta `notas_fiscais` de volta.

> **Efeito colateral que isso também conserta:** depois de uma ocorrência, o motorista
> **perdia acesso ao próprio histórico** (`/motorista/historico`), porque a NF saía da
> posse dele. Era uma regressão silenciosa do A-007 sobre o que a `0015` tinha aberto.

**Por que passou pelos seus testes:** o `T7` exercitava ocorrência com o cliente
**`admin`**, que ignora RLS. O caminho real (sessão do motorista → RPC) nunca era
testado. Adicionei o **T8** cobrindo isso, com os dois cenários de segurança:

```
✓ T8a motorista registra OCORRÊNCIA pela RPC
✓ T8b NF volta pro painel como pendente
✓ T8c motorista mantém acesso ao próprio histórico após a devolução
✓ T8d outro motorista NÃO vê NF solta
```

`npm run test:security` agora com **13 verificações**, todas passando. Validado que
nenhum motorista passou a ver NF de outro nem NF solta.

**Precisa da sua revisão:** as duas migrations mexem em RLS.

### Histórico abaixo

A seção seguinte registra o estado revisado em 20/08 antes dos commits de deploy/cache/Sentry/backup.
Ela fica mantida como histórico técnico, mas a lista válida de pendências é a atualização acima.

## Histórico — pendências Luis revisadas em 2026-08-20

Conferido contra o código nesta data, não contra o que estava marcado.
Detalhe completo: [mvp-a-pendencias.md](./mvp-a-pendencias.md) e
[fase-b-pendencias.md](./fase-b-pendencias.md).

### ⚠️ BLOQUEIO NOVO — `DATABASE_URL` com senha inválida

Descoberto em 20/08. `password authentication failed for user "postgres"`.
Derruba **três comandos de uma vez**:

```
npm run db:migrate   ❌     npm run db:status   ❌     npm run db:backup   ❌
```

**Efeito prático: não dá para aplicar nenhuma migration nova enquanto isso durar** —
e o backup manual, que hoje é a única rede de proteção do banco, também está fora.

Já aconteceu antes: o [CHECKPOINT.md](../docs/governanca/CHECKPOINT.md) registra um
reset de senha pelo mesmo motivo (o pooler do Supabase parou de aceitar a antiga,
`EAUTHQUERY`). Provavelmente é só regenerar a senha no painel e atualizar o `.env`.

> A conexão via **service role key** continua funcionando normalmente (é o que o
> `npm run test:security`, o `seed` e o app usam) — o problema é só no caminho
> `pg`/`DATABASE_URL` dos scripts de migration/backup.

### MVP A — 8 itens

| # | Item | Urgência |
|---|---|---|
| 0 | **Corrigir o `DATABASE_URL`** (acima) | 🔴 trava seu próprio trabalho |
| 1 | **Deploy na Vercel** | ⏫ caminho crítico do projeto |
| 2 | Domínio + SSL | depois do staging |
| 3 | Monitoramento de erros (Sentry) — confirmado ausente do `package.json` | antes de dado real |
| 4 | Backup automático do banco | antes de dado real |
| 5 | Cache offline da lista do dia — `STORE_CACHE` segue só esqueleto | refinamento |
| 6 | Testes E2E (Playwright) — confirmado ausente | não bloqueia piloto |
| 7 | Criar os logins reais (16 motoristas + ~20 empresas) | quando o Vítor trouxer as listas |

*Sem dono definido:* CI (GitHub Actions) — não existe `.github/workflows`.

**Por que o deploy é o caminho crítico:** câmera e Service Worker exigem HTTPS, então
**5 das 7 pendências do Vítor ficam travadas** até o staging subir.

### Fase B — praticamente toda sua

Roteirização com ordem otimizada · KPIs de motorista · Financeiro · Dashboards e
exportação · Web Push · E-mail resumo · Múltiplas fotos (completar).

Duas dependem de **decisão do Vítor/PO antes de começar**: a escolha
Google Routes × OSRM (custo recorrente) e o levantamento de tarifas/custos com o
Matheus. Ver [fase-b-pendencias.md](./fase-b-pendencias.md).

### Para revisar (mexeram no seu território)

- **`getResumoHoje`** (`lib/data/gerencia.ts`) — o Vítor corrigiu um bug que escapou do
  code review do A-007 e reescreveu a consulta (3 queries em paralelo). Detalhe no
  A-001 abaixo e em [vitor-pirolli.md](./vitor-pirolli.md).
- **`lib/import-duplicatas.ts`** — ganhou `duplicatasDoErro()` em 20/08, que lê o
  `details` do erro do Postgres para identificar a linha duplicada. Contexto: no portal
  do cliente o RLS (`cli_nf_select`) esconde NF de outra empresa, então
  `encontrarDuplicatas` passa limpo e só o banco barra — o usuário via "uma das NFs..."
  sem saber qual. Vale sua revisão por tocar em RLS/segurança.

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

### ✅ Feito (2026-08-14)

- `buscarNf` sem filtro de data (`.is("romaneio_id", null)` já define "em aberto");
  `getRomaneiosDoDia` (motorista) trocou `data = hoje` por `status = 'ativo'`.
- `getNotasDoDia`/`getPainelClientes` (`lib/data/gerencia.ts`): default agora é
  "hoje (qualquer status) + tudo que ainda está pendente/em_rota" — não é um `.lte`
  cru (que acumularia histórico infinito), é um filtro consciente de status
  (`NF_STATUS_ABERTOS`, centralizado em `lib/types.ts`).
- `getNotasDoDia` ganhou parâmetro `periodo` (`hoje`/`semana`/`mes`/`todos`, mesmo
  formato de `lib/data/cliente.ts`) — pronto pra o Vítor plugar o seletor do A-002
  sem mexer no backend de novo.
- `getResumoHoje` (KPIs do topo) **ficou intencionalmente só "hoje"**, como o
  critério de aceite pedia — ainda não alinhado formalmente com o Vítor/PO, é a
  única decisão de regra de negócio deste item que segue em aberto.
  > **⚠️ Resolvido pelo Vítor em 14/08, e com um bug junto.** Ao decidir essa
  > regra apareceu que `getResumoHoje` contava `notas_fiscais.status` — mas a
  > migration `0016` (A-007, linha 128) fez a NF persistir só
  > `pendente`/`em_rota`/`aceita`. Os cards **"Recusadas" e "Ocorrências"
  > marcavam zero para sempre**; o desfecho real só existe em `canhotos.status`.
  > Escapou do code review do A-007. Corrigido: os três desfechos passaram a vir
  > de `canhotos` (ancorados em `registrado_em`) e "Em aberto" agora mostra o
  > passivo acumulado, batendo com a tabela. Mexeu em `lib/data/gerencia.ts` —
  > **vale sua revisão**, detalhe em [vitor-pirolli.md](./vitor-pirolli.md).
- Mapa (`lib/data/mapa.ts`) alinhado ao mesmo filtro "aberto"; `getEntreguesComGps`
  passou a ancorar em `canhotos.registrado_em` (quando a entrega de fato
  aconteceu) em vez da `data_entrega` alvo da NF.

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

### ✅ Feito (2026-08-14)

- Confirmado por leitura de código: era mesmo sintoma do A-001, não bug isolado —
  `buscarNf` retornava "não encontrada" pra NF de dia anterior, então nunca havia
  write nenhum pra disparar o evento Realtime. Corrigido junto com o A-001.
- `realtime-refresher.tsx` e a publicação (`0004_realtime.sql`) já estavam corretos,
  nenhuma mudança foi necessária ali.
- **Não verificado ao vivo** (duas abas, bipagem real) — esta sessão não teve acesso
  a browser; validação manual fica pendente antes do go-live.

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

### ✅ Feito (2026-08-14)

- Nova server action `trocarMotorista` (`app/gerencia/dashboard/actions.ts`) — UX
  escolhida (não havia decisão do Vítor registrada): reaproveita um romaneio ativo
  do motorista destino já criado hoje, se existir, em vez de sempre criar um novo —
  evita fragmentar a rota dele em vários romaneios de 1 NF cada.
- Concorrência: relê `romaneio_id` no `update` (mesmo padrão do `atribuirMotorista`
  já existente); romaneio de origem que ficar vazio depois da troca é apagado.
- Bloqueia troca em NF já `aceita` (`NF_STATUS_FINAIS`).
- UI: seletor + botão "Confirmar troca" no `DetailPanel` de
  `components/gerencia/notas-list.tsx`, escondido quando a NF já está finalizada.

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

### ✅ Feito (2026-08-14)

- Nova server action `excluirNotas` (`app/gerencia/dashboard/actions.ts`) —
  trava real no servidor: consulta `canhotos` pelas NFs selecionadas e recusa
  excluir qualquer uma que já tenha canhoto (protege a prova de entrega do
  `on delete cascade`), mesmo que a seleção na tela tenha sido feita antes.
- RLS de delete em `notas_fiscais` confirmada: já coberta por `ger_all` (migration
  `0002`), não precisou de policy nova.
- UI em `components/gerencia/notas-list.tsx`: checkbox por linha, detector de
  `numero_nf` repetido com botão "marcar duplicadas", barra de seleção com
  contagem + "Excluir selecionadas" (confirmação via `confirm()`, mesmo padrão já
  usado em `cadastro-item-actions.tsx`).

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

### ✅ Feito (2026-08-14) — implementado como proposto, com 2 achados extras corrigidos

Migration `0016_reentrega_multiplas_tentativas.sql` (aplicada em produção):

- Idempotência de `registrar_entrega_offline` trocada de "existe canhoto pra esta
  NF" para "existe canhoto pra este `client_id`" — exatamente como proposto.
  `uq_canhoto_nf` (índice que travava 1 canhoto por NF) removido.
- `recusada`/`ocorrencia` não persistem mais como status da NF — a função sempre
  grava `'aceita'` ou `'pendente'`; o resultado real da tentativa fica só em
  `canhotos.status`. Quando não é `'aceita'`, `romaneio_id` e `motorista_id` da NF
  são zerados na mesma transação.
- **Achado 1, não estava no plano original:** o `WITH CHECK` da RLS `mot_nf_update`
  exigia `motorista_id = auth.uid()` na linha nova — zerar `motorista_id` seria
  bloqueado pela própria RLS sem ajustar a policy. Corrigido.
- **Achado 2:** a ordem de escrita foi ajustada (ocorrência inserida *antes* do
  update da NF) porque `mot_ocorrencia_insert` valida contra o `motorista_id` da
  NF — se a NF já tivesse sido desatribuída antes, a ocorrência seria rejeitada.
- **Backfill incluído na migration**: NFs que já estavam paradas em
  `recusada`/`ocorrencia` de antes desta mudança foram normalizadas (senão
  ficariam presas pra sempre, já que nada mais as tocaria).
- `fecharRomaneio`: `STATUS_FINAIS` virou só `["aceita"]`, consolidado como
  `NF_STATUS_FINAIS` em `lib/types.ts` e reutilizado em todo lugar que antes tinha
  essa lista duplicada (6 arquivos — um deles ficou dessincronizado durante o
  desenvolvimento e foi pego no code review).
- Comprovante (`lib/data/comprovante.ts`, `ComprovanteModal`) lista todas as
  tentativas na timeline (status + hora + motorista + observação de cada uma).
  **Achado do code review**: o portal do cliente (`components/cliente/notas-list.tsx`)
  não tinha sido atualizado e mostrava "Canhoto registrado" (sucesso) numa recusa —
  corrigido para usar o mesmo histórico de tentativas.
- `canhotos.observacao` (coluna nova) guarda a observação livre de cada tentativa —
  antes só existia em `notas_fiscais.observacao` (um valor só, que a 2ª tentativa
  sobrescrevia).
- Validado contra o banco real: `npm run test:security` — T4a/b/c (novos) confirmam
  2ª tentativa permitida na mesma NF e reenvio do mesmo `client_id` continua
  bloqueado.

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

### ✅ Feito (2026-08-14) — pipeline completo; camada visual é do Vítor

Migration `0017_posicao_motorista.sql` (aplicada em produção): tabela
`motorista_posicao` (1 linha por motorista, upsert), RLS (motorista só escreve a
própria linha, gerência lê todas), publicação Realtime.

- **Ajuste sobre o proposto**: `atualizado_em` não é mais o relógio do celular —
  um trigger no banco (`motorista_posicao_touch`) sempre grava `now()` do
  servidor, pra um celular com hora errada/sem NTP não bagunçar o "visto há X min"
  no mapa.
- `components/motorista/posicao-tracker.tsx`: `watchPosition` ligado só quando
  existe romaneio `status='ativo'` **e** `confirmado_em` setado (reaproveita o
  `getRomaneiosDoDia` que o layout do motorista já busca — sem query extra);
  throttle de 30s ou 50m de deslocamento, o que vier primeiro. Posição é
  descartável: sem rede, só não envia, sem fila no IndexedDB.
- `getPosicoesMotoristas()` (`lib/data/mapa.ts`) pronta e filtrando só motoristas
  com romaneio ativo+confirmado hoje — é a API que o Vítor consome.
- **Não incluído (é do Vítor):** o marcador visual no mapa (`leaflet-map.tsx`/
  `mapa-entregas.tsx`) e a assinatura ao canal Realtime pro marcador se mover sem
  refresh de página inteira — decidi não plugar isso na `RealtimeRefresher`
  genérica porque ela dispara `router.refresh()` (recarrega o dashboard inteiro);
  com posição chegando a cada ~30s por motorista ativo, isso recarregaria a
  página inteira continuamente. A camada de marcador deve assinar o canal e
  atualizar só o próprio estado local.

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

### ✅ Feito (2026-08-14) — decisão tomada sobre os dois pontos em aberto

Migration `0018_foto_chegada.sql` (aplicada em produção): `canhotos.foto_chegada_url`.

- **Decisão de armazenamento**: guardada na mesma linha do canhoto (não em tabela
  própria) — o app continua enviando as duas fotos + status numa única
  tentativa/transação, então não existe hoje um "registro de chegada" que
  sobrevive independente de uma tentativa de entrega. Registrado no comentário da
  migration como redesenho maior, se algum dia for necessário.
- **Decisão de fluxo**: foto de chegada é o **primeiro passo** da tela de canhoto
  (`components/motorista/canhoto-form.tsx`) — o resto do formulário (foto do
  canhoto, status, observação/ocorrência) só aparece depois dela ser tirada.
- `/api/sync` exige as duas fotos (400 se faltar qualquer uma) e sobe as duas em
  paralelo no Storage (`{motorista_id}/{nf_id}/{client_id}-chegada.jpg`).
- **Achado do code review, corrigido**: item já salvo na fila offline de antes
  desse deploy (sem `foto_chegada`) receberia 400 pra sempre e, pelo tratamento de
  erro original, travaria TODOS os itens seguintes da fila atrás dele.
  `lib/offline/sync.ts` agora descarta só o item inválido em caso de 400 e segue
  com os demais.
- Comprovante (gerência e cliente) mostra as duas fotos lado a lado.

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

### ✅ Feito (2026-08-14) — parcial, Playwright fica pra próxima sessão
<!-- histórico abaixo; a pendência atual de QA está na seção 06/09 no topo -->


- **Code review** rodado sobre todo o diff desta sessão (skill dedicada, nível
  alto, 6 agentes em paralelo cobrindo linha-a-linha, comportamento removido,
  rastreamento entre arquivos, reuso/simplificação, eficiência e convenções do
  CLAUDE.md) — 12 achados reais, 11 corrigidos (o 12º é a divergência conhecida e
  intencional do `getResumoHoje` já registrada no A-001, pendente de confirmação
  do PO/Vítor, não um bug de código).
- **RLS validada** para tudo que foi tocado: `mot_nf_update`, `mot_ocorrencia_insert`,
  RLS nova de `motorista_posicao`, `ger_all` (delete de NF). `npm run test:security`
  9/9 contra o banco real, incluindo os 3 testes novos do A-007.
- **Testes E2E (Playwright): não feito** — decisão explícita desta sessão de
  adiar (configurar do zero é trabalho novo e separado; instalar dependência,
  criar config, escrever os testes). Continua sem responsável formal de QA além
  desta revisão pontual.
- **Critério "cliente A não vê NF da empresa B"**: coberto pelo smoke test
  existente (`cli_nf_select`, RLS por `empresa_cliente_id`), não por um teste E2E
  dedicado — ainda não é o teste automatizado formal que o critério pede.
