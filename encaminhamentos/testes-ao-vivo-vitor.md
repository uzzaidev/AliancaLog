# Testes ao vivo — Vítor

> **Tudo que precisa ser visto funcionando antes do go-live.** Consolidado em
> 2026-08-14 a partir do [CHECKLIST.md](../docs/governanca/CHECKLIST.md), do
> [CHECKPOINT.md](../docs/governanca/CHECKPOINT.md) e dos encaminhamentos da reunião
> de 12/08; **atualizado em 2026-08-20**. Índice geral: [README.md](./README.md).

> 🧹 **O banco foi zerado em 20/08** — 61 NFs, 13 canhotos, 4 ocorrências, 12 romaneios
> e 16 fotos apagados; cadastros e logins preservados. O estado está limpo para começar
> esta bateria do zero. Para zerar de novo entre rodadas:
> `node --env-file-if-exists=.env scripts/reset-operacional.mjs --confirmar --fotos`
> (sem `--confirmar` ele só conta e faz backup).

## Por que isso está todo concentrado aqui

O código do MVP A inteiro **compila e passa em typecheck, lint, build e no smoke test
de segurança**. Mas as sessões de desenvolvimento (tanto a do Luis quanto as minhas)
**não tiveram acesso a navegador nem a celular** — nada abaixo foi visto rodando com
dado real.

Isso é do Vítor porque exige acesso ao cliente, ao motorista em campo e a arquivo real
da operação. Já aconteceu de algo compilar perfeitamente e estar visivelmente quebrado
na tela (o mapa aparecendo por cima da topbar foi descoberto só por print).

## Pré-requisito que bloqueia metade da lista

⚠️ **Câmera e Service Worker exigem HTTPS.** No celular, `http://localhost` não serve.
Os testes marcados 📱 só rodam depois do **deploy na Vercel**, que é do Luis
(ver [mvp-a-pendencias.md](./mvp-a-pendencias.md)).

Os marcados 💻 dá para fazer agora, no `npm run dev`.

---

## Prioridade 1 — falham em silêncio

Estes não avisam quando dão errado. São os que podem ir para produção parecendo bons.

### 1.1 📱 Segunda tentativa de entrega não perde a foto `A-007`
O risco de perda de dados que motivou o redesenho inteiro.

1. Motorista registra uma NF como **ocorrência** (cliente ausente), com as duas fotos.
2. Confirmar que a NF **sai do romaneio dele** e **reaparece no painel** da gerência
   como pendente/não atribuída.
3. Atribuir de novo (mesmo motorista ou outro).
4. Motorista entrega e registra **aceita**, com foto nova.
5. **O que confirmar:** a foto e o status da **segunda** tentativa foram salvos, e o
   comprovante mostra **as duas tentativas** na linha do tempo.

> Se a segunda foto sumir sem erro na tela, é exatamente a falha silenciosa que a
> migration `0016` foi feita para eliminar. Testar antes de qualquer piloto.

### 1.2 📱 Fila offline não trava nem perde canhoto
1. Celular em **modo avião**, com o app já aberto.
2. Registrar 2–3 canhotos (fotos + status).
3. Confirmar o banner âmbar "sem conexão".
4. Voltar o sinal.
5. **O que confirmar:** todos sobem, a fila zera, e aparecem no dashboard da gerência.
   Nenhum item fica preso para trás.

### 1.3 📱 Motorista no mapa em tempo real `A-006`
Precisa de motorista real na rua.

- O marcador se move no dashboard **sem a página recarregar**.
- Deixar o celular sem sinal alguns minutos: o pino deve **apagar** (ficar cinza/oco) e
  o balão passar a avisar *"pode estar sem sinal"*.
- **O que confirmar:** um pino parado nunca passa a impressão de posição atual.

### 1.4 💻 Isolamento entre empresas `R-008`
O risco mais sério do produto: cliente ver dado de outro cliente.

- Logar como `cliente_final` de uma empresa e confirmar que **só** vê as NFs dela.
- **O login do cliente_final nunca foi testado de verdade** — gerência e motorista já
  foram, ele não.

---

## Prioridade 2 — o que o cliente vai usar todo dia

### 2.1 📱 Bipagem de NF de dia anterior `A-001 + A-009`
Era o bug que originou a reunião ("nenhuma nota encontrada").

- Bipar uma NF **de romaneio de dia anterior** e confirmar que ela é encontrada.
- Com o dashboard aberto em outra aba/dispositivo: confirmar que ele atualiza sozinho
  em ~3s, sem F5.

### 2.2 💻 Upload de `.zip` com XMLs `A-003`
Usar um **`.zip` real** de carga fechada, não um montado para teste — arquivo real vem
com pasta dentro de pasta, PDF junto, nome estranho.

- Todas as notas aparecem na grade de conferência.
- Testar também nos **dois perfis** (gerência e cliente).

### 2.2b 💻 Fluxo de duplicatas na importação `corrigido em 20/08`
Foi reportado em uso real e corrigido; precisa de confirmação na tela.

