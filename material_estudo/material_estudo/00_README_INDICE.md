---
tipo: indice-mestre
projeto: "UzzAI — Material de Estudo (curso New Society)"
fontes: "24 transcrições .json + 45 trechos segmentados"
templates: "PROMPT_AGENTE_ESTUDO.md + 04-GARIMPO-TEMPLATE-R02.md"
gerado_em: 2026-06-14
idioma: "PT-BR (prompts/termos técnicos em EN)"
---

# 🎓 UzzAI — Material de Estudo Completo
### Curso "New Society" (AI Engineering + Empreendedorismo) — para **devs** e **gestão/mercado**

> Este material combina **dois templates**: o `PROMPT_AGENTE_ESTUDO` (arquitetura de material de estudo do curso) e o `04-GARIMPO-TEMPLATE-R02` (extração de insights acionáveis para a UzzAI). O conteúdo foi dividido em duas trilhas porque o curso tem duas naturezas: **técnica** (Week 1-3) e **business/mercado** (Month 2).

---

## 🧭 Comece por aqui (guia assistido)
Descreva o que você está fazendo e onde está travado; o agente analisa o material e te diz **quais arquivos usar** e **quais ações tomar**. Depois você fornece esses arquivos para ele executar a tarefa com você. Duas versões:

- 👩‍💻 **[PROMPT_ASSISTENTE_ESTUDO.md](PROMPT_ASSISTENTE_ESTUDO.md)** — versão **técnica/dev**: roteia para Week 1-3 + apêndices e sugere setup (iniciar projeto, CLAUDE.md, AGENTS.md, skills).
- 📊 **[PROMPT_ASSISTENTE_GESTAO.md](PROMPT_ASSISTENTE_GESTAO.md)** — versão **gestão/mercado** (sem jargão técnico): roteia para os garimpos e foca em validação, cliente ideal, canal e outreach.

## 🗂️ Como navegar

### 👩‍💻 [01_DEV_TRACK/](01_DEV_TRACK/) — para desenvolvedores
| Arquivo | Conteúdo |
|---------|----------|
| [week1_fundamentos.md](01_DEV_TRACK/week1_fundamentos.md) | Revolução da IA, mindset, escolha de modelos, validar antes de construir |
| [week2_ferramentas_e_agentes.md](01_DEV_TRACK/week2_ferramentas_e_agentes.md) | IDE, Claude Code, multi-agente (advisor/coder), CLAUDE.md/AGENTS.md, Skills, Codex, 10 hábitos dos top builders |
| [week3_fullstack.md](01_DEV_TRACK/week3_fullstack.md) | Next.js, Supabase, Vercel, OpenRouter, APIs externas, debugging, PMF técnico |

### 📊 [02_BUSINESS_GESTAO/](02_BUSINESS_GESTAO/) — para gestão e mercado (formato garimpo)
| Arquivo | Conteúdo |
|---------|----------|
| [garimpo_01_mindset_e_validacao.md](02_BUSINESS_GESTAO/garimpo_01_mindset_e_validacao.md) | O maior pecado, Mom Test, script de 5 perguntas, painkiller vs vitamin, mindset empreendedor |
| [garimpo_02_growth_e_outreach.md](02_BUSINESS_GESTAO/garimpo_02_growth_e_outreach.md) | ICP/nicho, 3 formas de obter usuários, escolher canal, cold outreach masterclass |

### 📎 [03_APENDICES/](03_APENDICES/) — referência rápida (ambos os públicos)
| Arquivo | Conteúdo |
|---------|----------|
| [A_biblioteca_de_prompts.md](03_APENDICES/A_biblioteca_de_prompts.md) | Todos os prompts EN, categorizados |
| [B_cheatsheet_comandos.md](03_APENDICES/B_cheatsheet_comandos.md) | Comandos/atalhos de Claude Code, Codex, Cursor, git |
| [C_stack_e_ferramentas.md](03_APENDICES/C_stack_e_ferramentas.md) | Tabela de ferramentas + tech stack de referência |
| [D_workflows_multiagent.md](03_APENDICES/D_workflows_multiagent.md) | Diagramas dos padrões multi-agente |
| [E_glossario.md](03_APENDICES/E_glossario.md) | Glossário EN→PT (técnico + business) |
| [F_preset_CLAUDE_md.md](03_APENDICES/F_preset_CLAUDE_md.md) | **Preset pronto de CLAUDE.md** (base do curso + add-ons git/SQL/npm/modular) + symlink AGENTS.md |

