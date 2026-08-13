# Encaminhamentos — Vítor Pirolli

> Comercial/Account + Frontend/Produto/PO + Gestão/PM.
> Origem: [reunião 12/08](../reuniões/12.08/2026-08-12-ata-alianca-log-ajustes-iza-rotta.md) ·
> Índice geral: [README.md](./README.md).

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

## Critérios de aceite consolidados (produto)

Antes de considerar este pacote pronto para o cliente:

- [ ] Painel da gerência mostra e permite filtrar NFs de qualquer período, não só hoje.
- [ ] Upload de `.zip` funciona nos dois perfis (gerência e cliente).
- [ ] Alerta visual de NF parada há +7 dias aparece no painel.
- [ ] Mapa da gerência mostra a posição ao vivo de cada motorista com romaneio ativo,
      com indicação de há quanto tempo foi a última atualização.
- [ ] Reunião com o cliente sobre o formato `.zip` realizada antes do deploy do A-003.
