# Critérios de sucesso do piloto — Aliança Log

> Rascunho para acordo com o Matheus (Rotta). Escrito em 14/09/2026.
> Enquanto não for aceito por ele, é proposta — não critério.

## Para que serve este documento

O piloto termina e alguém precisa dizer "deu certo" ou "não deu". Sem número acordado
**antes**, essa conversa vira opinião — e quem pagou tende a lembrar dos problemas,
quem construiu tende a lembrar dos acertos.

Estes são os números que decidem.

## Desenho do piloto

| | |
|---|---|
| **Duração** | 5 dias úteis corridos |
| **Motoristas** | 2 a 3, escolhidos pelo Matheus |
| **Empresas** | as que esses motoristas já atendem, sem mudar rota |
| **Escopo** | operação normal — nada de rota especial "para o teste" |
| **Acompanhamento** | Vítor presente na carga nos 2 primeiros dias |

> O piloto roda **em paralelo ao papel**: o motorista registra no app **e** continua com
> o canhoto físico. Ninguém perde comprovante por causa do teste.

## Os 5 critérios

### 1. Adoção — ≥ 95% das entregas registradas pelo app

De todas as entregas feitas pelos motoristas do piloto, ao menos 95% têm registro no
app (com as duas fotos).

**Como medir:** total de canhotos no sistema ÷ total de entregas do romaneio, no período.

**Por que 95% e não 100%:** vai haver celular sem bateria e entrega no fim do dia com
pressa. Abaixo de 95%, porém, o app não virou hábito — e o problema é de usabilidade ou
de treinamento, não de exceção.

---

### 2. Confiabilidade — zero canhoto perdido

Nenhum registro feito pelo motorista pode sumir. Nenhum.

**Como medir:** comparar o que o motorista diz ter registrado com o que chegou ao
painel. Qualquer divergência conta como falha.

**Este é o critério que não negocia.** O produto existe para não perder canhoto. Uma
perda em cinco dias já é motivo para adiar o go-live — porque em escala vira uma por
dia.

---

### 3. Offline — funciona sem sinal e sobe depois

Ao menos **3 entregas registradas sem sinal** durante o piloto, e todas aparecendo no
painel depois.

**Como medir:** o motorista registra em área sem cobertura; confirmar no painel quando
ele voltar.

**Por que é critério e não detalhe:** sinal fraco na Serra é o problema que o cliente
quer resolver. Se isso não estiver de pé, o resto não importa.

---

### 4. Uso pela gerência — o Matheus abre sozinho

O Matheus abre o dashboard **por vontade própria**, sem ninguém pedir, em ao menos 4 dos
5 dias.

**Como medir:** perguntar a ele no fim do piloto — honestamente. Ou olhar o Sentry/log
de acesso.

**Por que isso é um critério:** um painel que só é aberto quando alguém lembra não
substituiu nada. Se ele não abre sozinho, ou falta informação que ele precisa, ou a
informação está difícil de achar.

---

### 5. Tempo de registro — ≤ 2 minutos por entrega

Da abertura da tela até o "registrado", incluindo as duas fotos.

**Como medir:** cronometrar 5 registros reais, com o motorista de verdade, na rua.

**Por que importa:** se registrar demora mais que preencher o canhoto no papel, o
motorista vai deixar para o fim do dia — e aí ele preenche de memória, que é pior que
não registrar.

---

## O que NÃO é critério

Deixar explícito evita discussão depois:

- **Bug de tela ou texto errado** — anota e corrige, não reprova piloto.
- **Motorista achar o app "estranho" nos 2 primeiros dias** — é curva de aprendizado.
- **Funcionalidade que não existe** (roteirização, relatório, financeiro) — é Fase B, não
  faz parte deste acordo.

## Como registrar durante o piloto

Uma planilha simples, preenchida todo dia:

| Dia | Entregas no romaneio | Registradas no app | Registros offline | Perdas | Observações |
|---|---|---|---|---|---|

Toda falha vai com **print e contexto**. Foi assim que o problema do scanner foi
resolvido — só porque a tela mostrava o código que o leitor tinha lido.

## Decisão ao final

| Resultado | O que acontece |
|---|---|
| **5 de 5** | Go-live: 100% dos motoristas e clientes |
| **4 de 5, sem falhar o critério 2** | Go-live com ajustes acordados e prazo |
| **Falhou o critério 2 (perda)** | Não vai a go-live. Corrige e repete o piloto |
| **3 ou menos** | Repete o piloto depois dos ajustes |

---

**Acordado com:** ______________________  **Data:** ____/____/______
