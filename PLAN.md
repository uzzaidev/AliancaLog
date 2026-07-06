# Plano — Aliança Log

> **Fonte de verdade do produto e do time.** Define O QUE construímos, COMO e QUEM faz o quê.
> Progresso marcável: [CHECKLIST.md](./CHECKLIST.md) · Estado atual: [CHECKPOINT.md](./CHECKPOINT.md) ·
> Detalhe bruto: [docs/](./docs/) (escopo técnico R01, documento mestre, planilha de percentuais).

**Cliente:** Rotta Logística (Matheus Rotta) · **Dev:** UzzAI

---

## 1. Contexto

A Rotta opera last-mile na Serra Gaúcha (2.000+ entregas/mês, 16 motoristas, 9 veículos, ~20 empresas embarcadoras) de forma manual: canhoto físico, planilha e WhatsApp. Inegociável do cliente: **"controle dos canhotos em tempo real"**.

O Aliança Log digitaliza o ciclo completo do canhoto — da montagem do romaneio ao comprovante visível pelo cliente final, em tempo real — num **app web responsivo (PWA, offline-first)** com 3 perfis (gerência, motorista, cliente final).

---

## 2. Time e responsabilidades

> Percentuais e valores em R$: [docs/ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx](./docs/ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx).

### Vítor Pirolli — Comercial/Account + Frontend/Produto/PO + Gestão/PM
**É o Product Owner do projeto.** Responsável por:
- Negociação e relacionamento com o cliente (Matheus/Rotta)
- Todo o **frontend**: telas de gerência, motorista e cliente (Next.js/PWA)
- Backlog, regras de negócio e critérios de aceite — decide o que é construído e em que ordem
- Cronograma, sprints, status semanal, riscos e cobrança de decisões (papel que antes seria do Igui, agora absorvido aqui)
- Treinamento de coordenadores/motoristas/clientes e guia de uso (com apoio da Operação)

### Luis Fernando Boff — Backend/Infra + PWA Offline + DevOps + Dados/BI + GIS/Maps
Responsável por:
- **Supabase**: schema, RLS, Auth, APIs, Storage, Realtime
- **Offline-first**: Service Worker, IndexedDB, fila de canhotos e sincronização — a parte mais crítica do produto, já que sinal fraco na Serra é o problema central que o cliente quer resolver
- Deploy, ambientes (staging/produção) e monitoramento
- **Fase B** completa: roteirização (Google Maps), KPIs de motoristas, módulo financeiro/rentabilidade, dashboards e exportações

### Pedro Vitor Pagliarin — App Store / Google Play
Responsável por publicar e manter o app nas lojas (Apple App Store / Google Play): empacotamento, conta de desenvolvedor, submissão, revisão e atualizações.

> ⚠️ **Escopo novo, não estava no plano técnico original.** O escopo técnico R01 definia explicitamente "app nativo fora de escopo — PWA resolve a necessidade". Publicar nas lojas é trabalho real adicional (empacotar via Capacitor/TWA ou nativo, conta de desenvolvedor, processo de revisão das lojas) que ainda não tem sprint dedicado no [CHECKLIST.md](./CHECKLIST.md). Precisa ser dimensionado antes do go-live se for prioridade.

### Operação (Vítor + Operação) — CS/Treinamento + Suporte Técnico
Treina coordenadores, motoristas e clientes; cria o guia de uso; ativa os logins; atende dúvidas e pequenos ajustes pós-go-live.

### UzzAI Empresa — Institucional (jurídico, financeiro e reserva)
Caixa, operação, marca, administração, equity do CEO. Inclui o que antes eram papéis dedicados (Lucas/Brandon no jurídico, Corcho no financeiro) — tratados agora como funções de apoio da empresa, não percentual deste projeto específico:
- **Jurídico**: contrato de desenvolvimento, NDA, SLA, propriedade do código (IP), prazo mínimo, rescisão, LGPD
- **Financeiro**: impostos, margem, DRE do projeto, custo de API, inadimplência

### ⚠️ Gap em aberto — QA/Testes
A função **Arquitetura/QA** (code review, testes E2E, critérios de aceite, segurança) não está em uso no momento — Pedro Vitor, que a ocupava, migrou para App Store/Google Play. **Não há, hoje, um responsável formal por revisar código e testar antes do go-live.** Isso é um risco real para qualidade e segurança (ver `docs/` aba Riscos da planilha original, risco R-008: cliente final visualizar dados de outra empresa). Decidir: alguém acumula esse papel, ou ele fica sem dono mesmo (e os testes ficam só a cargo de quem implementa)?

---

## 3. Stack técnico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind v4 + React 19 |
| Backend | Next.js API Routes / Server Actions (serverless na Vercel) |
| Banco / Auth / Realtime / Storage | Supabase (PostgreSQL + RLS + Auth JWT + Realtime + Storage), região `sa-east-1` |
| Offline | Service Worker próprio + IndexedDB (fila idempotente) |
| Scanner | `BarcodeDetector` nativo + fallback `@zxing/library` |
| Mapas (Fase B) | Google Maps Directions + Distance Matrix API |
| Hospedagem / CI | Vercel (auto-deploy via GitHub) |

