# 19 — Estado Atual e Histórico

> **Este arquivo é um resumo, não a fonte de verdade.** O diário de sessão completo e vivo é
> [docs/governanca/CHECKPOINT.md](../../docs/governanca/CHECKPOINT.md) (atualizado a cada sessão de
> trabalho pelo time) — leia lá para o detalhe narrativo de cada mudança. Aqui só a linha do tempo em
> alto nível + o que está diferente desde a última leitura desse arquivo, para orientação rápida.

## Onde o projeto está, em uma frase

**Todo o código do MVP A está escrito e passa em `typecheck`/`lint`/`build` + 21/21 testes de segurança.** O que falta para consolidar o piloto não é feature nova — é validação real continuada com o motorista/cliente no celular, e fechar os gaps de infraestrutura já mapeados (CI de qualidade, offline-first completo).

## Linha do tempo por sprint (resumida — narrativa completa no CHECKPOINT.md)

| Sprint | Período | Entregou |
|---|---|---|
| 0 — Fundação | até 2026-07-03 | App base, 3 perfis, auth, schema inicial, seed |
| 1 — Gerência + ingestão | 2026-07-03 a 07-06 | Dashboard, importar Excel, romaneio por câmera, cadastros |
| 2 — Motorista + offline | 2026-07-03 a 07-06 | Entregas do dia, canhoto, fila IndexedDB, Service Worker |
| 3 — Realtime + Portal | 2026-07-03 | Comprovante compartilhado, fechamento de romaneio, portal do cliente |
| 3.5 — Segurança/confiabilidade | 2026-07-13 | Fuso de SP, sync idempotente, imutabilidade + RLS restrita, primeira suíte de smoke test (8/8) |
| — | 2026-07-13 (mesmo dia) | `'retida'` vira ocorrência; foto obrigatória sempre; importação por XML/PDF; painel por cliente |
| — | 2026-07-06 | Supabase real conectado; bug crítico de upload corrigido (upsert exigia UPDATE que não existia) |
| — | 2026-08-01 | Organização de `docs/`; auditoria de cor/emoji hardcoded; nav mobile da gerência; mapa de entregas (geocodificação Nominatim); histórico do motorista |
| — | 2026-08-14 | Encaminhamentos da reunião de 12/08: filtro de data corrigido (A-001), troca de motorista (A-005), exclusão em lote (A-004), **A-007 — a mudança mais consequente do produto até aqui**: NF não aceita volta ao painel para nova tentativa (migration 0016), rastreamento GPS ao vivo (A-006), foto de chegada obrigatória (A-010); QA por code review encontrou e corrigiu 11 problemas |
| — | 2026-08-20 | Fluxo de duplicatas na importação corrigido; banco zerado para rodada limpa de testes; `DATABASE_URL` quebrou (bloqueio ainda sem solução permanente nesta data) |
| — | 2026-08-27/28 | Testes reais no celular acharam 2 bugs de RLS em produção (ocorrência não sincronizava) — corrigidos migrations 0020/0021; refinamento do A-007 (0022 — NF mostra o desfecho real, não sempre "pendente"); bug de fuso horário (hidratação React #418) corrigido centralizando formatação de data/hora em `lib/date.ts` |

## Sessão de 2026-08-28 (esta sessão — o que gerou este checkpoint)

1. **Incidente de infraestrutura:** desinstalação do OneDrive enquanto o projeto rodava de dentro dele partiu o repositório (inclusive o `.git`) entre dois caminhos. Nada foi perdido — consolidado com robocopy, `git fsck` limpo, `npm ci` + `typecheck`/`lint`/`build`/`test:security` revalidados do zero. Projeto agora vive em `C:\Users\USER\Desktop\UZZ. AI\AliancaLog`, fora de qualquer pasta sincronizada.
2. **Revisão completa da suíte de segurança** (`scripts/smoke-seguranca.mjs`): reescrita para autenticar como cada role de verdade em vez de usar a service role key para simular (achado: o teste antigo não discriminava RLS quebrado de consulta quebrada); adicionados os 4 testes T9 (isolamento entre empresas, risco R-008, nunca testado antes); adicionado `try/finally` para limpeza garantida de dados de teste.
3. **Limpeza de arquivos de lixo na raiz** — 9 arquivos vazios (0 bytes) de erros de sintaxe de shell de sessões antigas, removidos.
4. **Este checkpoint** — primeiro raio-x de arquitetura completo extraído do código, em 2 formatos: um arquivo único (`docs/auxilio/CHECKPOINT_TECNICO.md`, sessão anterior no mesmo dia) e esta pasta de 22 arquivos (`checkpoints/2026-08-28_aliancalog_checkpoint/`).

## Nada commitado

Como em quase toda sessão anterior — regra do `CLAUDE.md`: commit e push exigem aprovação explícita do Vítor a cada vez, nunca assumida de aprovações anteriores. Ao final desta sessão, working tree tinha mudanças em 7 arquivos de código (correções de fuso + testes) + 4 arquivos de documentação (`CLAUDE.md`, `docs/README.md`, `docs/governanca/CHECKPOINT.md`, mais o novo `docs/auxilio/CHECKPOINT_TECNICO.md`) + esta pasta nova de checkpoint, todas aguardando revisão.

## Pendências mais antigas ainda de pé

Ver `18_KNOWN_ISSUES_AND_RISKS.md` para os itens ainda ativos (offline-first parcial, sem QA formal, TSP/VRP não implementado) — não repetidos aqui para não duplicar.
