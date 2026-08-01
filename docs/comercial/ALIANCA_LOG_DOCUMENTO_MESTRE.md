# ALIANÇA LOG — Documento Mestre do Produto
**Cliente:** Rotta Logística — Matheus Rotta  
**Desenvolvedor:** UzzAI — Vítor Pirolli  
**Versão:** MVP Completo (Proposta B)  
**Data:** Junho 2026

---

## 1. CONTEXTO DO NEGÓCIO

### Quem é a Rotta Logística
Empresa de logística de última milha sediada na Serra Gaúcha (Caxias do Sul, Gramado, Canela, Bento Gonçalves e região). Opera com **2.000+ entregas/mês**, **16 entregadores**, **9 veículos** e atende **~20 empresas embarcadoras**.

### Problema central
Toda a operação roda de forma manual: canhotos físicos, planilhas Excel e WhatsApp. Quando um canhoto se perde, não existe comprovante. Quando um cliente quer saber o status, precisa ligar. A gerência só descobre o que aconteceu quando o motorista volta ao escritório.

**Prioridade inegociável declarada pelo cliente:**
> "Controle dos canhotos em tempo real." — Matheus Rotta

### O que o sistema resolve
Digitaliza o ciclo completo do canhoto: desde a montagem do romaneio na saída do caminhão até o comprovante de entrega visível pelo cliente final, tudo em tempo real.

---

## 2. ARQUITETURA DO PRODUTO

### Plataforma
- **Web responsiva** — acessa pelo celular e pelo computador, sem instalar nada
- **PWA (Progressive Web App)** recomendado para permitir instalação na tela inicial do celular
- **Offline-first** — o motorista continua operando sem sinal e o sistema sincroniza quando a conexão volta

### Stack técnico sugerido (baseado no escopo técnico R01)
- **Frontend:** Next.js + React + Tailwind CSS
- **Backend/BaaS:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Segurança:** Row Level Security (RLS) no Supabase — cada perfil só vê o que é seu
- **Armazenamento de fotos:** Supabase Storage
- **Tempo real:** Supabase Realtime (WebSockets)
- **Offline:** Service Worker + IndexedDB para fila de sincronização
- **Scanner de código de barras:** API de câmera do navegador (BarcodeDetector API / biblioteca ZXing/QuaggaJS)
- **Mapas/Roteirização (Proposta B):** Google Maps API (Directions + Distance Matrix)
- **Hospedagem:** Vercel ou Railway

---

## 3. PERFIS DE ACESSO

O sistema tem **três perfis** com autenticação separada e visões distintas. O que o motorista registra em campo aparece instantaneamente para a gerência e para o cliente.

| Perfil | Quem usa | Dispositivo principal |
|--------|----------|----------------------|
| **Gerência** | Matheus e coordenadores | Desktop / tablet |
| **Motorista** | 16 entregadores | Celular |
| **Cliente Final** | ~20 empresas embarcadoras | Desktop / celular |

---

## 4. FLUXO CENTRAL — O ROMANEIO DIGITAL

Este é o coração do sistema. O romaneio substitui o processo manual de separar canhotos físicos e entregar ao motorista.

### 4.1 Criação do Romaneio — via Câmera (fluxo principal)

**Quem executa:** A pessoa que está carregando o caminhão (Matheus ou responsável pela expedição)

**Fluxo:**
1. Abre o app → tela "Novo Romaneio"
2. Seleciona o **motorista** que vai sair com o caminhão
3. Seleciona a **data** (padrão: hoje)
4. Toca em **"Bipar NF"** → câmera do celular abre
5. Aponta para o código de barras da nota fiscal → NF é lida e adicionada à lista automaticamente
6. Repete para cada NF do caminhão
7. Toca em **"Fechar e enviar"** → romaneio criado e enviado ao motorista
8. Motorista recebe notificação no app dele

**Alternativa (backup):** digitação manual do número da NF caso o código de barras esteja ilegível.

**Alternativa futura:** scanner Bluetooth (HID) conectado ao celular — o número da NF cai direto no campo de input.

### 4.2 O que o motorista vê no romaneio

Para cada NF listada, o motorista vê **apenas**:
- Número da NF
- Nome do cliente/destinatário
- Endereço de entrega

> ⚠️ **NÃO mostrar itens/produtos** — o motorista já tem a NF física em mãos com essa informação. Redundante e poluente na tela.

### 4.3 Ciclo de status de cada NF

```
[Pendente] → [Em rota] → [Aceito / Entregue]
                       → [Retido]
                       → [Recusado]
                       → [Ocorrência]
```

**Definições:**
- **Aceito / Entregue:** Canhoto fotografado, entrega confirmada pelo destinatário
- **Retido:** Cliente recebeu as mercadorias mas tem ressalvas (assinou com protesto)
- **Recusado:** Cliente não aceitou a entrega — NF volta para a empresa
- **Ocorrência:** Problema na entrega: faltou item / endereço não encontrado / cliente ausente / avaria