**Nota Next.js 16:** o antigo `middleware.ts` agora se chama **Proxy** (`proxy.ts` na raiz) — mesma função, nome novo.

---

## 4. Arquitetura essencial

- **3 perfis com auth separada** (Supabase Auth, roles `gerencia | motorista | cliente_final`). Proxy protege rotas por role.
- **Segurança = RLS no banco**, não só no frontend: motorista só o seu, cliente só sua empresa, gerência tudo.
- **Tempo real** via Supabase Realtime: registro do motorista → dashboard atualiza em < 3s.
- **Offline-first**: fila no IndexedDB com `client_id` idempotente → sincroniza com `/api/sync` ao voltar a conexão.
- **Ingestão dupla**: Excel (dados ricos da NF) + câmera (monta o romaneio bipando, casa com o que foi importado).

Modelo de dados, RLS e regras de negócio completos em [docs/ALIANCA-LOG-ESCOPO-TECNICO-R01.pdf](./docs/) e nas migrations em `supabase/migrations/`.

---

## 5. Fases

| Fase | Conteúdo | Dono técnico principal |
|---|---|---|
| **MVP A** (Sprints 0–4) | Auth, dashboard gerência, import Excel, romaneio por câmera, app motorista offline, realtime, portal cliente, piloto e go-live | Vítor (frontend) + Luis (backend/offline) |
| **Fase B** | Roteirização, KPIs de motoristas, financeiro/rentabilidade, dashboards avançados + import XML NF-e, fluxo de devolução, Web Push, e-mail p/ embarcadores | Luis |
| **Fase C** (visão) | Comprovante de Entrega Eletrônico oficial (CE-e/SEFAZ, Ajuste SINIEF 38/21): assinatura na tela + validade fiscal, elimina o papel | a definir |
| **Lojas de app** | Publicação iOS/Android | Pedro Vitor |

Passo a passo detalhado, com status atual de cada item: [CHECKLIST.md](./CHECKLIST.md).

---

## 6. Pré-requisitos do cliente & riscos

**Matheus precisa fornecer:** 2–3 Excel reais das empresas, lista dos 16 motoristas (nome+e-mail), lista das ~20 empresas (nome+e-mail).

**Riscos principais:** ver aba `Riscos` da planilha original em `docs/`. Os mais críticos: sync offline falhar em região de sinal fraco (mitigado pela fila idempotente já implementada), cliente final ver dado de outra empresa (mitigado por RLS, mas precisa de QA — ver gap acima), contrato sem prazo mínimo/IP definido (UzzAI Empresa/jurídico).

---

## 7. Revisão de produto (jul/2026) — decisões incorporadas

Revisão completa do plano contra pesquisa de mercado (líderes ePOD: Track-POD, Detrack, Onfleet) e
legislação brasileira (NF-e/DANFE, canhoto eletrônico). Conclusão: **a receita do produto está certa** —
foto + status + offline + realtime + portal é exatamente o núcleo dos líderes do setor. Ajustes feitos:

| Achado | Ação | Status |
|---|---|---|
| Código de barras do DANFE é a **chave de acesso (44 díg.)**, não o nº da NF — a bipagem nunca casaria | Parser `lib/nfe.ts` (DV módulo 11 + extração do nNF) + coluna `chave_acesso` (migration 0005) + match por chave e número | ✅ corrigido |
| Foto 800px pode deixar assinatura ilegível no zoom | Compressão 1280px @ 0.8 (~300–400KB); validar com canhotos reais no piloto | ✅ ajustado |
| ePOD padrão de mercado inclui carimbo de GPS | Coleta pontual best-effort no registro + link no comprovante (não é rastreamento contínuo — escopo respeitado) | ✅ implementado |
| Excel heterogêneo é frágil; **XML da NF-e é formato nacional único** e a transportadora já o recebe | "Importar XML" vira caminho preferido na Fase B; Excel permanece como fallback | 📋 Fase B |
| NF recusada fica "recusada" para sempre — falta o retorno/devolução | Fluxo de devolução/reentrega na Fase B | 📋 Fase B |
| "Motorista recebe notificação" prometida no doc mestre, sem implementação | Web Push na Fase B (Android ok; iOS 16.4+ com PWA instalado) | 📋 Fase B |
| Existe moldura legal p/ substituir o canhoto físico (CE-e, Ajuste SINIEF 38/21) | Fase C como visão/argumento de recorrência | 📋 Fase C |

Detalhe operacional (smoke test RLS, Sentry, backup, critérios do piloto): seção **Pré-piloto** do [CHECKLIST.md](./CHECKLIST.md).
