---
tipo: material-estudo-dev
trilha: DEV
semana: "Week 2"
fonte: "New Society (Classroom) — transcrições"
idioma: "EN → PT-BR (prompts preservados em EN)"
projeto_aplicacao: "UzzAI — capacitação de devs em AI engineering"
created: 2026-06-14
tags: [dev, claude-code, codex, cursor, multi-agent, claude-md, skills]
---

# 🛠️ DEV TRACK — Week 2: Ferramentas, IDE e Agentes de IA

> **Status:** ✅ com gravação (rico) — consolidado de `Som_2026_05_15_*`, `Som_2026_05_22_17/18_*`, `Gravar_2026_06_10_15_26_23_300`
> **Pré-requisito:** Claude Code instalado (Week 1). **Para devs da UzzAI:** este é o núcleo operacional do dia a dia.

## 📑 Índice
1. [IDE + Claude Code no terminal](#1)
2. [Setup multi-agente: Advisor + Coder](#2)
3. [Os 3 padrões de multi-agente](#3)
4. [CLAUDE.md / AGENTS.md (o arquivo mais importante)](#4)
5. [Agent Skills](#5)
6. [Codex CLI — setup e quando usar](#6)
7. [Os 10 hábitos dos top builders](#7)
8. [Biblioteca de prompts da semana](#8)

---

<a name="1"></a>
## 1. IDE + Claude Code no terminal

**Por que usar um IDE (Cursor ou VS Code) — mesmo sem ser dev:** mantém tudo num único folder por projeto, deixa você ver a árvore de arquivos, facilita rodar **múltiplos agentes ao mesmo tempo** e permite abrir/editar arquivos (ex.: `.env.local`) com um clique. O agente no terminal "sabe onde você está olhando" — se você está com `agents.md` aberto e seleciona linhas, ele entende o contexto.

**Atalhos essenciais no Cursor:**
- `Cmd/Ctrl + B` — esconde a sidebar de arquivos
- `Cmd/Ctrl + I` — esconde o agente do Cursor
- `Cmd/Ctrl + J` — abre o terminal integrado
- `Ctrl + V` (não `Cmd+V`) — cola **screenshot** no input do Claude Code
- `Ctrl + J` (no terminal) — quebra de linha sem enviar a mensagem
- `Ctrl + C` `Ctrl + C` — mata o processo rodando no terminal
- Seta `↑` — recicla os últimos comandos do terminal

**Abrir o Claude Code:** no terminal integrado, `claude --dangerously-skip-permissions` (apelidado no curso como `cc`). Arraste a aba do terminal para a área principal para tela cheia. Renomeie abas (botão direito → rename) para `claude-1`, `claude-2`, etc.

> 💡 **Dica:** Tire screenshot do seu layout, cole no Claude Code e peça *"help me make this permanent"* — ele edita as settings do Cursor pra você.

---

<a name="2"></a>
## 2. Setup multi-agente: Advisor + Coder

O setup mais simples e poderoso para começar — **dois** Claude Code lado a lado:

```
Terminal 1 (Advisor):  "You are going to be the advisor to this project.
                        Your job is to help me understand what we're building
                        and guide me."
Terminal 2 (Coder):    "You are the developer in this project. You'll write
                        all the code. I tell you what to do and you listen
                        to my instructions."
```

**Por que funciona — evita poluição de contexto:** No **Advisor** você faz as perguntas "burras" à vontade (*"o que é WebSocket?", "uso Supabase ou Postgres?", "onde faço deploy?"*) sem encher o contexto do Coder. O **Coder** só recebe o que realmente vai ser implementado — sem os tokens das ideias descartadas.

> Esse foi o setup usado para construir o **Vectl** em 2024. Comece com **2 agentes**. Só passe para 3+ quando sentir necessidade real (senão eles brigam pelos mesmos arquivos).

---

<a name="3"></a>
## 3. Os 3 padrões de multi-agente

### Padrão 1 — Separar PENSAR de CONSTRUIR
Um agente planeja/explora a base de código; **outro agente, com contexto limpo, implementa**.
- Use **Claude Code** para brainstorming/planejamento (mais fácil de conversar).
- Quando a decisão estiver tomada, passe o plano para o **Codex** (high/extra-high reasoning) executar o refactor.

### Padrão 2 — Separar CONSTRUIR de REVISAR
> *"Seria idiota colocar a mesma pessoa do time pra revisar o próprio trabalho."*

Nunca peça ao mesmo agente (mesma janela de contexto) para revisar o que ele acabou de implementar — ele não vai achar o próprio bug. Use um **agente novo, contexto fresco**:

```
Your job is to review the implementation and the plan of another developer.
Be as strict as possible like a senior developer would, but don't overthink it.
```

### Padrão 3 — "Judge" (juiz) para escolher planos
Rode o mesmo prompt de planejamento no Claude Code **e** no Codex; depois um **terceiro** agente decide:

```
Above are two different plans for implementing the same feature. Your job is to
analyze the codebase, read all relevant files, then think hard about which plan
is better and why. Give me a concise answer. Do not make any changes.
```

> ⚠️ Não se distraia com gente rodando 20 agentes em paralelo no tmux — "isso é mostly fake". Use agentes por **necessidade**, não pra dizer que tem 20 abertos. Boris Cherny roda 5-10 sessões; Steinberger 3-10. Você começa com 2.

---

<a name="4"></a>
## 4. CLAUDE.md / AGENTS.md — o arquivo mais importante

**O que é:** o *system prompt* do projeto. Carregado em **toda** sessão/prompt. Mesmo com 10 Claude Codes abertos, todos seguem o que está nele.

**CLAUDE.md vs AGENTS.md:** são o mesmo conceito. A Anthropic usa `CLAUDE.md`; praticamente todos os outros (Codex, Cursor, Roo Code, Augment, Factory, Droid…) usam `AGENTS.md` — padrão mais popular. **Sempre CAPS no nome + `.md` minúsculo.**

**Não mantenha dois arquivos na mão — use um symlink** (wording exato do curso):
```
create a symlink of CLAUDE.md named "AGENTS.md"
```
Assim editar um reflete no outro; qualquer agente tem contexto completo.

> 📋 **Preset pronto de CLAUDE.md** (base + add-ons de git, SQL/Supabase, npm build, modular): ver [APÊNDICE F](../03_APENDICES/F_preset_CLAUDE_md.md). Comece todo projeto colando o preset e rodando o symlink acima.

### Princípios (módulo avançado)
- **CLAUDE.md é contexto, não lei.** O Claude *tenta* seguir; não confie 100%. Para forçar de verdade, use **hooks**, **settings** ou **permissions**.
- **Hierarquia + arquivos aninhados:** existe o global, o do projeto (root) e **um por pasta** (`frontend/CLAUDE.md`, `backend/CLAUDE.md`). Os aninhados são poderosíssimos: carregam só quando o agente trabalha naquela pasta.
- **Mantenha o root curto** — 50 a 100 linhas, **nunca > 200**. Só regras do projeto inteiro. Regras específicas vão nos arquivos de pasta; workflows viram **skills**.
- **Múltiplos arquivos concatenam, não sobrescrevem** — evite contradições (peça ao Claude pra detectá-las).
- **`/memory`** mostra o que o Claude realmente carregou. Você também pode dizer *"remember that I prefer X, save this as memory"* e ele cria um arquivo de memória em `.claude/`.

### Aprender com erros
Quando o agente erra repetidamente (ex.: usa `npm` quando você quer `bun`), **não corrija só uma vez** — atualize o `CLAUDE.md` (ou crie uma skill). Boris Cherny: *"mistake rate drops measurably over time."* Atualize o CLAUDE.md **diariamente**.

### Codebase "agent-first"
Peça uma auditoria (prompt completo do curso):
```
Analyze the entire codebase and ultrathink: How well is our repo optimized for AI
Agents? Do we have enough comments across the code files? Do we have an AGENTS.md
file inside every major folder? Do we have our root-level CLAUDE.md and AGENTS.md
thorough and detailed? Give me a rating from 1 to 10 on how well the codebase is
prepared for agentic engineering. Also, list the top 4 highest-leverage changes we
could make. Ultrathink; answer in short.
```
Depois mande o Codex implementar (root docs + README + AGENTS.md por pasta + `.env.example` + comentários). Um único prompt pode levar a base de 3/10 para 9/10.

> Inclua um **`.env.example`** — muitos agentes não leem o `.env` real por segurança.

---

<a name="5"></a>
## 5. Agent Skills

**O que é:** expertise reutilizável. Heurística: **se você manda o mesmo tipo de prompt ≥1×/dia, vire uma skill.** É o "SOP" (procedimento operacional padrão) do agente.

**Estrutura (uma pasta):**
```
minha-skill/
  SKILL.md        ← ÚNICO obrigatório (CAPS). Metadata + instruções + QUANDO usar
  scripts/        ← opcional (código executável)
  references/     ← opcional (docs de API, etc. — mantém SKILL.md enxuto)
  assets/         ← opcional (templates, imagens, SVG)
```

**Por que existe — economia de contexto:** CLAUDE.md carrega *sempre*. Se você joga instruções de marketing e de dev no mesmo arquivo, numa sessão de código as de marketing são **ruído** (distraem o agente, custam tokens, deixam mais lento). Com skills, o CLAUDE.md fica curto e cada workflow só carrega **quando relevante**.

**Regra de ouro:** a **`description` precisa dizer claramente QUANDO usar a skill** — é o que dispara (ou não) o carregamento automático.

**Global vs projeto:**
- Global: `~/.claude/skills/` — vale para todos os projetos (ex.: "review de código").
- Projeto: `.claude/skills/` — específico daquele projeto (ex.: "contabilidade interna").

**Invocação:** automática (quando a `description` casa com a tarefa) ou explícita digitando `/nome-da-skill`.

**Criar uma skill com o próprio Claude (prompt completo do curso):**
```
Create a new Claude Code Skill for me. Ask me for the skill name, scope (global
~/.claude/skills/ or project-local .claude/skills/), and the exact purpose/
instructions. Then create <scope>/<skill-name>/SKILL.md with valid YAML frontmatter
containing `name` and a specific `description` that explains when Claude should
auto-trigger it, followed by concise usage instructions. Use a no-spaces folder name,
keep it simple, and remind me to restart Claude Code after creation.
```
Depois **reinicie o Claude Code** para a skill carregar. Exemplos comuns: PR review, copywriting, debugging, research, SEO, sales outreach.

---

<a name="6"></a>
## 6. Codex CLI — setup e quando usar

**Quando usar cada um:**
- **Claude Code** → começar projeto do zero, brainstorming, explicar, trabalhar rápido. *"Fácil de conversar."*
- **Codex** → refactors grandes, bugs complicados, mudanças grandes. *"O dev 10x cracked sentado no fundo do escritório, zero skill social, mas entrega."* Péssimo em comunicação/verbosidade.
- **Use os dois:** Claude para pensar, Codex para fazer.

**Setup (mais simples que Claude Code — usa sua assinatura ChatGPT):**
1. Tenha assinatura ChatGPT (Go ~$8, Plus $20 — *melhor custo-benefício de toda a IA*; até o Go inclui uso de Codex). Não precisa do Pro $200.
2. Instale a CLI: Homebrew (macOS) ou **npm** (Windows/outros) — docs oficiais da OpenAI. Se der erro de binário, cole o log no Claude Code e deixe ele resolver.
3. `codex` no terminal → login com ChatGPT (ou API key).

**Comandos dentro do Codex:**
- `/model` → **sempre o melhor modelo** (GPT-5.4+; nunca mini, nunca low). Nível de reasoning: **High** é o equilíbrio (medium = default rápido; extra-high = refactors monstro, pode rodar 10-20 min).
- `/fast` → modo rápido (consome o plano 2× mais rápido, mas "so OP").
- `codex --yolo` (apelido) → inicia rápido pulando permissões.

> ⚠️ **Bug do Next.js:** o Codex roda `npm run build` e isso **derruba o frontend (localhost:3000)**. Solução: adicione no CLAUDE.md *"never run npm run build unless the user says so"* e, quando acontecer, *"kill the server on localhost:3000 and restart the frontend."*

---

<a name="7"></a>
## 7. Os 10 hábitos dos top builders (Karpathy · Steinberger · Cherny)

1. **Rodar múltiplos agentes** — comece com 2; suba só por necessidade (ex.: agente 1 = feature de busca, agente 2 = bug, agente 3 = testes).
2. **Plan first, build second** — gaste energia em clareza/plano; agente *one-shota* quase tudo com bom plano, mas faz estrago com instruções confusas. `Let's discuss X. Give me different options, don't write any code yet.`
3. **Faça o agente aprender com erros** — erro repetido → atualizar CLAUDE.md / criar skill.
4. **Always verify, never trust blindly** — quanto mais você constrói, mais testa (manual + unit/e2e). Dê ao agente meios de checar o próprio trabalho: `npm run build`, **Playwright MCP** (e2e no frontend), **Browser Use** (MCP/skill). Carpathy: *"seja lento, defensivo e paranoico no código que importa — middleware, auth, core business logic; no resto, modo YOLO + teste antes do deploy."*
5. **Commit often** — a cada ~10 min. `stage everything, do a git commit and push to GitHub`. **Nunca reverta — fix forward:** *"I ship code, I don't read"* (Steinberger). Faça o agente analisar o commit problemático e corrigir adiante.
6. **Talk, don't type** — fala ~200 wpm vs digitação ~40-60 wpm = 3-5×. Instale **SuperWhisper / OpenWhisper / Glado**. Carpathy *"mal toca o teclado"*; Cherny *"não digita código há meses"*.
7. **Build your codebase for the agent** — pense na base como o "workspace" do agente: arquivos pequenos, nomes óbvios, estrutura clara, muitos CLAUDE.md/README, AGENTS.md por pasta.
8. **Documentation-first** — comece pela documentação; AGENTS.md em cada folder principal explicando o propósito da pasta.
9. **Use o agente para se melhorar** — `research the Playwright MCP / Browser Use repo and give me step-by-step setup, don't change anything yet, be concise.` Em ~34s o Claude descobre e configura sozinho.
10. **Adapte cada app ao propósito** — não superengenheire. (Ex.: limites simples por usuário em vez de infra para milhões, quando o público é "algumas centenas de pessoas".)

---

<a name="8"></a>
## 8. Biblioteca de prompts da semana (copiar/colar)

```
# Definir papéis (multi-agente)
You are going to be the advisor to this project. Help me understand what we're
building and guide me.

You are the developer in this project. You'll write all the code; I tell you
what to do and you follow my instructions.

# Planejar sem codar
Let's discuss [feature/change]. Give me different options. Don't write any code yet.

# Refactor (Codex)
Analyze our entire codebase to figure out the best way to execute this refactor.
Give me a step-by-step plan. Do not make any changes yet.

# Review por agente independente
Your job is to review the implementation and the plan of another developer. Be as
strict as a senior developer, but don't overthink it.

# Juiz entre dois planos
Above are two different plans for the same feature. Analyze the codebase, read all
relevant files, think hard about which is better and why. Be concise. No changes.

# Implementar como sênior
Now get to work and implement this plan fully and properly, like a senior developer
would. The fewer lines of code, the better.

# Symlink CLAUDE.md ↔ AGENTS.md (wording exato)
create a symlink of CLAUDE.md named "AGENTS.md"

# Início de projeto (interview)
I'm about to start this project. Interview me until you have 95% confidence about
what I actually want, not what I think I should want.

# Auditoria agent-readiness (completa)
Analyze the entire codebase and ultrathink: How well is our repo optimized for AI
Agents? Enough comments? AGENTS.md inside every major folder? Root CLAUDE.md/AGENTS.md
thorough? Rate 1-10 and list the top 4 highest-leverage changes. Ultrathink; answer in short.

# Encolher resposta longa
make your answer simpler and shorter

# Corrigir Next.js após build
Do not do anything, just restart. Kill and restart the frontend on localhost:3000.
```

> 🔗 Continua em [week3_fullstack.md](week3_fullstack.md) · Apêndices: [biblioteca de prompts](../03_APENDICES/A_biblioteca_de_prompts.md), [cheat sheet](../03_APENDICES/B_cheatsheet_comandos.md)
