# 📦 APÊNDICE A — Biblioteca de Prompts (copiar/colar)

> Prompts em **inglês** (são para colar nos agentes). Categorizados. Extraídos das transcrições do curso.

## 🚀 Início de projeto (interview)
```
I'm about to start this project. Interview me until you have 95% confidence about
what I actually want, not what I think I should want.
```

## 🧠 Planejamento & decisão
```
Let's discuss [feature/change]. Give me different options. Don't write any code yet.

Analyze our entire codebase to figure out the best way to execute this refactor.
Give me a step-by-step plan. Do not make any changes yet.

Above are two different plans for the same feature. Analyze the codebase, read all
relevant files, think hard about which plan is better and why. Be concise. No changes.

[feature] Ultrathink and enter plan mode. Go through the entire codebase to figure
out the best way to implement this fully and properly, minimal in the app, like a
10x engineer would. Do not make any changes yet — propose a clear step-by-step plan.
```

## 👷 Implementação
```
Now get to work and implement this plan fully and properly, like a senior developer
would. The fewer lines of code, the better.

What do you think of this plan? Does it do what we need? Answer in short.
```

## 🕵️ Review independente
```
Your job is to review the implementation and the plan of another developer. Be as
strict as possible like a senior developer would, but don't overthink it.

Run git status to see the changed files and tell me if this is the correct way to
[objetivo]. Answer in short.
```

## 🐛 Debugging — template canônico do curso
```
I got this error: [DESCRIBE]
Here's what happened right before: [DESCRIBE]

<logs>
[FULL ERROR LOGS]
</logs>

here's a screenshot for more context:
[SCREENSHOT — use ctrl+v]

given all this, I need you to ultrathink, and fix this error like a Senior Developer would
```
Variações úteis:
```
Explain this to me in plain English. Codex is being too verbose. Be very concise.

Add debug log statements around [ponto] to confirm whether this is the error.
```

## 🗂️ CLAUDE.md / AGENTS.md / Skills
> Preset completo de CLAUDE.md em [F_preset_CLAUDE_md.md](F_preset_CLAUDE_md.md).
```
# Symlink (wording exato do curso)
create a symlink of CLAUDE.md named "AGENTS.md"

# CLAUDE.md por pasta
Create a new CLAUDE.md in the /[pasta] folder, same as the parent. Then create
AGENTS.md here as a symlink of the new CLAUDE.md.

# Atualizar o preset para o seu app
Read @CLAUDE.md and update it to reflect a [tipo de app]. Keep the structure honest
about the current state.

# Auditoria agent-readiness (versão completa do curso)
Analyze the entire codebase and ultrathink: How well is our repo optimized for AI
Agents? Do we have enough comments across the code files? Do we have an AGENTS.md
file inside every major folder? Do we have our root-level CLAUDE.md and AGENTS.md
thorough and detailed? Give me a rating from 1 to 10 on how well the codebase is
prepared for agentic engineering. Also, list the top 4 highest-leverage changes we
could make. Ultrathink; answer in short.

# Criar uma Skill (versão completa do curso)
Create a new Claude Code Skill for me. Ask me for the skill name, scope (global
~/.claude/skills/ or project-local .claude/skills/), and the exact purpose/
instructions. Then create <scope>/<skill-name>/SKILL.md with valid YAML frontmatter
containing `name` and a specific `description` that explains when Claude should
auto-trigger it, followed by concise usage instructions. Use a no-spaces folder name,
keep it simple, and remind me to restart Claude Code after creation.

List out all skills in this project's .claude folder.
```

## 🎛️ Exemplo de feature one-shot (referência de "bom prompt de feature")
> Note o nível de detalhe: o quê, onde na UI, como tecnicamente, integração com o existente e o critério de qualidade.
```
Right now our drum machine only makes drum sounds — kick, snare, hi-hat. Add a full
melody synthesizer with a playable piano keyboard. The keyboard should appear below
the drum pads, let you click keys to play musical notes in real time using the Web
Audio API (oscillators, not audio files). Support different sound types like sine
wave, saw wave, and square wave so each one sounds different. The notes you play
should be recordable into the step sequencer so they loop alongside your drums. The
whole thing should match the existing neon-on-dark DJ style, feel smooth and
responsive, and actually sound good.
```

## 🌐 APIs & integrações
```
Research how to integrate [API] into my Next.js app. Give me a detailed report as a
single markdown file.

Read @docs/[api]-docs.md and make sure the changes follow the official documentation
in this file. Do not make changes, answer in short.

Where can I get the [serviço] API key? Give me step by step. Be very concise.
```

## 🗄️ Supabase / banco
```
Please explain in simple terms what I need to do. Is there a Supabase migration I
need to run? If so, in which file? Answer in short.

Give me a simple SQL query (in a code block) to double-check the 002 migration ran
successfully.
```

## ⚙️ Git & servidor
```
Stage all files and push to GitHub.
Stage the frontend files and do a commit about the frontend changes.
Always push to main. Do not create new branches or worktrees unless I tell you.
Do not do anything, just restart. Kill and restart the frontend on localhost:3000.
```

## 📈 Marketing & estratégia (gestão usa o agente também)
```
I'm building [produto] for [ICP], priced [valor]. I'm running cold outreach. Give me
ONE outreach method and ONE platform, scalable and simple. Create a clear strategy
with daily actions and checklists. I'm new to online business — be simple and very
concise.

I am building a business targeting [avatar]. It's [descrição]. Which platform and
which marketing method should I choose? Answer in short.

I'm running cold outreach on [plataforma]. My product is [X]. My target avatar is [Y].
They typically have these pains: [...]. Give me a clear 7-day plan with daily volume
and exact DM scripts.
```

## ✂️ Encolher resposta longa do agente
```
make your answer simpler and shorter
```

## 🎛️ Frases-modificadoras favoritas (anexar aos prompts)
- `Be concise.` / `Be very concise.` / `Answer in short.`
- `make your answer simpler and shorter` (quando a resposta vier enorme)
- `The fewer lines of code, the better.`
- `ultrathink` / `think harder` (mais raciocínio)
- `Do not make any changes yet.` (modo plano)
- `like a senior developer would` / `like a 10x engineer would`