---

## ✅ Cobertura (inventário do que existe vs. ausente)

**Fontes processadas:** 24 transcrições `.json` em `02_transcricoes_raw/` + 45 trechos em `04_modulos_final/`.

### Aulas COBERTAS (com gravação)
- **Week 1:** Watch This First · The AI Revolution · Which AI Model to Use
- **Week 2:** Breaking Limiting Beliefs · Terminal Basics · Working with Multiple Agents · CLAUDE.md/AGENTS.md · Create GitHub Account · Pushing to GitHub · Environment Variables · You Can Now Build Anything
- **Week 3:** Full-Stack Apps · What's a Database · One-shotting a Next.js App · Test It on Your Phone · File Types · Codex Testing · Worst Beginner Mistakes · Best Deployment Platforms · Making Your App AI-Powered · Setting up OpenRouter · Model Selector · Share First AI Feature · Buying a Domain/Vercel · Connect External APIs · How Real Apps Are Built · Karpathy/Steinberger/Cherny · Turn Into a Real Business
- **Month 2:** The Greatest Sin · List Your Assumptions · How to Validate Your Idea · If You Stick With It · The Entrepreneur Mindset · Your Ideal Customer · Painkiller vs Vitamin · No Time to Waste · Agent Skills · Real Multi-Agent Workflows · Setup Your Own OpenClaw · The Only 3 Ways to Get Users · Choose Your Path · Cold Outreach Masterclass

### Aulas SEM gravação (marcadas como pendentes)
Ver listas detalhadas em cada guia. Resumo: vários módulos introdutórios/setup da Week 1-3 (instalar Claude Code, API key, primeiro prompt, setup Vercel/Supabase passo a passo, Codex setup detalhado) e de Month 2 (Pivot or Persevere, Advanced CLAUDE.md, Advanced AI debugging). Os **fundamentos práticos** desses tópicos estão demonstrados dentro dos guias Week 2/3.

### ⚠️ Arquivos vazios/curtos (sem conteúdo útil)
`Gravar_2026_05_31_13_13_05_333` (0 segmentos), `Gravar_2026_06_10_12_48_02_812` (~59 chars), `Som_2026_05_22_18_24_17_704` e `Som_2026_05_15_13_38_27_183` (muito curtos).

---

## 🧭 Sobre o instrutor e o contexto
Curso ministrado por **"David"** (criador do **Vectl**, ~$155K MRR no pico; fundador da comunidade **New Society** na plataforma Skool). Estilo hands-on, opinativo, com foco em executar. As métricas/valores e nomes de modelos (Opus 4.6/4.7, GPT-5.4, Gemini 3.1) são citações do curso — registradas como ditas, sem validação externa.

> ⚠️ **Nota:** as transcrições foram geradas por ASR (Whisper) do áudio em inglês; nomes próprios e números podem ter pequenas imprecisões. Onde o curso afirma dados (ex.: "1.000.000× em 10 anos"), o texto preserva como **citação**, não como fato verificado.

---

## 🎯 Como usar este material na UzzAI
1. **Devs:** comece pela [Week 2](01_DEV_TRACK/week2_ferramentas_e_agentes.md) (núcleo operacional) → [Week 3](01_DEV_TRACK/week3_fullstack.md). Tenha os apêndices A e B abertos. **Em todo projeto novo:** cole o [preset de CLAUDE.md (Apêndice F)](03_APENDICES/F_preset_CLAUDE_md.md) e rode o symlink `create a symlink of CLAUDE.md named "AGENTS.md"`.
2. **Gestão/mercado:** comece pelos dois [garimpos](02_BUSINESS_GESTAO/) → execute as ações da **FASE 1 (7 dias)** de cada um.
3. **Ambos:** o glossário (E) alinha vocabulário entre os times.
