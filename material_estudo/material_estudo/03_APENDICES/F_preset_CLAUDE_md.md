# 🗂️ APÊNDICE F — Preset de CLAUDE.md (pronto para usar)

> Conteúdo **oficial do curso** + add-ons de regras ensinados em módulos diferentes, consolidados aqui num único arquivo pronto para colar. Lembre: **CLAUDE.md é contexto, não lei** — para forçar de verdade, use hooks/settings/permissions.

## 1. Primeiro passo — criar o symlink AGENTS.md
No Claude Code, cole **exatamente**:
```
create a symlink of CLAUDE.md named "AGENTS.md"
```
Assim você mantém **um único arquivo** que serve Claude Code **e** Codex/Cursor/outros (que usam `AGENTS.md`).

---

## 2. Preset base (do curso) — `CLAUDE.md`

```markdown
# CLAUDE.md

## Project Overview
- **Project name:** [Your project name]
- **What it does:** [One sentence describing what this app/tool does]
- **Tech stack:** [e.g. Next.js, React, Tailwind, Supabase, Python, etc.]
- **Main language:** [e.g. TypeScript, Python, etc.]

## Project Structure
- `src/` — main application code
- `components/` — reusable UI components
- `pages/` or `app/` — routes and pages
- `lib/` or `utils/` — helper functions and utilities
- `public/` — static assets (images, fonts)
- `tests/` — test files

## Key Commands
- **Install dependencies:** `npm install`
- **Run dev server:** `npm run dev`
- **Build for production:** `npm run build`
- **Run tests:** `npm test`
- **Lint/format:** `npm run lint`

## Code Style
- Use clear, descriptive variable and function names
- Keep files small and focused — one component per file
- Use existing patterns found in the codebase before inventing new ones
- Add brief comments only where logic is non-obvious
- Use imports/exports consistently with what already exists in the project

## Rules — Always Do
1. Always read existing code before modifying it
2. Always run the dev server after changes to verify nothing is broken
3. Always match the style and patterns already used in the codebase
4. Always handle errors gracefully — never let the app crash silently
5. Always keep the UI responsive and mobile-friendly

## Rules — Never Do
1. Never delete or overwrite files without confirming first
2. Never install new packages without asking — use what's already installed
3. Never hardcode sensitive info (API keys, passwords, secrets)
4. Never make changes outside the scope of what was asked
5. Never push to git or deploy without explicit permission
6. Never rewrite working code just to "clean it up" unless asked

## Common Gotchas
- Check `.env` or `.env.local` for environment variables before assuming they don't exist
- If something looks broken, check the terminal and browser console for errors before changing code
- Don't assume the database schema — read it first

## When You're Stuck
- Ask me clarifying questions before guessing
- If a task is large, break it into steps and confirm the plan before coding
- If you hit an error you can't fix in 2 attempts, stop and explain the issue

## Testing
- Run existing tests after making changes
- If adding a new feature, write at least one basic test for it
- Don't skip tests to save time

## Git Workflow
- Use clear, descriptive commit messages (e.g. "add user login page" not "update")
- Commit small, focused changes — not everything at once
- Never force push
```

---

## 3. Add-ons (regras extras ensinadas no curso)

Cole estes blocos **dentro** do seu CLAUDE.md conforme o projeto pedir.

### 🔁 Git (controle explícito)
```markdown
## Rules
- Never do a git commit, or push to GitHub, without the user's explicit permission
- Make sure to use git fully & frequently

## Git Workflow
- Use clear and descriptive commit messages
- Make your commits small and focused
- Never force push (unless the user asks you to)
```

### 🗄️ SQL e Supabase
```markdown
# SQL and Supabase
- Always create .sql files for any SQL queries you want the user to run
- Put all of the .sql files into the /docs folder in that given project
- Each file should start with a number to document the order of the operation
- We must have the entire DB schema documented in the /docs folder, in different .sql files
- Name the files like "001_create_x_table.sql" or "002_change_rls_policy.sql" or "003_add_foreign_key.sql"
```

### 🚫 Next.js — evitar derrubar o frontend
```markdown
## Rules
- Never run `npm run build` unless the user explicitly asks for it
```

### 🧩 Codebase modular
```markdown
## Architecture
- Keep our codebase very modular & well documented
```

---

## 4. Versão completa "UzzAI" (base + todos os add-ons)

> Já com tudo integrado — substitua os `[colchetes]` e cole. Depois rode o prompt do passo 1 para gerar o `AGENTS.md`.

```markdown
# CLAUDE.md

## Project Overview
- **Project name:** [nome]
- **What it does:** [uma frase]
- **Tech stack:** Next.js, Supabase, Vercel, OpenRouter
- **Main language:** TypeScript

## Project Structure
- `app/` — routes and pages
- `components/` — reusable UI components
- `lib/` or `utils/` — helpers
- `docs/` — DB schema as numbered .sql files
- `public/` — static assets
- `tests/` — test files

## Key Commands
- Install: `npm install` | Dev: `npm run dev` | Test: `npm test` | Lint: `npm run lint`

## Code Style
- Clear, descriptive names; small focused files (one component per file)
- Reuse existing patterns before inventing new ones
- Comment only non-obvious logic; consistent imports/exports
- Keep our codebase very modular & well documented

## Rules — Always Do
1. Read existing code before modifying it
2. Run the dev server after changes to verify nothing is broken
3. Match the style/patterns already in the codebase
4. Handle errors gracefully — never crash silently
5. Keep the UI responsive and mobile-friendly
6. Use git fully & frequently

## Rules — Never Do
1. Never delete/overwrite files without confirming first
2. Never install new packages without asking
3. Never hardcode secrets (API keys, passwords)
4. Never make changes outside the requested scope
5. Never do a git commit or push without explicit permission
6. Never rewrite working code just to "clean it up" unless asked
7. Never run `npm run build` unless explicitly asked
8. Never force push (unless asked)

## SQL and Supabase
- Always create .sql files for queries the user must run
- Put all .sql into /docs, numbered by operation order
- Document the entire DB schema in /docs across .sql files
- Name like "001_create_x_table.sql", "002_change_rls_policy.sql"

## Common Gotchas
- Check `.env` / `.env.local` before assuming a var doesn't exist
- On breakage, check terminal + browser console before editing code
- Don't assume the DB schema — read it first

## When You're Stuck
- Ask clarifying questions before guessing
- Break large tasks into steps; confirm the plan before coding
- If you can't fix an error in 2 attempts, stop and explain

## Testing
- Run existing tests after changes; add ≥1 basic test per new feature; don't skip tests

## Git Workflow
- Clear, descriptive commit messages; small, focused commits; never force push
```

> 🔗 Relacionado: [week2_ferramentas_e_agentes.md](../01_DEV_TRACK/week2_ferramentas_e_agentes.md#4) · [A_biblioteca_de_prompts.md](A_biblioteca_de_prompts.md)
