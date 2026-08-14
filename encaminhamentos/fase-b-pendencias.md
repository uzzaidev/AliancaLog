# Fase B (MVP Completo) — o que falta

> Revisão de 2026-08-14 da seção "Fase B" do
> [CHECKLIST.md](../docs/governanca/CHECKLIST.md), **conferida contra o código**.
> Índice geral: [README.md](./README.md).

## Achado principal: a Fase B já começou sem ninguém marcar

Os encaminhamentos da reunião de 12/08 **entregaram 3 itens que estavam listados como
Fase B**, sem que o checklist fosse atualizado. O escopo restante é menor do que o
documento sugere:

| Item da Fase B | Situação real |
|---|---|
| Importar XML da NF-e | ✅ **Feito** (`lib/import-nf.ts`) — e agora com `.zip` também (A-003) |
| Fluxo de devolução/reentrega | ✅ **Feito pelo A-007** — a NF não aceita volta ao painel para nova tentativa |
| Múltiplas fotos por canhoto | 🟡 **Metade** — A-010 trouxe 2 fotos (chegada + canhoto); falta frente/verso e avaria |
| Mapa com pontos + posição do motorista | ✅ **Feito** (mapa de destinos/GPS + A-006 ao vivo) |
| Roteirização de verdade (ordem otimizada) | ❌ Não feito |
| KPIs de motorista | ❌ Não feito |
| Financeiro / rentabilidade | ❌ Não feito |
| Dashboards + exportação | ❌ Não feito |
| Web Push | ❌ Não feito |
| E-mail resumo para embarcadores | ❌ Não feito |

> O CHECKLIST ainda diz *"hoje a NF recusada fica 'recusada' para sempre"* na descrição
> do fluxo de devolução. **Isso não é mais verdade** desde a migration `0016`.

---

## Dono: praticamente tudo é do Luis

Pelo [PLAN.md](../docs/governanca/PLAN.md), a Fase B inteira é dele (Dados/BI + GIS/Maps
+ backend). O Vítor entra na **camada visual** de cada item e nas **decisões de produto**
— que, em vários casos, precisam vir **antes** do código.

---

## Luis

### 1. Roteirização de verdade (ordem otimizada de N paradas)
O que já existe: mapa com pontos, "Abrir no Maps" por parada, posição do motorista ao
vivo. O que falta: **calcular a melhor ordem** das paradas (problema TSP/VRP) e permitir
reordenar à mão.

**Decisão de arquitetura ainda aberta** (registrada no PLAN.md § 3):
- **Google Routes API** — pay-per-uso, exige billing com cartão, provavelmente cabe no
  free tier no volume do piloto, mas sem teto previsível conforme cresce.
- **OSRM + VROOM self-hospedado** — sem cobrança por request, custo ~R$20–40/mês de
  servidor, mas vira infra que o time mantém (hoje o stack é só Vercel + Supabase, ambos
  gerenciados).

**Precisa da decisão antes de começar** — é escolha de custo recorrente, então passa
pelo Vítor/PO e provavelmente pelo Matheus.

Subitens: janela de entrega, aba "Por Empresa" (já existe algo parecido no
`empresas-painel.tsx`, agrupando por empresa e cidade — avaliar se atende ou se precisa
de tela própria).

### 2. KPIs de motorista
Total de entregas, taxa de sucesso/problema, tempo médio, ranking, histórico e gráficos.

Hoje existe só o básico: o painel lateral do dashboard mostra progresso (X/Y) por
motorista no dia. Nada de histórico ou comparação.

**Fica bem melhor depois do A-007:** como agora cada tentativa vira um registro em
`canhotos`, dá para medir de verdade "quantas tentativas por entrega" — que é um
indicador que antes o modelo de dados não permitia calcular.

### 3. Financeiro / rentabilidade
Custo por km, custo por hora, tarifa por empresa, rentabilidade por entrega, indicador
🟢🟡🔴. **Nada existe** — nem tabela, nem campo de custo.

**Depende de dado que ainda não temos:** tarifa por empresa, custo dos veículos, custo
por motorista. Isso é levantamento comercial com o Matheus antes de virar schema.

### 4. Dashboards, relatórios e exportação
Gráficos, mapa de calor, top empresas, filtros avançados, **exportação Excel/CSV**.

A exportação é provavelmente o item de maior valor imediato e menor esforço do bloco —
a gerência hoje não tem como tirar nada do sistema para levar a uma reunião. E o
`xlsx` já é dependência do projeto (usado na importação), então dá para reaproveitar.

### 5. Web Push ("chegou romaneio novo")
Android funciona; iOS exige PWA instalado (16.4+). O PLAN.md registra que isso é
**também a resposta à pressão por "app nas lojas"** — vale considerar antes de investir
no empacotamento das lojas, que é bem mais caro.

### 6. E-mail resumo para os embarcadores
Diário/semanal, ou alerta na hora da ocorrência. Hoje o portal é consulta passiva: o
cliente só sabe se entrar e olhar.

Conecta com o Kaizen **K-004** da ata ("portal reduz o volume de perguntas para a
gerência") — o e-mail empurra a informação em vez de esperar o cliente puxar.

### 7. Múltiplas fotos por canhoto (completar)
O A-010 já fez a infra de 2 fotos. Falta generalizar para N fotos (frente/verso do
canhoto, foto de avaria).

**Atenção:** hoje a fila offline carrega os `Blob` de cada foto no IndexedDB. Ir para N
fotos por tentativa mexe direto no ponto mais sensível do produto — vale avaliar o custo
de armazenamento local no celular antes.

---

## Vítor — decisões que travam o Luis

Estes não são itens de código; são respostas que a Fase B precisa para começar:

1. **Roteirização: Google pago ou OSRM self-hospedado?** Custo recorrente vs. infra
   própria. Provavelmente precisa do Matheus na conversa.
2. **Financeiro: levantar os números com o Matheus** — tarifa por empresa, custo/km,
   custo/hora. Sem isso o módulo não tem o que calcular.
3. **Priorizar o bloco.** Minha leitura: **exportação** primeiro (barato, valor
   imediato), depois **KPIs de motorista** (dado já existe e ficou mais rico com o
   A-007), e **financeiro por último** (depende de levantamento externo).
4. **Web Push antes das lojas?** Se a pressão por "app nas lojas" for por causa de
   notificação, o Push resolve por uma fração do custo — vale confirmar com o cliente
   qual é a dor real.

---

## Fase C — só visão, nada a fazer agora

Comprovante de Entrega Eletrônico oficial na SEFAZ (Ajuste SINIEF 38/21). Continua como
argumento comercial de recorrência: *"hoje digitalizamos seu canhoto; amanhã eliminamos
o papel"*. Sem trabalho técnico previsto.

## Lojas de app — Pedro Vitor, dimensionamento pendente

Continua sem sprint dedicado. O PLAN.md registra que era **explicitamente fora de
escopo** no contrato original (R01 dizia "PWA resolve"). Precisa ser dimensionado antes
de virar promessa ao cliente — e ver o item de Web Push acima, que pode resolver a dor
por trás do pedido.
