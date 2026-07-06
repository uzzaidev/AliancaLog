# 🧰 APÊNDICE C — Stack & Ferramentas

## Tabela: ferramenta · para quê · quando usar
| Ferramenta | Para quê | Quando usar |
|------------|----------|-------------|
| **Claude Code** (Anthropic) | Agente CLI; pensar, brainstorming, iniciar projeto, explicar | Default do dia a dia; conversas, planos, projetos novos. Modelo: Opus 4.x (melhor long context) |
| **Codex** (OpenAI) | Agente CLI/IDE; refactors grandes, bugs difíceis | Execução pesada após o plano. GPT-5.4+, reasoning High |
| **Cursor / VS Code** | IDE — ver arquivos, rodar vários agentes, editar | Sempre (mesmo não-dev); workspace do agente |
| **Next.js** | Framework full-stack (React) | Default dos AI tools; front+back no mesmo projeto |
| **Supabase** | Banco Postgres + Auth | Persistência de dados, autenticação |
| **Vercel** | Deploy/hosting | Deploy 1-clique via GitHub |
| **GitHub** | Versionamento + hub de deploy | Sempre; autentica plataformas de deploy |
| **OpenRouter** | 1 API → todos os modelos | Feature de IA no app; trocar modelo sem trocar integração |
| **Gemini 3.1 Pro** | Design de UI | Melhorar front-end/visual |
| **SuperWhisper/Glado** | Voz → texto | Falar com agentes (3-5× mais rápido) |
| **Playwright MCP** | Testes e2e no front-end | App com muito teste de UI |
| **Browser Use (MCP/skill)** | Agente usa o navegador | Verificação/automação de browser |
| **Perplexity / Grok / ChatGPT Pro** | Deep research de docs | Antes de integrar APIs/dependências |
| **Stripe / Resend / Twilio / Google Maps** | Pagamentos / email / SMS / mapas | APIs externas (mesmo padrão de integração) |
| **Gerenciador de senhas** | Senhas únicas por serviço | Sempre (cibersegurança) |

## Stack de referência (o "billion-dollar tech stack")
```
Front+Back:  Next.js
Banco/Auth:  Supabase (Postgres)
Deploy:      Vercel  ← GitHub
IA:          OpenRouter (multi-modelo)
Pagamentos:  Stripe
Email:       Resend
```
> Stack mais popular entre startups do Y Combinator. Superhuman (email) usa Next.js+Supabase e vale ~$150M.

## Assinaturas (custo-benefício citado)
- **ChatGPT Go (~$8) / Plus ($20)** — "melhor deal de toda a IA"; já dá uso de Codex. Não precisa do Pro ($200).
- **Anthropic API / Claude** — para Claude Code (ou plano).

## Princípio de seleção de modelo
> **Sempre o melhor modelo de fronteira. Nunca mini. Nunca reasoning low.** Opus para long context; GPT-5.4+ High no Codex; Gemini para design; modelos baratos (GLM/Kimi/MiniMax) para apps públicos/gratuitos.
