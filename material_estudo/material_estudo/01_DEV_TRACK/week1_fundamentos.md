---
tipo: material-estudo-dev
trilha: DEV
semana: "Week 1 — START HERE"
fonte: "New Society (Classroom) — transcrições"
idioma: "EN → PT-BR"
projeto_aplicacao: "UzzAI — onboarding em AI engineering"
created: 2026-06-14
tags: [dev, fundamentos, claude-code, modelos, ai-revolution]
---

# 🧭 DEV TRACK — Week 1: Fundamentos & START HERE

> **Status:** ⚠️ parcial — gravações cobrem alguns módulos (Watch This First, AI Revolution, Which AI Model). Vários módulos da Week 1 **não têm gravação** (lista no fim).

## 📑 Índice
1. [A revolução da IA — por que agora](#1)
2. [Mindset de entrada](#2)
3. [Qual modelo de IA usar](#3)
4. ["Watch this first" — valide antes de construir](#4)
5. [Módulos sem gravação](#5)

---

<a name="1"></a>
## 1. A revolução da IA — por que agora ("No time to waste")

Dados citados como justificativa de urgência:
- **280×** mais barato rodar inferência nível GPT-3.5 entre 2022 e 2024.
- **~1.000.000×** de avanço de IA em 10 anos (estatística atribuída à Nvidia — FLOPs de GPU + capacidade dos modelos). *"Nada na internet, no mobile ou nas redes sociais se moveu tão rápido."*
- Sam Altman: *"If I were 22 right now, I'd feel like the luckiest kid in history."* — vale para qualquer idade.
- Jensen Huang: *"Run, don't walk."*

**A nova linguagem de programação é "humano".** A barreira entre ideia e execução colapsou: qualquer um que descreva o que quer (em português, inglês…) consegue construir software. Bloqueie **≥2h/dia**, mesmo horário, e execute.

---

<a name="2"></a>
## 2. Mindset de entrada

Metade do jogo é mindset. Princípios introduzidos já na Week 1 (aprofundados na trilha business):
- **Usage never lies** — comportamento > palavras.
- **Action produces information** — em dúvida, aja.
- **Consistency compounds** — 1% melhor por dia = **37× ao ano**.
- **Delayed gratification** é o traço nº1 que prevê sucesso — muitos desistem na Week 3 por falta dele.

> 🔗 Trilha completa de mindset: [[garimpo_01_mindset_e_validacao]].

---

<a name="3"></a>
## 3. Qual modelo de IA usar

**Regra geral:** **sempre o melhor modelo de fronteira disponível.** Nunca use modelos "mini" nem reasoning "low".

| Ferramenta | Escolha recomendada (no curso) |
|------------|-------------------------------|
| **Claude Code** | Opus 4.x (o melhor em **long context** — mantém capacidade em tarefas longas, onde outros caem). Ative `/fast`. |
| **Codex** | GPT-5.4+ (`/model`), reasoning **High** (equilíbrio), `/fast` |
| **Design de UI** | Gemini 3.1 Pro costuma ser o melhor |
| **Apps públicos/baratos** | Modelos baratos via OpenRouter (GLM, Kimi, MiniMax) |
| **Deep research** | Perplexity (equilíbrio), Grok Expert (mais fontes), ChatGPT Pro extended (mais a fundo) |

**Como identificar quem escreveu o código:** UI com cantos muito arredondados ("rounded corners") geralmente é Codex/GPT.

**Long context — regra do criador do Claude Code:** trabalhando na **mesma tarefa**, **nunca** use `/clear` ou `/compact` — o Opus retém contexto relevante e fica melhor (custa mais, vale a pena). Só limpe ao **trocar de tarefa** ou quando o contexto virou ruído. Veja a % usada com `/context`.

---

<a name="4"></a>
## 4. "Watch this first" — valide ANTES de construir

O módulo de abertura já planta o aviso central: **pare de construir e valide primeiro.**
- Fale com **5 estranhos**, aplique o **Mom Test** + **script de 5 perguntas**, procure um **"hell yes"**.
- *"Stop building, stop adding features, stop vibe coding — do this first. Otherwise you risk wasting months or years."*
- Melhore o produto **1% por dia** com IA.

> 🔗 Mecânica completa de validação: [[garimpo_01_mindset_e_validacao]].

---

<a name="5"></a>
## 5. Módulos sem gravação (marcar como pendentes)

**Week 1 sem gravação detectada:** Calendar Pro Tip · The Biggest Myth · How to fix anything · Choosing your Agent · Anything is possible! · How to install Claude Code · Get Anthropic API key · Your first prompt · Programming in English! · One-shotting an app · Ship updates 10x faster · Build your own idea!

> Esses tópicos podem ser cobertos por documentação interna da UzzAI ou pela plataforma Skool original. Os fundamentos práticos (instalar/usar Claude Code, primeiro prompt, one-shotting) estão demonstrados na [Week 2](week2_ferramentas_e_agentes.md) e [Week 3](week3_fullstack.md).
