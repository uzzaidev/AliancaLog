# Encaminhamentos — Vítor Pirolli

> Comercial/Account + Frontend/Produto/PO + Gestão/PM.
> Origem: [reunião 12/08](../reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md) ·
> Índice geral: [README.md](./README.md).

**✅ Status: os 4 itens de dev implementados em 2026-08-14** — `typecheck`/`lint`/
`build` verdes. Detalhe do que foi feito abaixo do critério de aceite de cada um.

**Pendente:**
- **Verificação ao vivo de tudo abaixo** (navegador/celular real) — é minha, sou eu
  quem lida com o cliente. Nada aqui foi visto rodando ainda, só compila.
- Itens de processo/comercial: A-012, A-013, A-015.
- Uma decisão de produto em aberto: ver "KPIs do topo" no fim deste arquivo.

5 itens de desenvolvimento (frontend) + 3 itens de processo/comercial.

---

## Dev

### A-003 — Upload de XMLs em lote (.zip)

**Dono deste item.** Ganho alto, esforço baixo — o `ImportWizard`
(`components/gerencia/import-wizard.tsx`) é o **mesmo componente** nos dois perfis
(`variant="gerencia"` em `app/gerencia/importar/page.tsx`, `variant="cliente"` em
`app/cliente/importar/page.tsx`), então uma mudança atende os dois de uma vez —
exatamente o que a sua resposta pediu ("tanto gerência quanto cliente").

O parser de XML (`lib/import-nf.ts`, `parseNfeXml`) **já lê lote**: itera todo
`<infNFe>` do documento e retorna uma linha por NF. O que falta é só destrapar o
`.zip` antes de chegar nele.

**O que fazer:**
- Adicionar dependência de unzip no browser (ex.: `fflate`, é leve e roda 100% no
  client — sem subir o zip inteiro pro servidor).
- `lib/import-nf.ts`, `tipoDoArquivo()`: reconhecer `.zip` como novo `TipoArquivo`.
- No fluxo de `onFile` do `ImportWizard`: se o arquivo for `.zip`, descompactar em
  memória, filtrar as entradas `.xml`, rodar `parseNfeXml` em cada uma e concatenar os
  `ImportRow[]` resultantes (mesmo formato que já é usado para múltiplos XMLs soltos).
- Reaproveitar a tela de conferência/edição que já existe para o fluxo XML/PDF (grade
  editável com `duplicadas` marcadas) — não precisa de UI nova, só o parsing muda.
- Avisar o Luis para conferir limite de payload da server action
  (`confirmarImportacao`/`confirmarImportacaoCliente`) com lote grande (um `.zip` de
  carga fechada pode ter dezenas de NFs de uma vez).

**Depende de processo:** ver A-012 abaixo — não faz sentido subir isso pro cliente
final antes de alinhar com ele o formato que vai mandar.

**Critério de aceite:**
- Subir um `.zip` com N XMLs de NF-e mostra a mesma grade de conferência que hoje
  aparece para XMLs soltos, com todas as N notas.

### ✅ Feito (2026-08-14)

- Dependência `fflate` adicionada; `parseZipXmls()` em `lib/import-nf.ts`
  descompacta no browser e roda o `parseNfeXml` já existente em cada XML de dentro.
- `tipoDoArquivo()` reconhece `.zip`; `onFile` do `ImportWizard` aceita `.zip`
  misturado com XML/PDF na mesma seleção.
- Filtra o que não é XML **antes** de descompactar (`filter` do fflate) — um PDF ou
  imagem que venha junto no pacote não gasta memória à toa. Ignora também lixo de
  compactação do macOS (`__MACOSX/`, `._arquivo`).
- Mensagens específicas para os casos reais: `.zip` sem nenhum XML dentro, `.zip`
  protegido por senha, e pacotes vazios ignorados no meio de uma seleção múltipla.
- Copy das duas telas de importação atualizado (gerência e cliente) para orientar o
  `.zip` como caminho recomendado ao fechar a carga.
- **Vale para os dois perfis** com uma mudança só, como previsto.

---

### A-002 — Filtros de período na gerência

**Dono deste item.** Já existe pronto no portal do cliente
(`components/cliente/filtros.tsx`, `lib/data/cliente.ts` — `ClienteFiltro.periodo`:
`hoje` / `semana` / `mes` / `todos`). É replicar esse padrão na gerência, que hoje
está sempre travada em "hoje".

**O que fazer:**
- Componente de filtro no dashboard da gerência
  (`components/gerencia/filtros.tsx`), no mesmo padrão visual/UX do
  `components/cliente/filtros.tsx` (select de período + escreve na URL via
  `useSearchParams`).
