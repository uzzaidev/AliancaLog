---
type: reuniao
subtipo: reuniao_geral
status: rascunho
projeto: PROJETO
sprint: Sprint-Atual
data: 2026-08-12
---

# Alinhamento de operação do sistema de entregas — MVP e ajustes de fluxo

## 📝 Encaminhamentos

- [ ] **A-001: Corrigir filtro de notas fiscais para exibir notas pendentes de dias anteriores (hoje retorna "nenhuma nota encontrada")** [[a definir]] ⏫ 🏷️ project:PROJETO #encaminhamento #notas-fiscais #bug sprint:Sprint-Atual
- [ ] **A-002: Adicionar filtros de período na listagem de notas (hoje, últimos 7 dias, últimos 30 dias)** [[a definir]] 🔼 🏷️ project:PROJETO #encaminhamento #notas-fiscais sprint:Sprint-Atual
- [ ] **A-003: Implementar upload em lote de XMLs (arquivo .zip) para evitar cadastro nota a nota** [[a definir]] ⏫ 🏷️ project:PROJETO #encaminhamento #notas-fiscais #importacao sprint:Sprint-Atual
- [ ] **A-004: Adicionar opção de excluir todas as notas duplicadas de uma vez** [[a definir]] 🔼 🏷️ project:PROJETO #encaminhamento #notas-fiscais sprint:Sprint-Atual
- [ ] **A-005: Implementar botão de trocar motorista de uma entrega (quando o motorista definido não puder entregar)** [[a definir]] ⏫ 🏷️ project:PROJETO #encaminhamento #entregas sprint:Sprint-Atual
- [ ] **A-006: Roteirizar entregas do motorista a partir dos 4 painéis (fluxo abrir entrega → ver no mapa → decisão do motorista)** [[a definir]] ⏫ 🏷️ project:PROJETO #encaminhamento #roteirizacao sprint:Sprint-Atual
- [ ] **A-007: Ao registrar ocorrência (cliente ausente, endereço não encontrado, sem tempo de finalizar), devolver a entrega ao painel com a ocorrência ao lado** [[a definir]] ⏫ 🏷️ project:PROJETO #encaminhamento #ocorrencias sprint:Sprint-Atual
- [ ] **A-008: Criar alerta para notas paradas há mais de 7 dias (sinalizar no painel)** [[a definir]] 🔼 🏷️ project:PROJETO #encaminhamento #alertas sprint:Sprint-Atual
- [ ] **A-009: Investigar por que o BIPE não está enviando atualização em tempo real para o painel (parou após atualização recente)** [[a definir]] ⏫ 🏷️ project:PROJETO #encaminhamento #bipe #bug sprint:Sprint-Atual
- [ ] **A-010: Registrar chegada do motorista no cliente com foto obrigatória da fachada/local** [[a definir]] 🔼 🏷️ project:PROJETO #encaminhamento #entregas #comprovacao sprint:Sprint-Atual
- [ ] **A-011: Entregar primeira versão da tela de aprovar/recusar proposta (recusa exige observação obrigatória)** [[a definir]] ⏫ 🏷️ project:PROJETO #encaminhamento #propostas sprint:Sprint-Atual
- [ ] **A-012: Agendar reunião de alinhamento com cliente para fluxo de envio de XMLs (cliente manda .zip fechado ao finalizar carga)** [[a definir]] 🔼 🏷️ project:PROJETO #encaminhamento #cliente #integracao sprint:Sprint-Atual
- [ ] **A-013: Prospectar integração via chave API do sistema do cliente para automatizar recebimento de notas** [[a definir]] 🔽 🏷️ project:PROJETO #encaminhamento #integracao #api sprint:Sprint-Atual
- [ ] **A-014: Corrigir rota de Montenegro que não está vindo pelo IMEX (validar durante a semana)** [[a definir]] ⏫ 🏷️ project:PROJETO #encaminhamento #rotas #bug sprint:Sprint-Atual
- [ ] **A-015: Fazer treinamento operacional no cliente — equipe passa pelo processo primeiro, depois acompanha junto** [[a definir]] 🔼 🏷️ project:PROJETO #encaminhamento #treinamento sprint:Sprint-Atual

## Decisoes Tomadas

- **D-001:** Motorista bipa a nota e ela é atribuída automaticamente a ele; gerência mantém a opção de atribuir manualmente caso o motorista esqueça de bipar.
- **D-002:** Login separado para gerência e para motorista — motorista bipa em campo, gerência ajusta pontualmente pelo painel.
- **D-003:** Recusa de proposta exigirá observação obrigatória; aceite não exige.
- **D-004:** Foto do local na chegada será obrigatória em todas as entregas (comprova visita mesmo com cliente ausente/porta fechada).
- **D-005:** Cliente enviará XMLs como arquivo .zip ao fechar cada carga; sistema fará ingestão em lote em vez de cadastro nota a nota.
- **D-006:** Ocorrências como "cliente ausente" e "endereço não encontrado" devolvem a entrega ao painel; "cliente recusou" não devolve.

## Riscos & Mitigacoes

- **R-001:** BIPE não está atualizando em tempo real após última atualização do sistema — bloqueia acompanhamento operacional. *Mitigação:* investigar código quebrado na atualização e revalidar integração.
- **R-002:** Motorista pode passar reto pelo cliente e alegar porta fechada, sem comprovação. *Mitigação:* foto obrigatória na chegada (A-010).
- **R-003:** Sem alerta de notas paradas, entregas podem envelhecer sem visibilidade. *Mitigação:* alerta > 7 dias (A-008).
- **R-004:** Duplicação de notas nos testes gera ruído no painel. *Mitigação:* exclusão em lote (A-004) + validação no upload.
- **R-005:** Perda de sócio operacional dobrou carga da gerência (função doméstica + operação) — risco de gargalo humano no rollout. *Mitigação:* Matheus assumir coleta e transporte físico das notas para reduzir deslocamento da gerência.

## Kaizens

- **K-001** (comunicação): Foto da chegada + tempo real no portal do cliente aumentam confiança da família/cliente final além de resolverem a comprovação operacional.
- **K-002** (processo): Fluxo de treinamento em duas etapas (equipe faz sozinha → depois faz junto com o cliente) captura ajustes reais do dia a dia antes do rollout definitivo.
- **K-003** (produto): Ingestão em lote de XML (.zip) elimina retrabalho de digitação e duplicidade — ganho recorrente em toda operação.
- **K-004** (operacional): Portal do cliente com filtros (entregas, recusadas, ocorrências, pendentes) reduz volume de perguntas para a gerência.
