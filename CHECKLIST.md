# Checklist — Aliança Log (até o app 100%)

> **Fonte de verdade do progresso.** Marque `[x]` ao concluir cada item.
> Plano completo (com detalhe de cada papel): [PLAN.md](./PLAN.md) · Estado atual: [CHECKPOINT.md](./CHECKPOINT.md).
> Regra: um item só é marcado quando **funciona e foi verificado** (build/teste/uso real).
> Cada sprint mostra o **responsável principal**; itens específicos têm a tag `→ Pessoa` quando relevante.

## Sprint 0 — Fundação ✅
**Responsável:** Luis (infra/backend) + Vítor (frontend/UI base)
- [x] Scaffold Next.js 16 + React 19 + TypeScript + Tailwind v4
- [x] Estrutura de pastas (app / components / lib / supabase / scripts)
- [x] Design system base (tokens de cor, Button/Card/Badge/Field/Input, logo, app-shell) `→ Vítor`
- [x] Clientes Supabase: browser / server / proxy / admin (`@supabase/ssr`) `→ Luis`
- [x] Auth 3 perfis: login (Server Action), logout, DAL (checagem segura) `→ Luis`
- [x] Proxy de roteamento por role (`proxy.ts`) + proteção de área `→ Luis`
- [x] Schema SQL (romaneios → NFs → canhotos → ocorrências) + índices + trigger updated_at `→ Luis`
- [x] RLS completo (gerência / motorista / cliente) via claims do JWT `→ Luis`
- [x] Storage: bucket privado `canhotos` + policies `→ Luis`
- [x] Seed fictício (`scripts/seed.mjs`): empresas, motoristas, romaneio do dia, logins
- [x] PWA manifest (instalável)
- [x] README com setup
- [x] Build + typecheck + lint verdes; dev server servindo login
- [ ] Projeto Supabase real criado (sa-east-1) + `.env.local` preenchido ⟵ **ação do Vítor/cliente**
- [ ] Migrations aplicadas no projeto real (`supabase db push`) `→ Luis`
- [ ] Seed rodado e login testado de verdade (3 perfis)
- [ ] Push para o GitHub (`uzzaidev/AliancaLog`) + deploy na Vercel (URL de staging no ar) `→ Luis`

## Sprint 1 — Gerência + ingestão
**Responsável:** Vítor (telas e fluxo) + Luis (consultas/RLS por trás)
> Implementado e compilando. Verificação em runtime contra Supabase real ainda pendente.
- [x] Layout/navegação da área de gerência
- [x] Dashboard: contadores do dia (Total/Aceitas/Recusadas/Retidas/Ocorrência/Em aberto)
- [x] Dashboard: lista de NFs (NF · empresa · motorista · endereço · status · horário)
- [x] Dashboard: filtros (status, motorista, empresa) + atualização em tempo real
- [x] Importar Excel: upload `.xlsx`/`.csv`
- [x] Importar Excel: parser + preview + **mapeamento configurável de colunas**
- [x] Importar Excel: atribuição de motorista + confirmação cria as NFs do dia
- [x] Romaneio por câmera: criar romaneio (motorista + veículo)
- [x] Romaneio por câmera: bipar NF (`BarcodeDetector` + fallback `@zxing/library`)
- [x] Romaneio por câmera: casar nº bipado com NF importada + fallback manual
- [x] Cadastros: motoristas (cria login + app_metadata)
- [x] Cadastros: empresas clientes (cria login do portal)
- [x] Cadastros: veículos
- [ ] Verificação runtime com Supabase real (import, realtime, RLS, câmera no celular)
- [ ] Deploy + revisão com o cliente

## Sprint 2 — Motorista + Offline
**Responsável:** Vítor (telas) + Luis (offline/sync — papel dele com maior peso na divisão de %)
> Implementado e compilando. Falta validar em runtime com Supabase real (e câmera/offline no celular).
- [x] Lista de romaneios do dia + confirmação de recebimento (→ `em_rota`)
- [x] Tela do romaneio: NFs (nº + destinatário + endereço), progresso, busca
- [x] Registrar canhoto: câmera (`<input capture>`) → preview/refazer
- [x] Registrar canhoto: compressão de imagem (canvas, ~200KB) + upload ao Storage (`/api/sync`)
- [x] Registrar canhoto: 4 status (botões grandes) + ocorrência (tipo + texto obrigatório)
- [x] Regra: foto obrigatória para "Aceita"
- [x] Offline: Service Worker (hand-rolled `public/sw.js`) + cache do app shell
- [x] Offline: fila de canhotos no IndexedDB (foto como blob) + sync idempotente
- [x] Offline: sincronização → `POST /api/sync` idempotente (`client_id`) ao voltar a conexão
- [x] Offline: banner "N aguardando sincronização"
- [ ] Cache offline da LISTA do dia (leitura offline cold-open) — refinamento `→ Luis`
- [ ] Imutabilidade forte do canhoto (bloquear re-registro) — refinamento `→ Luis`
- [ ] Teste em modo avião → aparece no dashboard ao voltar o sinal (runtime)
- [ ] Deploy + teste no celular (câmera exige HTTPS)

