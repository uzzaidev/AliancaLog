# Aliança Log

Controle de canhotos de entrega em tempo real para a **Rotta Logística**.
App web responsivo (PWA, offline-first) com 3 perfis: **gerência**, **motorista** e **cliente final**.

Desenvolvido pela **UzzAI**.

## Documentos — comece por aqui

| Documento | Para quê |
|---|---|
| **README.md** (este arquivo) | Visão geral, time e como rodar o projeto |
| **[docs/governanca/PLAN.md](./docs/governanca/PLAN.md)** | Plano completo: produto, stack, arquitetura e **o que cada pessoa do time precisa fazer** |
| **[docs/governanca/CHECKLIST.md](./docs/governanca/CHECKLIST.md)** | Passo a passo marcável, por sprint, com responsável em cada item |
| **[docs/governanca/CHECKPOINT.md](./docs/governanca/CHECKPOINT.md)** | Onde estamos agora — atualizado a cada sessão de trabalho |
| **[docs/db/](./docs/db/)** | Documentação do banco de dados e fluxo de migrations |
| **[docs/comercial/](./docs/comercial/)** | Documentos comerciais e de negócio (propostas, contrato, escopo técnico R01, planilha de percentuais) |
| **[docs/README.md](./docs/README.md)** | Índice completo de `docs/` |

## Time

| Pessoa | Função |
|---|---|
| **Vítor Pirolli** | Comercial/Account + Frontend/Produto + Product Owner |
| **Luis Fernando Boff** | Backend/Infra + Offline + DevOps + Dados/BI + GIS/Maps |
| **Pedro Vitor Pagliarin** | App Store / Google Play |
| Operação | CS/Treinamento + Suporte técnico |
| UzzAI Empresa | Jurídico, financeiro e institucional |

Detalhe de cada papel em [PLAN.md § Time e responsabilidades](./docs/governanca/PLAN.md#time-e-responsabilidades). Percentuais e valores em [docs/comercial/ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx](./docs/comercial/ALIANCA_LOG_PERCENTUAIS_E_TAREFAS.xlsx).

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Supabase** (PostgreSQL + RLS + Auth + Realtime + Storage) — região `sa-east-1` (São Paulo)
- Auth por papel com **Proxy** (`proxy.ts`, o antigo middleware) + checagem segura na DAL + RLS no banco
- PWA / offline-first (Service Worker próprio + fila no IndexedDB)

## Setup

### 1. Pré-requisitos
- Node 24+ (exigido pelo `@zxing/library`; ver `.nvmrc`)
- Um projeto Supabase (crie em https://supabase.com, **região South America / São Paulo**)

### 2. Variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha com os valores de **Settings → API** do seu projeto Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secreta — só servidor)

### 3. Banco de dados (migrations)
As migrations estão em `supabase/migrations/` (`0001_schema.sql` até a mais recente).
Aplique com o runner do projeto (requer `DATABASE_URL` no `.env`):

```bash
npm run db:status    # mostra aplicadas x pendentes
npm run db:migrate   # aplica todas as pendentes, em ordem, cada uma em transação
```

Cada migration roda uma vez e é registrada em `public.schema_migrations`. Nunca
edite uma migration já aplicada — crie uma nova numerada. Detalhes em
[docs/db/MIGRATIONS.md](./docs/db/MIGRATIONS.md).

### 4. Seed (dados fictícios para demonstração)
```bash
npm install
npm run seed
```
Cria empresas (Leite Travizão, Aurora), motoristas e um romaneio de exemplo, além dos logins abaixo.

### 5. Rodar
```bash
npm run dev
```
Abra http://localhost:3000.

## Logins de demonstração (senha: `alianca123`)

| Perfil    | E-mail                          |
|-----------|---------------------------------|
| Gerência  | `gerencia@rotta.com.br`         |
| Motorista | `joao@rotta.com.br`             |
| Cliente   | `acesso@leitetravizao.com.br`   |

## Estrutura

```
app/
  login/                  Tela de login (Server Action + useActionState)
  gerencia/               Painel realtime, importar NFs (XML/Excel/PDF), romaneios, cadastros
  motorista/               App de campo offline-first
  cliente/                Portal do cliente: acompanhar entregas + importar NFs
  api/sync/               Recebe a fila offline do motorista
  manifest.ts             PWA manifest
components/               UI base, app-shell, marca
lib/
  supabase/               client / server / proxy / admin
  auth/                   DAL (checagem segura) + actions (login/logout)
  data/                   Consultas server-side por área
  offline/                IndexedDB, fila e sincronização
  types.ts                Enums de domínio (papéis, status)
proxy.ts                  Roteamento por perfil (Next 16: era middleware)
supabase/migrations/      Schema + RLS + Storage + Realtime
scripts/seed.mjs          Seed de demonstração
docs/
  governanca/             Plano, checklist e checkpoint do projeto
  db/                     Documentação do banco (migrations)
  comercial/              Propostas, contrato, escopo técnico, planilhas
  auxilio/                Material de apoio (diagramas de arquitetura etc.)
```

## Comandos

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção (valida TS)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run seed       # popula dados fictícios (precisa de .env.local)
```