- Subir um lote com NF repetida: a linha duplicada tem que ficar **marcada em vermelho**
  (antes aparecia só "uma das NFs…" sem dizer qual).
- **O teste principal:** com 2 ou mais duplicadas marcadas, remover **uma**. As outras
  **têm que continuar marcadas** — era exatamente esse o bug.
- Botão **"Remover N duplicadas"** no cabeçalho da grade limpa todas de uma vez.
- Testar nos **dois perfis**. No portal do cliente há um caso extra: NF já cadastrada
  por outra empresa é invisível ao cliente (RLS), então a mensagem deve explicar que
  *"pode ter sido enviada antes pela transportadora"* — e ainda assim marcar a linha.

### 2.3 💻 Filtro de período `A-002`
- Trocar o período e ver a lista mudar.
- No padrão ("Hoje + pendências"), confirmar que uma NF de ontem ainda pendente
  **aparece**.

### 2.4 💻 Alerta de NF parada `A-008`
- Uma NF em aberto há mais de 7 dias ganha o selo vermelho.
- O chip no topo filtra só essas.

### 2.5 💻 KPIs do topo batem com a tabela
Correção de 14/08 — dois cards estavam zerados para sempre.

- Registrar uma recusa e uma ocorrência: **"Recusadas hoje"** e **"Ocorrências hoje"**
  devem sair do zero.
- **"Em aberto"** deve bater com a contagem da tabela logo abaixo.

### 2.6 📱 Foto de chegada em 2 passos `A-010`
- Não deve ser possível registrar **nenhum** status sem a foto de chegada.
- As duas fotos aparecem no comprovante, na gerência e no portal do cliente.

### 2.7 💻 Troca de motorista e exclusão em lote `A-005 + A-004`
- Trocar o motorista de uma NF já em rota: não pode ficar presa em dois romaneios nem
  deixar romaneio fantasma vazio.
- Tentar excluir uma NF **que já tem canhoto**: o sistema deve **recusar** (é prova de
  entrega).

---

## Prioridade 3 — qualidade e usabilidade real

### 3.1 📱 Legibilidade da foto do canhoto `pré-piloto`
A compressão foi de 800px para 1280px justamente para a assinatura sobreviver ao zoom —
nunca foi validado com material real.

Testar com: canhoto **amassado**, foto **contra o sol**, caneta fraca, dentro da
cabine.
**Critério:** dá para ler a assinatura e o carimbo com zoom? Se não, o produto perde o
valor probatório e a compressão precisa mudar antes do piloto.

### 3.2 📱 App do motorista sob condição real
Sol na tela, com luvas, dirigindo. Os alvos de toque são de 48px — confirmar se
funciona de verdade, não só no papel.

### 3.3 📱 Cold-open offline `conhecido como não implementado`
Fechar o app **sem sinal** e reabrir do zero.

**Hoje isso não funciona** — a lista só existe se a aba já estava aberta (o cache
`STORE_CACHE` é só esqueleto, ver [mvp-a-pendencias.md](./mvp-a-pendencias.md) item 5
do Luis). Vale confirmar o quanto isso atrapalha na prática **antes** do Luis investir
no refinamento: se na Serra o motorista fecha o app com frequência, sobe de
refinamento para bloqueio.

### 3.4 💻 Layout em telas reais
Já foram corrigidos "no escuro", sem confirmação visual:
- Nav de baixo no mobile da gerência (sessão de 01/08).
- Mapa não pode aparecer por cima da topbar (corrigido, mas confirmar nos dois perfis).
- Portal do cliente em desktop (virou grade de 2–3 colunas) e em celular.

---

## Definition of Done — checar antes do go-live

Direto do [CHECKLIST.md](../docs/governanca/CHECKLIST.md):

- [ ] Cada perfil loga, é redirecionado e **não acessa** área de outro
- [ ] Motorista não vê entrega de outro motorista
- [ ] Cliente não vê NF de outra empresa
- [ ] Offline funciona em modo avião e sincroniza ao voltar
- [ ] Realtime: registro → gerência em menos de 3s
- [ ] Carga inicial < 3s em 4G · upload de foto < 5s · roda em Android 9+/2GB
- [ ] Tudo HTTPS · fotos só por URL assinada · sem dado sensível em `localStorage`

---

## Sugestão de sequência

1. **Agora, sem depender de ninguém:** os 💻 — 1.4, 2.2, 2.2b, 2.3, 2.4, 2.5, 2.7, 3.4.
2. **Assim que o Luis subir o deploy:** 1.1, 1.2, 2.1, 2.6 — o núcleo do produto.
3. **Com motorista real em rota:** 1.3, 3.1, 3.2, 3.3.
4. **Fechar** a Definition of Done acima e escrever os critérios de sucesso do piloto.

> Anote o que falhar aqui mesmo, com print. Foi assim que os dois últimos bugs reais
> (mapa sobrepondo a topbar, hydration do Realtime) apareceram.