## Sprint 3 — Realtime + Portal + fechamento
**Responsável:** Vítor (portal cliente + modal) + Luis (Realtime/Supabase)
- [ ] Supabase Realtime: dashboard atualiza < 3s sem refresh `→ Luis`
- [ ] Modal de canhoto: foto em alta + detalhes + timeline da NF `→ Vítor`
- [ ] Fechamento de romaneio: resumo (X/Y entregues, ocorrências, recusadas) + arquivar `→ Vítor`
- [ ] Regra: romaneio só fecha com todas as NFs resolvidas; recusada não bloqueia
- [ ] Portal cliente: lista de NFs da empresa (RLS) `→ Vítor` + `→ Luis`
- [ ] Portal cliente: filtros (status, período, NF/cidade) + status realtime `→ Vítor`
- [ ] Portal cliente: comprovante (foto via URL assinada + horário + motorista) `→ Luis`
- [ ] Deploy + revisão ponta-a-ponta

## Sprint 4 — Piloto & Go-Live (MVP A)
- [ ] Testes E2E (Playwright) do caminho crítico — **sem responsável definido** ⚠️ (ver gap de QA no PLAN.md)
- [ ] Importar Excel reais das empresas `→ Vítor` (comercial, junto com Matheus)
- [ ] Criar logins reais (16 motoristas + ~20 empresas) `→ Luis`
- [ ] Piloto com 2–3 motoristas (primeira entrega real registrada) `→ Vítor` (CS/treinamento)
- [ ] Ajustes pós-piloto
- [ ] Material de apoio (guia 1 página) + treinamento do coordenador `→ Operação`
- [ ] Go-live: 100% dos motoristas + clientes com acesso
- [ ] Domínio + SSL configurados `→ Luis`

## Fase B — MVP Completo
**Responsável:** Luis (Dados/BI + GIS/Maps é papel dele na divisão de %)
- [ ] Roteirização (Directions API): ordem otimizada, "Abrir no Maps", reordenar, janela de entrega, aba "Por Empresa"
- [ ] KPIs de motorista (total, taxa sucesso/problema, tempo médio, ranking, histórico, gráficos)
- [ ] Financeiro (custo/km, custo/hora, tarifa por empresa, rentabilidade, indicador 🟢🟡🔴, Distance Matrix)
- [ ] Dashboards/relatórios (gráficos, mapa de calor, top empresas, filtros avançados, exportação Excel/CSV)

## Lojas de app (App Store / Google Play) — escopo novo
**Responsável:** Pedro Vitor
- [ ] Decidir abordagem técnica (Capacitor/TWA sobre o PWA existente, ou app nativo separado)
- [ ] Conta de desenvolvedor Apple (US$99/ano) e Google Play (US$25 único)
- [ ] Empacotamento e ícones/assets das lojas
- [ ] Submissão e processo de revisão
- [ ] Processo de atualização contínua (toda mudança no PWA precisa de novo build nas lojas?)

## Governança e negócio (não-técnico)
**Responsável:** UzzAI Empresa (jurídico + financeiro)
- [ ] Contrato de desenvolvimento assinado (escopo, cronograma, pagamento, IP, confidencialidade, SLA, rescisão)
- [ ] NDA assinado antes de receber dados reais do cliente
- [ ] Política de privacidade e termos de uso publicados (LGPD — fotos de canhoto, dados de motoristas/clientes)
- [ ] DRE do projeto revisado (margem, impostos, custo de API)
- [ ] Definição de prazo mínimo de contrato (crítico na modalidade só-recorrência)

## Definition of Done (transversal — checar antes de cada go-live)
- [ ] Cada role loga, é redirecionado e **não acessa** área de outro role
- [ ] Motorista não vê entrega de outro motorista (RLS)
- [ ] Cliente não vê NF de outra empresa (RLS)
- [ ] Offline funciona em modo avião e sincroniza ao voltar
- [ ] Realtime registro → gerência < 3s
- [ ] Carga inicial < 3s em 4G · upload de foto < 5s · roda em Android 9+/2GB
- [ ] Tudo HTTPS · fotos só por URL assinada (não indexável) · sem dado sensível em localStorage