- **Parte do Luis:** `getNotasDoDia` (`lib/data/gerencia.ts`) precisa aceitar um
  parâmetro de período em vez de só uma data única — ver
  [luis-fernando-boff.md § A-001](./luis-fernando-boff.md#a-001--filtro-de-data-preso-em-hoje),
  que mexe exatamente nessas mesmas funções. Alinhar os dois itens juntos, é o mesmo
  ponto de código.

**Critério de aceite:**
- Selecionar "Últimos 7 dias" no dashboard da gerência mostra as NFs desse intervalo,
  igual já acontece no portal do cliente.

### ✅ Feito (2026-08-14)

- Seletor de período em `components/gerencia/filtros.tsx`, plugado no parâmetro
  `periodo` que o Luis já tinha deixado pronto em `getNotasDoDia` — nenhuma mudança
  de backend foi necessária.
- **Detalhe que não era óbvio:** o default da gerência não é "hoje", é *"hoje +
  tudo que ainda está em aberto"* (o comportamento do A-001 que impede NF de ontem
  de sumir). Então ele aparece **nomeado na lista** como "Hoje + pendências", em vez
  de virar um placeholder tipo "Todos os períodos" — que daria a impressão errada de
  que não há filtro aplicado.
- O chip fica laranja só quando um período **diferente do default** está escolhido, e
  o botão "Limpar" passou a considerar o período também.

---

### A-009 — parte do frontend (Realtime na tela de bipagem)