### 4.4 Confirmação pelo motorista (saída)

Antes de sair, o motorista **confirma o recebimento do romaneio** no app — cria responsabilidade formal e registra o horário de início da rota.

### 4.5 Registro de entrega em campo

Para cada parada:
1. Motorista abre a NF na lista
2. *(Proposta B)* Toca em "Navegar" → abre Google Maps com o endereço
3. Realiza a entrega
4. Toca em **"Registrar entrega"**
5. Tira foto do canhoto assinado pela câmera
6. Seleciona o status: Aceito / Retido / Recusado
7. Se houver problema: adiciona uma ocorrência com tipo e observação
8. Confirma — dados sobem para o servidor (ou ficam na fila offline)

**Offline:** Se não houver sinal, a ação é salva localmente (IndexedDB) e sincroniza automaticamente quando o sinal volta. O motorista não percebe a diferença.

### 4.6 Fechamento do romaneio

Quando o motorista volta:
1. Toca em **"Fechar romaneio"**
2. Sistema exibe resumo: X de Y NFs entregues, Z com ocorrência, N recusadas
3. Motorista confirma
4. Romaneio fica arquivado com histórico completo

---

## 5. FUNCIONALIDADES POR PERFIL

### 5.1 PERFIL GERÊNCIA

#### Painel principal (Dashboard)
- Visão geral do dia: total de NFs, % entregues, em rota, com ocorrência
- Lista de todos os romaneios ativos com status em tempo real
- Alerta visual para NFs com ocorrência ou recusadas
- Filtro por motorista, cliente, data, status

#### Criação de romaneios
- Tela de novo romaneio com seleção de motorista e bipagem via câmera
- Visualização das NFs bipadas antes de fechar
- Edição do romaneio antes de enviar (adicionar/remover NFs)

#### Acompanhamento em tempo real
- Ver posição de cada NF (qual motorista, qual status, quando foi atualizado)
- Ver foto do canhoto assim que o motorista enviar
- Linha do tempo de cada NF: quando foi criada, quando saiu, quando foi entregue

#### Gestão de motoristas
- Cadastro de motoristas (nome, celular, CNH)
- Histórico de romaneios por motorista
- *(Proposta B)* KPIs de desempenho

#### Gestão de clientes/embarcadores
- Cadastro das ~20 empresas clientes
- Histórico de entregas por empresa

#### *(Proposta B)* Controle financeiro
- Cadastro de custos: valor por km, por hora, tarifa por entrega
- Cálculo automático de rentabilidade por romaneio/motorista
- Relatório: qual entrega/rota foi mais lucrativa

#### *(Proposta B)* Dashboards e relatórios
- Gráficos de volume por período
- Taxa de sucesso por motorista
- Exportação de relatório em Excel (.xlsx)

---

### 5.2 PERFIL MOTORISTA

#### Tela inicial
- Lista de romaneios do dia (normalmente 1, pode ter mais)
- Status de cada romaneio: aguardando confirmação / em andamento / finalizado

#### Dentro do romaneio
- Lista de NFs ordenadas *(Proposta B: por rota otimizada)*
- Cada item mostra: número da NF + cliente + endereço
- Indicador de progresso: X de Y entregas feitas
- *(Proposta B)* Botão "Navegar" → abre Google Maps com rota até o endereço

#### Registro de cada entrega
- Botão de câmera para foto do canhoto
- Seleção de status (botões grandes, fáceis de tocar)
- Campo de ocorrência (dropdown de tipos + observação livre)

#### Funcionamento offline
- Todas as ações ficam salvas localmente
- Indicador visual de "modo offline" / "sincronizando"
- Sync automático quando sinal volta

---

### 5.3 PERFIL CLIENTE FINAL (Portal do Embarcador)

#### Visão das entregas
- Lista de todas as NFs da empresa, filtrada automaticamente por RLS
- Filtros: por status, por data, por número de NF
- Status em tempo real de cada NF

#### Comprovante de entrega
- Acesso direto à foto do canhoto assim que registrado
- Timestamp de quando foi entregue e por qual motorista

---

## 6. MODELO DE DADOS (Entidades principais)

```
users
  id, email, name, role (gerencia | motorista | cliente), client_company_id

companies (embarcadores)
  id, name, cnpj, contact_name, contact_email

drivers (motoristas)
  id, user_id, name, phone, license_number, vehicle_id

vehicles
  id, plate, model, capacity

delivery_lists (romaneios)
  id, date, driver_id, vehicle_id, created_by, status (draft | active | closed)
  confirmed_at, closed_at

delivery_items (NFs no romaneio)
  id, delivery_list_id, nf_number, company_id, recipient_name
  address, city, status (pending | in_route | accepted | retained | refused | occurrence)
  photo_url, delivered_at, notes

occurrences
  id, delivery_item_id, type (missing_item | address_not_found | customer_absent | damage | other)
  description, created_at

(Proposta B)
financial_configs
  id, cost_per_km, cost_per_hour, base_fee_per_delivery

driver_kpis (view/materialized)
  driver_id, period, total_deliveries, success_rate, avg_time_per_stop
```

