# ⌨️ APÊNDICE B — Cheat Sheet de Comandos & Atalhos

## Claude Code (CLI)
| Comando | O que faz |
|---------|-----------|
| `claude --dangerously-skip-permissions` | Inicia o Claude Code pulando permissões (apelido `cc`) |
| `/context` | Mostra % da janela de contexto usada (visual) |
| `/memory` | Mostra o que o Claude carregou; debug de CLAUDE.md |
| `/clear` · `/compact` | Limpa/comprime contexto — **só ao trocar de tarefa** (nunca na mesma tarefa em Opus) |
| `/fast` | Modo rápido (inferência 2-3×, custa mais) |
| `/[nome-da-skill]` | Invoca uma skill explicitamente |
| `@arquivo` | Tag/aponta para um arquivo no prompt |

## Codex (CLI)
| Comando | O que faz |
|---------|-----------|
| `codex` | Inicia o Codex |
| `codex --yolo` | Inicia rápido pulando permissões — **use sempre** (recomendação do curso) |
| `/model` | Escolhe modelo (sempre o melhor, nunca mini) + reasoning (use **High**) |
| `/fast` | Modo rápido (consome plano 2× mais rápido) |
| `/plan` | Modo plano (Codex faz perguntas — ótimo p/ iniciantes) |
| `/new` | Nova sessão (quando entrou em loop ruim) |

## Cursor / IDE (atalhos)
| Atalho | Ação |
|--------|------|
| `Cmd/Ctrl + J` | Abre terminal integrado |
| `Ctrl + J` (no input) | Quebra de linha sem enviar |
| `Cmd/Ctrl + B` | Esconde sidebar de arquivos |
| `Cmd/Ctrl + I` | Esconde agente do Cursor |
| `Ctrl + V` | Cola **screenshot** no Claude Code (Cmd+V não funciona) |
| `Cmd/Ctrl + S` | Salva arquivo (ponto na aba = não salvo) |
| `Ctrl + C` `Ctrl + C` | Mata processo do terminal |
| `↑` (terminal) | Recicla últimos comandos |
| Botão direito no header → Move Primary Sidebar Right | Move a sidebar |

## Git (via agente)
```
stage all files and push to GitHub
stage the frontend files and do a commit about the frontend changes
```
- **Commit a cada ~10 min.** Sempre `push to main`. **Nunca reverta — fix forward.**

## Setup do GitHub (rodar/colar no Claude Code)
```bash
# 1. Instalar o GitHub CLI (se ainda não tiver)
brew install gh                 # macOS
# Windows: winget install GitHub.cli   (ou: choco install gh)

# 2. Autenticar — fluxo interativo (escolha GitHub.com → HTTPS → via browser)
gh auth login

# 3. Definir identidade git (se ainda não configurada)
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```
> `gh auth login` cuida de SSH keys, tokens e credential storage por você. São só 3 passos.

## Setup de ferramentas
```
# Codex via Homebrew (macOS)        # via npm (Windows/outros)
brew install ...                    npm install -g @openai/codex
```
- Voz: instalar **SuperWhisper / OpenWhisper / Glado** (falar > digitar, 3-5×).
- **Bug Next.js:** `npm run build` derruba o frontend → reinicie o servidor de dev.

## OpenRouter / env
```
# .env.local  (e replicar na Vercel → Environment Variables)
OPENROUTER_API_KEY=sk-...
```
- Defina **limite de gasto** na própria chave (ex.: $10/dia).
- Mantenha um **`.env.example`** versionado.
