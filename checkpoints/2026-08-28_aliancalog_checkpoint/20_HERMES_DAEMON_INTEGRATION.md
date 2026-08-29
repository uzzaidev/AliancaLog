# 20 — Hermes Daemon Integration

## Não aplicável a este projeto

Este arquivo existe nesta posição da numeração só para manter a mesma estrutura de pastas usada em
outros checkpoints (ex.: `2026-07-14_videomaker_checkpoint`), onde `20_HERMES_DAEMON_INTEGRATION.md`
documenta a integração com um daemon de orquestração de agentes próprio daquele projeto.

**O Aliança Log não tem esse subsistema, nem um equivalente.** Confirmado nesta sessão:

- Nenhum processo daemon/orquestrador de agentes no código ou nas dependências (`grep` por
  "daemon", "hermes", "orchestrator" em `app/`, `lib/`, `scripts/` não retorna nada relacionado)
- A única automação que roda de forma autônoma e agendada é o backup diário do banco
  ([.github/workflows/db-backup.yml](../../.github/workflows/db-backup.yml), ver `14_OBSERVABILITY.md`)
  — um workflow do GitHub Actions, não um daemon de longa duração
- Não há integração com Claude Flow / Ruflo / MCP tooling no código do produto em si (essas ferramentas
  aparecem na configuração do ambiente de desenvolvimento — `CLAUDE.md`/`.claude/` — não no runtime do
  Aliança Log)

Se este projeto algum dia ganhar um subsistema de automação de longa duração (ex.: um worker que reprocessa geocodificações falhas periodicamente, hoje disparado manualmente via `geocodificarPendentes()` — ver `13_INTEGRATIONS_AND_COST.md` e `18_KNOWN_ISSUES_AND_RISKS.md`), este é o arquivo natural para documentá-lo.