Ver detalhe completo em
[luis-fernando-boff.md § A-009](./luis-fernando-boff.md#a-009--bipe-não-atualiza-em-tempo-real)
(hipótese principal é que é sintoma do A-001, do lado do Luis). Sua parte, se
necessário depois da investigação dele:

- Montar `<RealtimeRefresher />` (`components/gerencia/realtime-refresher.tsx`) na
  tela de bipagem (`app/gerencia/romaneios/novo/page.tsx`) — hoje só o dashboard e o
  portal do cliente escutam Realtime.

---

### A-008 — Alerta de notas paradas há mais de 7 dias

**Dono deste item** (parte de regra + UI; a consulta de dados é do Luis).
**Depende do A-001** — sem enxergar nota de dia anterior no painel, não há o que
alertar.

**O que fazer:**
- Definir a regra exata: 7 dias corridos a partir de quando (`data_entrega`?
  `created_at`?); quais status contam (só `pendente`? também `em_rota`?).
- Sinalização visual no painel — badge/ícone de alerta na linha da tabela
  (`components/gerencia/notas-list.tsx`) para NFs que baterem a regra. Considerar
  também um contador na faixa de KPIs (`components/gerencia/stat-cards.tsx`).

**Critério de aceite:**
- Uma NF pendente há mais de 7 dias fica visualmente destacada no painel sem precisar
  filtrar manualmente.

### ✅ Feito (2026-08-14) — com as duas decisões de regra tomadas

Regra isolada em `lib/alertas.ts` (fonte única, não espalhada pela UI):

- **Conta a partir de `data_entrega`**, não da importação: o que importa é o atraso
  em relação ao que foi prometido ao cliente.
- **Só NF em aberto** (`NF_STATUS_ABERTOS`). Uma NF `aceita` está resolvida, não
  importa a idade. Isso já casa com o A-007: como `recusada`/`ocorrência` agora
  voltam para `pendente`, "em aberto" cobre exatamente o conjunto que ainda precisa
  de nova tentativa — não precisou de regra especial pra elas.
- `DIAS_PARA_ALERTA = 7` exportado, então mudar o limite é um lugar só.
- Comparação de datas feita em UTC puro (as duas já vêm em `YYYY-MM-DD` de SP), pra
  o fuso do navegador não deslocar um dia na conta.

Na UI (`components/gerencia/notas-list.tsx`):
- Badge vermelho "Nd parada" ao lado do status, na linha.
- Chip na toolbar com a contagem, que **também filtra** ("mostrando só estas") — mais
  útil que um contador passivo: a gerência vê o número e já ataca a lista.
- Linha "Parada há N dias sem desfecho" no painel de detalhe, junto da data de entrega.
- `NotaRow` ganhou `data_entrega` (campo aditivo em `lib/data/gerencia.ts`) — o alerta
  precisa dele para calcular e exibir os dias.

---

### A-006 — parte do frontend (camada "Motoristas" no mapa)

Pipeline completo (tabela, RLS, Realtime, `watchPosition`) é do Luis — ver
[luis-fernando-boff.md § A-006](./luis-fernando-boff.md#a-006--rastreamento-ao-vivo-dos-motoristas-no-mapa).
Sua parte, depois que a API estiver pronta:

- Nova camada no `MapaLeafletInner`/`MapaEntregas`
  (`components/mapa/leaflet-map.tsx`, `components/gerencia/mapa-entregas.tsx`):
  marcador por motorista (diferente do marcador de destino/entregue que já existe),
  com cor/ícone identificando cada um.
- Indicador de **"visto há X min"** no popup do marcador — importante: sem isso, um
  ponto parado no mapa parece posição atual mesmo se o motorista está sem sinal há 20
  minutos. Calcular a partir de `atualizado_em` da posição.
- Alinhar com o Luis: o que a gerência precisa enxergar além da posição (nome do
  motorista, quantas NFs faltam no romaneio dele, etc. — dado que já existe em outras
  partes do dashboard e pode ser combinado no popup).

### ✅ Feito (2026-08-14) — respeitando a restrição que o Luis apontou

- `MapaLeafletInner` ganhou a prop `motoristas`: marcador maior, com anel laranja da
  marca, desenhado **por cima** dos pinos de NF (é o que a gerência quer olhar
  primeiro). Consome `getPosicoesMotoristas()`, que o Luis deixou pronta.
- **Camada sobreposta, não exclusiva** — decisão de UX: alternar entre "destinos" e
  "motoristas" esconderia justamente a comparação útil ("ele está perto do que ainda
  falta entregar?"). Destino/Entregue seguem exclusivas entre si; Motoristas é um
  toggle independente por cima, ligado por padrão.
- **"Visto há X min"** no popup, com relógio local recalculando a cada 30s — sem
  isso, o texto congelaria em "há 2 min" para sempre enquanto nenhuma posição nova
  chegasse, que é exatamente quando o dado envelhecendo é a informação importante.
- Posição com **5 min ou mais** fica cinza e oca, e o popup avisa "pode estar sem
  sinal" — um pino parado não pode passar a impressão de posição atual.
- **Realtime próprio, como o Luis pediu:** assina `motorista_posicao` direto e
  atualiza só o estado local, sem `router.refresh()`. Canal com sufixo aleatório
  (mesmo padrão do `realtime-refresher.tsx`) pra não colidir no Strict Mode.
- **Padrão de estado escolhido com cuidado:** o servidor continua sendo a fonte de
  QUEM está ativo (com nome, que vem de join); o Realtime guarda só os *deltas* de
  posição, mesclados na renderização e apenas quando mais recentes que o dado do
  servidor — assim um evento atrasado não faz o marcador "voltar no tempo". A
  alternativa (copiar a lista pra estado e sincronizar com `useEffect`) foi
  descartada: além de antipadrão, entrava em **loop infinito de render** por causa
  do array default criado a cada renderização.
- Motorista que confirma romaneio no meio da sessão não aparece pelo evento de
  posição (não temos o nome dele no payload) — mas entra sozinho no próximo refresh
  do dashboard, que a própria atividade de entrega já dispara.

---

## Processo / comercial (fora de código)

### A-012 — Alinhar com o cliente o fluxo de XML em .zip

Agendar e conduzir a reunião de alinhamento com a Rotta sobre o envio de XMLs como
`.zip` ao fechar cada carga (decisão **D-005** da ata). **Precisa acontecer antes** do
A-003 ir para produção — não adianta o sistema aceitar `.zip` se o cliente continua
mandando nota a nota.

### A-013 — Prospectar integração via API do sistema do cliente

Baixa prioridade na ata (🔽). Investigar se o sistema do cliente tem chave de API para
automatizar o recebimento de notas, eliminando de vez o passo manual de exportar/subir
arquivo. Sem tarefa de código associada por enquanto — é levantamento.

### A-015 — Treinamento operacional no cliente

Fluxo em duas etapas (decisão registrada como Kaizen **K-002** na ata): equipe passa
pelo processo sozinha primeiro, depois acompanha junto com o cliente. Captura ajustes
reais do dia a dia antes do rollout definitivo. Definir a agenda dessas duas etapas
conforme os itens de dev acima forem fechando (principalmente A-007 e A-003, que mudam
o fluxo operacional que será treinado).

---

## ✅ KPIs do topo — decidido e corrigido (2026-08-14)

Ao analisar a pendência que o Luis deixou ("KPIs continuam só de hoje, não alinhado
com o PO"), apareceu um **bug mais grave que a dúvida original**.

### O bug: dois KPIs zerados para sempre

`getResumoHoje` contava `notas_fiscais.status`. Só que a migration `0016` (A-007)
mudou isso — linha 128:

```sql
v_status_nf := case when p_status = 'aceita' then 'aceita' else 'pendente' end;
```

A NF passou a persistir **apenas** `pendente` | `em_rota` | `aceita`. Recusa e
ocorrência devolvem a nota ao painel como `pendente`, e o desfecho real vive só em
`canhotos.status`. Ou seja: os cards **"Recusadas" e "Ocorrências" marcariam zero
permanentemente** — justamente os dois números que motivaram o A-007 na reunião.
Não foi pego no code review do A-007.

### O que foi feito

`getResumoHoje` agora separa duas naturezas de número, e os rótulos deixam isso
explícito na tela:

| KPI | Origem | Natureza |
|---|---|---|
| Total hoje | `notas_fiscais` do dia | estado |
| **Entregues hoje** | `canhotos` de hoje | evento |
| **Recusadas hoje** | `canhotos` de hoje | evento |
| **Ocorrências hoje** | `canhotos` de hoje | evento |
| Em rota | `notas_fiscais` agora | estado |
| **Em aberto** | todo o passivo | estado |

- Os três desfechos passam a vir de `canhotos`, ancorados em `registrado_em` — o
  que também corrige um efeito colateral: NF atrasada de ontem entregue hoje agora
  conta como **entrega de hoje**, que é o que a operação entende por produtividade
  do dia.
- **"Em aberto" passou a mostrar o passivo real** (com dias anteriores), então bate
  com a tabela logo abaixo — era exatamente a divergência que eu tinha levantado.
  Quanto disso é atraso aparece como linha de apoio: *"N de dias anteriores"*.
- `Kpi` (`components/ui/kpi.tsx`) ganhou a prop opcional `hint` para essa linha.

**Para o Luis:** isso mexeu em `lib/data/gerencia.ts`, que é território dele — mas
era a decisão de KPI que ficou explicitamente comigo, e o bug estava embutido nela.
Vale ele revisar a consulta nova (3 queries em paralelo, uma delas `count` com
`head: true`).

---

## Teste ao vivo (meu — lido direto com o cliente)

Nada abaixo foi visto rodando ainda; o código compila e passa nas verificações.
Roteiro do que precisa ser conferido em navegador/celular real.

**Prioridade:** comece por **A-006 e A-007** — mexem em prova de entrega e em
dinheiro, e falham de forma silenciosa. Os outros quebram de jeito óbvio se
estiverem errados.

- [ ] **A-002** — trocar o período no dashboard e confirmar que a lista muda; conferir
      que o default "Hoje + pendências" realmente traz NF de ontem ainda pendente.
- [ ] **KPIs** — conferir que "Recusadas hoje" e "Ocorrências hoje" saem do zero ao
      registrar uma recusa/ocorrência (era o bug acima), e que "Em aberto" bate com
      a contagem da tabela logo abaixo.
- [ ] **A-003** — subir um `.zip` real de carga fechada (não um de teste) e conferir
      se todas as NFs aparecem na grade; testar também `.zip` com PDF junto dentro.
- [ ] **A-008** — confirmar que uma NF antiga em aberto ganha o badge e que o chip de
      filtro isola só essas.
- [ ] **A-006** — com um motorista real em rota: abrir o dashboard e ver o marcador
      andando sem a página recarregar; deixar o celular sem sinal e confirmar que o
      pino apaga e o popup passa a avisar "pode estar sem sinal".
- [ ] **A-009** — bipar uma NF de dia anterior em duas abas e confirmar que o
      dashboard atualiza sozinho (verificação que ficou pendente do lado do Luis).
- [ ] Regressão do que o Luis entregou: registrar ocorrência e ver a NF voltar ao
      painel; 2ª tentativa de entrega persistindo foto e status (A-007).

## Critérios de aceite consolidados (produto)

Antes de considerar este pacote pronto para o cliente:

- [x] Painel da gerência mostra e permite filtrar NFs de qualquer período, não só hoje.
- [x] Upload de `.zip` funciona nos dois perfis (gerência e cliente).
- [x] Alerta visual de NF parada há +7 dias aparece no painel.
- [x] Mapa da gerência mostra a posição ao vivo de cada motorista com romaneio ativo,
      com indicação de há quanto tempo foi a última atualização.
- [ ] Reunião com o cliente sobre o formato `.zip` realizada antes do deploy do A-003.
- [ ] Roteiro de teste ao vivo acima executado.