---

## 7. REGRAS DE NEGÓCIO CRÍTICAS

1. **RLS obrigatório:** Um motorista só vê seus próprios romaneios. Um cliente só vê as NFs da sua empresa. Um gerente vê tudo.
2. **Foto obrigatória para "Aceito":** Não é possível marcar uma NF como aceita sem anexar foto do canhoto.
3. **NF recusada não fecha o romaneio:** NFs recusadas são listadas no fechamento e ficam pendentes para retorno.
4. **Offline-first:** Toda ação do motorista deve funcionar sem conexão. A UI deve indicar claramente o estado de sync.
5. **Imutabilidade do canhoto:** Uma vez que a foto do canhoto é enviada e o status confirmado, não pode ser editado — apenas ocorrências podem ser adicionadas.
6. **Romaneio só fecha com todas as NFs resolvidas:** Todas as NFs precisam ter status final (Aceito / Retido / Recusado) para fechar o romaneio.

---

## 8. SCANNER DE CÓDIGO DE BARRAS — IMPLEMENTAÇÃO

### Opção 1 — Câmera do celular (MVP, zero hardware extra)
- Biblioteca: **@zxing/library** (ZXing para JavaScript) ou **QuaggaJS**
- Funciona direto no browser, sem instalação de app nativo
- Suporta Code 128, Code 39, EAN-13 (formatos usados em NFs brasileiras)
- UX: botão "Bipar NF" → abre câmera → lê código → NF adicionada automaticamente

### Opção 2 — Scanner Bluetooth (HID) — futura
- Scanner Bluetooth barato (~R$150–300) emparelha como teclado
- Quando bipa, envia os dígitos como se fossem digitados no campo focado
- Zero código extra necessário — o campo de input do app já recebe o input
- Bom para volume alto de bipagem (50+ NFs por romaneio)

---

## 9. CRONOGRAMA MVP COMPLETO (Proposta B)

### Fase 1 — MVP Enxuto (3–4 semanas) — Proposta A
| Semana | Entregável |
|--------|-----------|
| 1 | Autenticação dos 3 perfis, schema do banco, RLS |
| 2 | Criação de romaneio via câmera, lista do motorista |
| 3 | Foto do canhoto, status, offline sync |
| 4 | Portal do cliente, painel da gerência, piloto |

### Fase 2 — MVP Completo (+ 2–3 meses após fase 1 validada)
| Bloco | Entregáveis |
|-------|------------|
| Roteirização | Google Maps Directions API, ordem automática de paradas |
| Financeiro | Cadastro de custos, cálculo de rentabilidade |
| KPIs | Dashboard de desempenho por motorista |
| Relatórios | Gráficos, exportação Excel |

---

## 10. INVESTIMENTO

| Modalidade | Desenvolvimento | Mensalidade |
|-----------|----------------|-------------|
| **Proposta A** (Fase 1) — Compra | R$ 10.000 | R$ 300/mês |
| **Proposta A** — Só Recorrência | Sinal R$ 1.800 | R$ 600/mês |
| **Proposta B** (Completo) — Compra | R$ 25.000 | R$ 500/mês |
| **Proposta B** — Só Recorrência | Sinal R$ 4.500 | R$ 1.500/mês |

**Pagamento Proposta B (compra):** 40% início + 30% intermediário + 30% entrega  
**Prazo mínimo de permanência (recorrência):** a definir em contrato

---

## 11. O QUE ESTÁ FORA DE ESCOPO (ambas as propostas)

- Emissão de Nota Fiscal / CT-e
- Integração com ERP/sistemas financeiros externos
- Rastreamento GPS do veículo em tempo real (diferente de roteirização)
- App nativo iOS/Android (o PWA web responsivo cobre o caso de uso)

---

## 12. DECISÕES DE PRODUTO JÁ VALIDADAS COM O CLIENTE

| Decisão | Fonte |
|---------|-------|
| Criação de romaneio via câmera (não Excel) | Áudio Matheus, Jun/2026 |
| Não exibir itens/produtos para o motorista | Áudio Matheus, Jun/2026 |
| Funcionalidade offline é inegociável | Escopo técnico R01 |
| Portal do cliente final é prioridade | Escopo técnico R01 |
| Emissão de NF/CT-e fora de escopo | Consenso discovery |
| Rastreamento GPS do veículo fora de escopo | Escopo técnico R01 |

---

## 13. PRÓXIMOS PASSOS (comercial)

1. **Matheus escolhe** Proposta B + modalidade (compra ou recorrência)
2. **Envio das planilhas reais** das empresas clientes para mapear estrutura de dados
3. **Lista de motoristas** (16) e empresas (20) para seed inicial do banco
4. **Assinatura do contrato** + sinal
5. **Kickoff Semana 1** — início imediato da Fase 1

---

*Documento gerado por UzzAI — Vítor Pirolli | Junho 2026*  
*Para usar no planejamento técnico com Claude Code*
