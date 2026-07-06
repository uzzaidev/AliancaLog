# 🤖 APÊNDICE D — Workflows Multi-Agente

## Setup base: Advisor + Coder
```
┌─────────────┐        perguntas "burras",        ┌─────────────┐
│  ADVISOR    │   brainstorming, decisões de        │   CODER     │
│ (Claude Code)│  arquitetura, dúvidas conceituais   │ (Claude Code)│
│             │ ──────────────────────────────────▶ │  só recebe  │
│ contexto    │     você decide, então instrui      │ o que vai   │
│ "sujo" ok   │                                     │ implementar │
└─────────────┘                                     └─────────────┘
        Evita poluição de contexto no Coder.
        Comece com 2 agentes. Suba só por necessidade.
```

## Padrão 1 — Pensar ≠ Construir
```
[Claude Code] planeja/explora  ──plano──▶  [Codex high] implementa (contexto limpo)
```

## Padrão 2 — Construir ≠ Revisar
```
[Codex A] implementa  ──▶  [Codex B contexto fresco] revisa, "senior strict"
                            (nunca o mesmo agente revisa a si mesmo)
```

## Padrão 3 — Juiz (escolher entre planos)
```
            ┌── plano A (Claude Code)
            │
[Codex juiz]┤  "qual plano é melhor e por quê? analise o codebase, no changes"
            │
            └── plano B (Codex)
```

## Ciclo de trabalho recomendado
```
1. DISCUTIR opções (advisor)        → "give me options, no code yet"
2. REFINAR o plano (Codex/Claude)   → revisar com outro agente
3. CONSTRUIR (Codex high)           → "implement fully, like a senior dev"
4. REVISAR (agente fresco)          → strict review
5. VERIFICAR (build/Playwright)     → always verify, never trust blindly
6. COMMIT a cada ~10 min            → push to main, fix forward
```

## Escalonamento (quantos agentes)
| Nível | Agentes | Quando |
|-------|---------|--------|
| Iniciante | 2 | Sempre comece aqui; 2-3 semanas |
| Intermediário | 3 | Quando sentir necessidade real |
| Avançado (Steinberger) | 3-10 | Necessidade, não vaidade |
| Avançado (Cherny) | 5-10 | Idem |

> ⚠️ Rodar 20 agentes "pra dizer que roda" é fake. Use por necessidade — senão eles conflitam e editam os mesmos arquivos.

## Tornar agentes mais poderosos (auto-melhoria)
```
Research the [Playwright MCP | Browser Use] repo and figure out how to set it up
here. Give me step-by-step instructions but don't change anything yet. Be concise.
```
- Erro repetido → atualizar **CLAUDE.md** ou criar **skill**.
- Dar ao agente meios de checar o próprio trabalho: `npm run build`, testes unit/e2e, console do front-end, MCPs.
- Carpathy: **paranoico** em auth/middleware/core; **YOLO** no resto (testar antes do deploy).
