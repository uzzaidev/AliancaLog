# Plano de fechamento — MVP A e MVP B

> Escrito em 14/09/2026, a partir da revisão do código (não do que estava marcado nos
> documentos). Divisão de donos conforme
> [PLAN.md § Time e responsabilidades](../docs/governanca/PLAN.md#2-time-e-responsabilidades).
> Índice geral: [README.md](./README.md).

## Como ler

| Marca | Significado |
|---|---|
| 🔴 | Bloqueia a entrega / o piloto |
| 🟡 | Não bloqueia, mas vira problema em uso real |
| ⚪ | Pode esperar o pós-piloto |
| 🔑 | **Decisão** — precisa de resposta antes de qualquer código |

**Convenção de dono para a Fase B.** O PLAN.md dá "Fase B completa" ao Luis. Na
prática, o que já funcionou antes (A-006, mapa ao vivo) foi: **Luis entrega o dado e a
API, Vítor entrega a tela**. O plano abaixo segue esse precedente — onde um item tem as
duas metades, elas aparecem separadas.

**Estimativas são grosseiras** e servem para ordenar, não para cobrar prazo.

---

# FASE 0 — Antes de entregar ao cliente

O código do MVP A está fechado: `typecheck`, `lint`, `build`, `test:scanner` (13
verificações com decodificação real de imagem), `test:security` (23 + T11a–f) e
`test:offline` verdes. **O que falta aqui não é código.**

### 0.1 ✅ RESOLVIDO (15/09 — Luis) — DSN do Sentry cadastrada e validada

- **Status:** DSN configurada na Vercel (Production e Preview) e no `.env.local`:
  `https://864a92d5e9f0d6a7fdcc46bfd610f847@o4511302352502784.ingest.us.sentry.io/4511967093391360`
- **Validação:** Evento de teste disparado com sucesso via envelope API (HTTP 200 OK, Event ID: `9e47fb58a78b0d4e3126c84a5acf0cb0`) com tags `area: "offline-sync"` e `piloto: "true"`.
- Painel operacional ativo em `/gerencia/diagnostico`.

---

### 0.2 🔴 Testar num Android barato, em 4G — **VÍTOR**

**Por quê:** é o único item da Definition of Done ainda aberto, e toda a bateria de
validação foi feita em iPhone. **Os 16 motoristas reais não usam iPhone.** Câmera,
upload de foto e Service Worker se comportam de forma bem diferente num Android 9 com
2 GB.

**O que fazer:**
1. Conseguir um Android de baixo custo (Android 9+, 2 GB) — pode ser de um motorista.
2. Instalar o PWA pela tela de início.
3. Medir, com 4G (não Wi-Fi): tempo da carga inicial e tempo do upload de uma foto.
4. **Bipar um DANFE real** — o scanner foi reescrito e nunca rodou em Android.
5. Registrar um canhoto completo (2 fotos) e confirmar que sobe.
6. Repetir o teste de modo avião: registrar offline, voltar o sinal, ver na gerência.

**Aceite:** carga inicial < 3s · upload de foto < 5s · bipagem funciona · fila offline
esvazia.

**Se falhar:** é `🔴` de verdade — não entregue sem resolver. Traga os números que eu
ajudo a otimizar.

**Esforço:** ~1h de teste, mais o que aparecer.

---

### 0.3 🔴 Criar os logins reais — **VÍTOR** (dados) → **LUIS** (execução)

**Por quê:** o banco tem só os 8 logins de teste. Sem os reais não há piloto.

**Vítor:** conseguir com o Matheus e preencher os dois CSVs em `scripts/dados/` —
hoje são **só os templates, ninguém preencheu**:
- `motoristas.csv` — 16 motoristas (nome, e-mail, telefone, CNH, placa)
- `empresas.csv` — ~20 empresas (nome, CNPJ, contato, e-mail de acesso)

⚠️ **Não mande dados reais antes do NDA assinado** (item 0.5).

**Luis:** rodar `npm run importar:piloto`, conferir que os logins foram criados no
Supabase Auth com o `app_metadata.role` certo, e testar um login de cada perfil.

**Aceite:** um motorista real e um cliente real conseguem logar e ver só o que é deles.

**Esforço:** Vítor depende do Matheus · Luis ~1h.

---

### 0.4 🟡 Escrever os critérios de sucesso do piloto — **VÍTOR**

**Por quê:** sem isso não há como dizer se o piloto deu certo, e a conversa vira opinião.

**O que fazer:** acordar por escrito com o Matheus. Sugestão já registrada:
- 2–3 motoristas × 5 dias úteis
- ≥ 95% das entregas registradas pelo app (não no papel)
- zero canhoto perdido no sync
- Matheus abrindo o dashboard por conta própria, sem ninguém lembrar

**Aceite:** documento de uma página, aceito pelo Matheus.

**Esforço:** ~1h. **Posso escrever o rascunho.**

---

### 0.5 🔴 NDA assinado antes de receber dado real — **UZZAI / VÍTOR cobra**

**Por quê:** o item 0.3 envia nomes, CNPJ, e-mails e CNHs. Isso é dado pessoal de
terceiros. Hoje não há NDA.

**Aceite:** NDA assinado antes do primeiro CSV real sair do Matheus.

---

### 0.6 🟡 Política de privacidade e LGPD — **UZZAI / VÍTOR cobra**

**Por quê:** confirmei no código que **não existe nenhuma rota de privacidade**. E o
produto coleta **foto de assinatura, GPS e horário de pessoas físicas** — o canhoto é
dado pessoal, e a base legal precisa estar escrita antes do primeiro canhoto real.

**O que fazer:**
1. Jurídico redige política de privacidade e termos de uso (o que é coletado, por quê,
   por quanto tempo, quem acessa).
2. Publicar como rota pública no app e linkar no rodapé do login.
3. Definir **prazo de retenção das fotos** — hoje ficam para sempre no Storage.

**Aceite:** rota pública no ar e linkada. **Posso implementar a rota** assim que o texto
existir.

---

# FASE 1 — Piloto

### 1.1 🔴 Rodar o piloto — **VÍTOR**

2–3 motoristas, 5 dias úteis, com os critérios do item 0.4.

**O que fazer:**
- Acompanhar de perto os dois primeiros dias (estar junto na carga).
- Registrar toda falha com print e contexto — como foi feito com o scanner, que só foi
  resolvido porque a tela mostrava o código lido.
- Conferir o Sentry todo dia (só funciona se o 0.1 estiver feito).

### 1.2 🟡 Guia de 1 página + treinamento — **VÍTOR / Operação**

Uma folha, com foto das telas: como confirmar romaneio, como bipar, como registrar
canhoto (as 2 fotos), o que fazer sem sinal, o que fazer quando a nota não é encontrada.

Treinar o coordenador primeiro — ele vira o suporte nível 1.

**Posso montar o guia** no mesmo formato do roteiro de testes em PDF.

### 1.3 🟡 Legibilidade da foto em luz ruim — **VÍTOR**

Testar com canhoto amassado, contra o sol, caneta fraca, dentro da cabine. A compressão
subiu de 800px para 1280px justamente para a assinatura sobreviver ao zoom, e isso nunca
foi validado com material real.

**Se não der para ler:** o produto perde o valor probatório — me avise que ajustamos a
compressão antes do go-live.

### 1.4 ⚪ Ajustes pós-piloto — **VÍTOR prioriza, LUIS/eu executamos**

---

# FASE 2 — Go-live do MVP A

### 2.1 🟡 Domínio próprio — **LUIS** (decisão do **VÍTOR**)

🔑 **Decisão:** fica em `alianca-log.vercel.app` ou vai para domínio da Aliança?
Se for domínio próprio, o CNAME está documentado no guia. Contar a propagação de DNS.

### 2.2 🔴 Go-live — **VÍTOR**

100% dos motoristas e clientes com acesso, depois dos ajustes do piloto.

### 2.3 ⚪ Testes E2E com Playwright — **LUIS**

Adiado por decisão explícita. Vale retomar depois do go-live: caminho crítico é login
por perfil, registrar canhoto offline→sync, e isolamento entre empresas.

### 2.4 ⚪ Contrato, DRE, prazo mínimo — **UZZAI**

Contrato de desenvolvimento assinado, DRE revisado (margem, impostos, custo de API) e
prazo mínimo de contrato — crítico porque o modelo é só-recorrência.

---

# FASE 3 — MVP B (Fase B)

> **Nada começou.** Verifiquei item a item contra o código em 14/09: não há uma linha de
> roteirização, KPI, financeiro, exportação, Web Push ou e-mail.

## 3.0 🔑 Três decisões antes de qualquer código — **VÍTOR**

Sem estas respostas, começar a Fase B é retrabalho garantido.

**Decisão 1 — motor de roteirização.**

| Opção | Custo | Trabalho |
|---|---|---|
| Google Routes API | ~US$5 / 1.000 requisições, recorrente | baixo, é só consumir |
| OSRM + VROOM auto-hospedado | grátis, mas servidor + manutenção | alto |

Entra direto no DRE. **É decisão comercial, não técnica.**

**Decisão 2 — tarifas e custos.** O módulo financeiro não existe sem: tarifa cobrada por
empresa, custo de combustível, manutenção e hora de motorista. Isso se levanta com o
Matheus, não se inventa.

**Decisão 3 — ordem de entrega da Fase B.** Qual desses o cliente quer primeiro?
Sugiro **KPIs → Dashboards/exportação → Roteirização → Financeiro**: os dois primeiros
usam dados que já existem no banco e entregam valor rápido; os dois últimos dependem das
decisões 1 e 2.

---

## 3.1 KPIs de motorista

**LUIS — dados.** Funções agregadas em `lib/data/`: total entregue por motorista, taxa
de sucesso vs problema, tempo médio entre canhotos, evolução no período. Tudo sai de
`canhotos` + `notas_fiscais`, que já têm os dados — **não precisa de migration**.

**VÍTOR — tela.** Aba de desempenho na gerência: tabela por motorista, ranking, gráficos
de evolução, filtro de período.

🔑 Definir com o Matheus o que conta como "tempo médio" — entre canhotos? da saída até a
última entrega?

**Esforço:** médio. É o item de melhor relação valor/custo da Fase B.

---

## 3.2 Dashboards, relatórios e exportação

**LUIS — dados.** Agregações por empresa, por cidade e por período; dados para mapa de
calor (as coordenadas já são coletadas).

**VÍTOR — tela.** Gráficos, mapa de calor, top empresas, filtros avançados.

**Exportação Excel/CSV — LUIS.** Confirmei que **não existe nada hoje** (o único "csv" no
código é o template de importação de logins). A boa notícia: o `xlsx` (SheetJS) já está
no projeto, usado na importação — dá para reusar para gerar.

🔑 Definir quais relatórios o Matheus realmente usa. Exportação genérica costuma virar
recurso morto.

---

## 3.3 Roteirização com ordem otimizada

**Depende da Decisão 1.**

**LUIS — backend.** Serviço que recebe origem + N destinos e devolve a ordem otimizada;
a coluna `ordem` já existe em `notas_fiscais`. Server action para recalcular. Migration
nova para **janela de entrega** (horário em que o cliente aceita receber).

**VÍTOR — tela.** Botão "otimizar rota" no romaneio, reordenação manual arrastando, e a
aba "Por Empresa" pedida no escopo original.

**Esforço:** alto. É o item mais caro da Fase B, em desenvolvimento e em custo recorrente.

---

## 3.4 Módulo financeiro

**Depende da Decisão 2.**

**LUIS — backend.** Migration com tarifa por empresa e custos por veículo; cálculo de
custo/km e custo/hora; indicador de rentabilidade 🟢🟡🔴 por entrega, romaneio e empresa.

💡 **Atalho que vale considerar:** já coletamos GPS do motorista em `motorista_posicao`.
Dá para estimar km rodado a partir disso e **evitar a Distance Matrix paga** — vale medir
a precisão antes de assinar API.

**VÍTOR — tela.** Painel de rentabilidade por empresa e por rota.

---

## 3.5 Web Push para o motorista

**LUIS.** Chaves VAPID, tabela de subscriptions, handler `push` no Service Worker, e
disparo quando um romaneio novo é atribuído. iOS exige PWA instalado (iOS 16.4+) — já é
o caso.

**VÍTOR.** Pedir permissão na hora certa (depois da primeira entrega, não no primeiro
acesso — senão o motorista nega e não volta atrás).

💡 É também a resposta à pressão por "app nas lojas": notificação era o principal motivo
alegado.

---

## 3.6 E-mail resumo para embarcadores

**LUIS.** Provedor (Resend é o mais simples), template, e agendamento — pode reusar o
GitHub Actions que já roda o backup.

🔑 **VÍTOR:** diário ou semanal? E alerta imediato de ocorrência, ou só o resumo?

💡 Hoje o portal do cliente é consulta passiva — o cliente só vê se lembrar de entrar.
E-mail é o que transforma o portal em algo que ele percebe valor todo dia.

---

## 3.7 ⚪ N fotos por canhoto

**LUIS.** Hoje são 2 por tentativa (chegada + canhoto). Generalizar exige tabela
`canhoto_fotos` no lugar das colunas fixas. **Atenção ao peso no IndexedDB** da fila
offline — é o ponto mais sensível do produto.

Só faz sentido se o piloto mostrar que 2 fotos não bastam. **Não antecipe.**

---

# Ordem recomendada

```
FASE 0  Luis: Sentry ─────────────────┐
        Vítor: Android/4G ────────────┤
        UzzAI: NDA ───────────────────┤
        Vítor: CSVs → Luis: logins ───┤
        Vítor: critérios do piloto ───┘
                                       ↓
FASE 1  Piloto (5 dias) + guia + treinamento
                                       ↓
FASE 2  Ajustes → domínio → GO-LIVE MVP A
                                       ↓
FASE 3  🔑 3 decisões do Vítor
        → KPIs → Dashboards/exportação → Roteirização → Financeiro
        → Web Push · E-mail · (N fotos, se o piloto pedir)
```

## Resumo por dono

| | Vítor | Luis | UzzAI |
|---|---|---|---|
| **Fase 0** | Android/4G · CSVs · critérios do piloto | Sentry · carga dos logins | NDA · LGPD |
| **Fase 1** | piloto · guia · treinamento · foto em luz ruim | suporte aos achados | — |
| **Fase 2** | go-live · decisão de domínio | domínio · (E2E) | contrato · DRE |
| **Fase 3** | 3 decisões · todas as telas | todo o backend e dados | custo de API no DRE |

## O que eu posso adiantar sozinho

- Rascunho dos **critérios de sucesso do piloto** (0.4)
- **Guia de 1 página** em PDF para motorista e coordenador (1.2)
- **Rota de política de privacidade** no app, assim que o jurídico entregar o texto (0.6)
- Qualquer item da Fase 3 depois das decisões do 3.0
