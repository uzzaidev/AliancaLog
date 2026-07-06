---
tipo: material-estudo-dev
trilha: DEV
semana: "Week 3"
fonte: "New Society (Classroom) — transcrições"
idioma: "EN → PT-BR (prompts preservados em EN)"
projeto_aplicacao: "UzzAI — full-stack e produtos com IA"
created: 2026-06-14
tags: [dev, nextjs, supabase, vercel, openrouter, apis, deploy, codex]
---

# 🚀 DEV TRACK — Week 3: Full-Stack, Deploy e Apps com IA

> **Status:** ✅ com gravação (rico) — consolidado de `Som_2026_05_20/21/22_*`, `Som_2026_05_21_23_22_02_27`, `Gravar_2026_06_11_10_19_04_398`
> **Resultado da semana:** sair de zero a um **app full-stack com banco, autenticação, deploy na web e uma feature de IA**.

## 📑 Índice
1. [Front-end, back-end e banco de dados](#1)
2. [O que é Next.js + one-shotting](#2)
3. [Supabase — banco e segurança](#3)
4. [Deploy na Vercel + domínio](#4)
5. [Tornando o app "AI-powered" com OpenRouter](#5)
6. [Model selector + limites por usuário](#6)
7. [Conectar APIs externas (o padrão universal)](#7)
8. [Debugging de erros — o método](#8)
9. [Worst beginner mistakes + Product-Market Fit](#9)
10. [Biblioteca de prompts da semana](#10)

---

<a name="1"></a>
## 1. Front-end, back-end e banco de dados

- **Front-end** = tudo que o usuário vê. **Back-end** = todo código invisível ao usuário.
- **Banco de dados é parte do back-end.** É onde os dados ficam armazenados de forma que possam ser acessados e consultados por muitos usuários ao mesmo tempo.
- **Sem banco, o app tem amnésia:** a cada reload, históricos, imagens e configurações se perdem. O banco faz os dados **persistirem**.
- Banco ≠ planilha: lida com **relações** (um usuário → 3 pedidos → cada pedido com itens) em **tabelas, linhas e colunas**.
- **Você não precisa escolher o banco** — o agente escolhe (geralmente Postgres/Supabase) e configura. O essencial: o banco é a **parte mais valiosa do app**, então **autenticação e segurança** são críticas.

> **Tech stack do curso:** Next.js + Supabase + Vercel (+ Stripe para pagamentos). É o stack mais popular de startups que entram no Y Combinator. A Superhuman (email) usa esse stack e vale ~$150M. *"Dá pra construir uma empresa de bilhão só com Next.js e Supabase."*

---

<a name="2"></a>
## 2. O que é Next.js + one-shotting

**Next.js** = framework sobre React. Você não precisa entender React; basta saber que ele dá a **estrutura pronta** do app (páginas, encanamento). É o **default** dos AI coding tools (Codex, Cursor, v0). Permite **front-end e back-end no mesmo projeto/linguagem/arquivos** = base simples, deploy rápido (1 clique na Vercel).

**One-shotting (prompt único):**
```
Locate the [projeto] folder, and in there build the following project:
[descrição completa do app]
Ultrathink and build the whole thing right away.
```
Dicas: crie o folder antes (clique direito → New Folder), use `slash theme` no Claude Code para tema, `/fast` para inferência 2-3× mais rápida. Você não precisa abrir nem entender o TypeScript gerado — *"no futuro os agentes rodam todo o código"*.

> 💡 **Como é um bom prompt de feature?** Descreva **o quê + onde na UI + como tecnicamente + integração com o existente + critério de qualidade**. Exemplo real (sintetizador no drum machine) na [biblioteca de prompts → Exemplo de feature one-shot](../03_APENDICES/A_biblioteca_de_prompts.md).

> 🚫 **Regra para o CLAUDE.md:** `Never run npm run build unless the user explicitly asks for it` — o Codex roda build sozinho e derruba o frontend (bug do Next.js).

---

<a name="3"></a>
## 3. Supabase — banco e segurança (5 pro tips)

1. **NÃO crie tabelas pelo Table Editor.** Mau hábito vindo do Excel. Faça tudo pelo **SQL Editor** e **documente as mudanças** na pasta `docs/` (arquivos `.sql`). Use o Table Editor só para inspeção visual.
2. **Sempre rode as migrations SQL.** Erro comum: fazer um refactor que mexe no banco e esquecer de rodar a migração (ex.: `002`). Peça ao Claude para explicar:
   ```
   Please explain in simple terms what I need to do. Is there a Supabase
   migration I need to run? If so, in which file? Answer in short.
   ```
   E depois um SQL de verificação:
   ```
   Give me a simple SQL query (in a code block) to double-check that the 002
   migration ran successfully.
   ```
3. **Saiba onde ficam as chaves:** Project Settings → API Keys.
4. **NUNCA confunda Anon key com Service Role (Secret) key.** A Service Role dá acesso privilegiado a todo o projeto. **Nunca exponha ao usuário/front-end** — é a **falha de segurança nº1 de iniciantes**.
5. Mantenha o SQL versionado em `docs/` e nunca insira linhas/colunas na mão.

**Coloque estas regras no seu CLAUDE.md** (bloco oficial do curso):
```markdown
# SQL and Supabase
- Always create .sql files for any SQL queries you want the user to run
- Put all of the .sql files into the /docs folder in that given project
- Each file should start with a number to document the order of the operation
- We must have the entire DB schema documented in the /docs folder, in different .sql files
- Name the files like "001_create_x_table.sql" or "002_change_rls_policy.sql" or "003_add_foreign_key.sql"
```
> Preset completo de CLAUDE.md: [APÊNDICE F](../03_APENDICES/F_preset_CLAUDE_md.md).

---

<a name="4"></a>
## 4. Deploy na Vercel + domínio

- **GitHub é o hub:** você configura o GitHub e autentica nele todas as plataformas de deploy (Vercel etc.). Push para `main` → deploy.
- **Variáveis de ambiente:** o que você coloca no `.env.local` precisa **também** ser configurado na Vercel (Environment Variables). Caso contrário a feature de IA quebra em produção ("sign in for coach" → erro).
- **Domínio:** comprar domínio + apontar na Vercel (o agente guia passo a passo).
- **Regra git:** `Always push to main. Do not create new branches or worktrees unless I tell you.`

---

<a name="5"></a>
## 5. Tornando o app "AI-powered" com OpenRouter

**Por que OpenRouter:** uma única API dá acesso a **todos os modelos** (Opus, GPT, Gemini, GLM, Kimi, MiniMax…). Você troca de modelo sem trocar de integração.

**Como funciona por baixo:** o app lê o estado (ex.: BPM, acordes, timeline) → envia para o OpenRouter com um prompt → o modelo analisa → retorna o feedback exibido no front-end.

**Setup:**
1. Pegue a **API key** no OpenRouter e coloque em `.env.local`:
   ```
   OPENROUTER_API_KEY=sk-...
   ```
   (o autocomplete do Cursor sugere; `Cmd/Ctrl+S` para salvar — o ponto na aba indica não-salvo).
2. **Defina um limite de gasto na própria chave** (ex.: $10/dia) — guardrail contra abuso.
3. Configure a **mesma env var na Vercel** para produção.

**Segurança quando o app é público (uma chave central, muitos usuários):** múltiplas camadas —
- limite de gasto na chave OpenRouter;
- **limites por usuário** (ex.: X gerações/dia), exigindo login;
- bloquear não-logados na feature de IA;
- idealmente um **plano pago** (monetização) no futuro.
- Solução mais robusta de longo prazo: cada usuário insere a **própria** OpenRouter key, armazenada com segurança no banco (refactor maior).

> ⚠️ **Sempre tenha múltiplos guardrails** para que ninguém gaste $20.000 na sua chave enquanto você dorme.

---

<a name="6"></a>
## 6. Model selector + limites por usuário

- **Gatilho manual:** não deixe a IA rodar sozinha ao abrir o app — adicione um **botão "Analyze"** (controla custo e UX).
- **Model selector:** com OpenRouter você expõe vários modelos ao usuário. Centralize a lista num único arquivo:
  ```
  Update coach models by removing all current models and only adding these:
  GLM, MiniMax M2, Kimi K2.5, GPT-5.4 mini, Gemini 3.1 flash.
  Don't change anything else. Be careful — this is public.
  ```
- **Modelo barato para apps públicos/gratuitos:** GLM e similares custam frações de centavo por chamada (~$0.0004).
- Confira logs no OpenRouter para validar qual modelo está sendo usado e o custo.

---

<a name="7"></a>
## 7. Conectar APIs externas — o padrão universal

> *"Todo app que você admira é só algumas APIs conversando entre si."*

O **mesmo padrão** vale para qualquer API: pagamentos (**Stripe**), email (**Resend**), mapas (**Google Maps**), SMS (**Twilio**), auth (**Google**), samples (**Freesound**), clima/notícias… Algumas grátis, outras pagas, **todas seguem o mesmo fluxo** e levam minutos com Codex/Claude Code.

**Fluxo recomendado para integração nova:**
1. **Deep research da documentação** (não confie só no web search do agente):
   ```
   Research how to integrate [API] into my Next.js app. Give me a detailed
   report as a single markdown file.
   ```
   Use Perplexity (melhor equilíbrio velocidade/qualidade), Grok Expert (mais fontes) ou ChatGPT Pro extended (mais a fundo, ~20 min).
2. Salve o relatório em `docs/[api]-docs.md`.
3. Mande o Codex **ler o arquivo** e garantir que a implementação segue a doc oficial:
   ```
   Read @docs/[api]-docs.md. Make sure the changes you just did follow the
   official documentation in this file. Do not make changes, answer in short.
   ```
4. Pegue a API key, salve em `.env.local` **e** na Vercel.

> 🔐 **Pro tip de segurança (off-topic mas crítico):** use um **gerenciador de senhas** com senhas únicas de 30+ caracteres por serviço. Senha única para tudo é inaceitável em 2026.

---

<a name="8"></a>
## 8. Debugging de erros — o método

1. **Screenshot do erro** + cole no agente (`Ctrl+V`).
2. **Descreva como aconteceu** e qual o comportamento esperado.
3. Cole os **logs** completos.
4. Peça **debug log statements** ao redor do ponto suspeito para confirmar a causa.
5. Vá **um passo de cada vez**.
6. Se o agente entrar em loop ruim, **`/new`** (contexto limpo) ou troque o nível de reasoning.

```
I'm getting this bug after [ação] that says "[mensagem]". In what situation does
that happen and why am I getting this on [contexto]? Investigate and help me debug.
```
Para traduzir respostas verbosas do Codex:
```
Explain this to me in plain English. Codex is being too verbose. Be very concise.
```

> Seguindo esses passos (screenshot + logs + descrição + debug statements + doc atualizada via deep research), *"você consegue corrigir qualquer erro que vai encontrar"*.

---

<a name="9"></a>
## 9. Worst beginner mistakes + Product-Market Fit

**O maior erro técnico do instrutor (Vectl):** não escrever a **suposição subjacente** — assumiu que, em 2024, os modelos conseguiam priorizar tarefas com o julgamento dele. Não conseguiam. Custou **meses e dezenas de milhares de dólares**. Lição: *"mesmo quando você consegue construir, a tecnologia base pode não estar pronta"* (igual Google Glass — cedo demais).

**Decisão Persevere / Pivot / Scrap (framework Y Combinator)** — decida com clareza e **racional** (não emocional):
- **Persevere:** as suposições centrais ainda valem; só está difícil. *Welcome to business.*
- **Pivot:** algumas suposições quebraram, mas há um novo ângulo (mesmo problema/cliente, solução diferente). Michael Seibel: *"segure o problema e o cliente com força; segure a solução de leve."*
- **Scrap:** suposições quebraram e não há ângulo → comece algo novo, sem introspecção.

**Kill criteria — escreva ANTES, enquanto calmo:**
- "Se <3 de 10 pessoas se animam, eu mato."
- "Se a landing converte <2% após 500 visitas, eu mato."
- "Se ninguém pré-paga $X após 20 conversas, eu mato."

**Sinais de PMF:**
- **Andreessen (field test):** *"dá pra sentir quando há PMF e quando não há"*. Com PMF: clientes compram mais rápido do que você constrói, boca a boca espalha sozinho, receita e indicações crescem. Sem PMF: você empurra e nada se move.
- **40% rule (Sean Ellis/Superhuman):** *"How would you feel if you could no longer use this?"* — se <40% dizem "very disappointed", não há PMF. (Hit or miss; no fim, **churn e uso** é que mandam — *"the data never lies"*.)
- **Matriz de suposições (impacto × evidência):** teste primeiro **alto impacto / baixa evidência**.

> 💡 Conexão com a trilha business: ver [[garimpo_01_mindset_e_validacao]] e [[garimpo_02_growth_e_outreach]].

---

<a name="10"></a>
## 10. Biblioteca de prompts da semana (copiar/colar)

```
# One-shot de app Next.js
Locate the [projeto] folder and build this: [descrição]. Ultrathink and build it now.

# Migration Supabase — explicar
Please explain in simple terms what I need to do. Is there a Supabase migration I
need to run? If so, in which file? Answer in short.

# SQL de verificação
Give me a simple SQL query (code block) to double-check the 002 migration ran ok.

# OpenRouter — limites por usuário (pivot p/ solução simples)
Let's use a cheap model on OpenRouter and put reasonable per-user limits per
account, and prevent non-logged-in users from using the AI feature. Analyze all
relevant files, think harder, and propose a step-by-step plan. Be concise.

# Botão antes de rodar IA
Update the AI feature so it doesn't auto-run when the user opens the app. Wait for
the user to press a button before analyzing. Read relevant files and make a small change.

# Integração de API (deep research)
Research how to integrate [API] into my Next.js app. Give me a detailed report as a
single markdown file.

# Validar contra a doc
Read @docs/[api]-docs.md and make sure the changes follow the official docs. No
changes, answer in short.

# Git
Always push to main. Do not create new branches or worktrees unless I tell you.
```

> 🔗 Volta para [week2_ferramentas_e_agentes.md](week2_ferramentas_e_agentes.md) · Apêndices: [stack & ferramentas](../03_APENDICES/C_stack_e_ferramentas.md), [glossário](../03_APENDICES/E_glossario.md)
