# MVP A — o que falta para o go-live

> Revisão original de 2026-08-14 do [CHECKLIST.md](../docs/governanca/CHECKLIST.md)
> (Sprints 0–4 + Pré-piloto), **reconferida contra o código em 2026-08-20**.
> Índice geral: [README.md](./README.md).

## Resumo

**Todo o código do MVP A está escrito.** O que falta é quase inteiramente
**infraestrutura de produção e validação real** — não é feature nova.

| | Itens abertos | Natureza |
|---|---|---|
| **Luis** | 8 | Banco travado, deploy, monitoramento, backup, testes, cache offline |
| **Vítor** | 7 | Validação ao vivo, dados reais, piloto, treinamento |

### Verificado nesta data (20/08)

- 19 migrations no repositório, todas aplicadas.
- `npm run test:security` **9/9** contra o banco real (inclui T4a/b/c do A-007).
- Sentry, Playwright e CI: **confirmados ausentes**.
- `STORE_CACHE`: **confirmado ainda como esqueleto** (nunca escrito nem lido).
- Sem `vercel.json`/`.vercel` no repo — deploy segue pendente.

## ⚠️ Dois bloqueios em série

```
DATABASE_URL quebrado  →  Deploy Vercel  →  Testes ao vivo  →  Piloto  →  Go-live
   (Luis, rápido)          (Luis, ⏫)         (Vítor)
```

**1. O `DATABASE_URL` está com senha inválida** (descoberto em 20/08). Derruba
`db:migrate`, `db:status` e `db:backup` — na prática, **nenhuma migration nova pode ser
aplicada** até isso ser resolvido. É rápido, mas trava todo o trabalho de banco do Luis.

**2. O deploy é o caminho crítico do projeto.** Câmera e Service Worker exigem HTTPS,
então **5 das 7 pendências do Vítor** ficam paradas até o staging subir. Enquanto isso,
dá para adiantar só a parte do roteiro que roda em `npm run dev`.

---

## Correções ao CHECKLIST (o que estava desatualizado)

Confirmado por leitura de código, não por confiança no que estava marcado:

- **"Push para o GitHub"** — na verdade **já feito**. O remote `uzzaidev/AliancaLog`
  existe e os commits estão lá. Só o **deploy na Vercel** segue em aberto.
- **"Imutabilidade forte do canhoto (bloquear re-registro)"** (Sprint 2) — **obsoleto**.
  O A-007 fez o oposto de propósito: removeu o índice `uq_canhoto_nf` justamente para
  permitir várias tentativas por NF. Reescrever ou remover o item, senão vira
  contradição com o que está em produção.
- **"Perguntar ao Matheus se as empresas conseguem encaminhar os XMLs"** (Pré-piloto) —
  **respondido na reunião de 12/08** (decisão D-005: cliente manda `.zip` de XMLs ao
  fechar a carga). O que sobrou dele é o A-012, que já está em
  [vitor-pirolli.md](./vitor-pirolli.md).
- **"Smoke test de RLS formal — falta script versionado"** — o script **existe**
  (`scripts/smoke-seguranca.mjs`, rodando por `npm run test:security`, 9/9 no banco
  real). Falta confirmar se cobre o perfil `cliente_final`, que era a outra metade do
  item.

---

## Luis — 8 itens

### 0. Corrigir o `DATABASE_URL` `🔴 trava o próprio trabalho dele`

**Descoberto em 20/08:** `password authentication failed for user "postgres"`.

```
npm run db:migrate   ❌     npm run db:status   ❌     npm run db:backup   ❌
```

Já aconteceu antes — o [CHECKPOINT.md](../docs/governanca/CHECKPOINT.md) registra um
reset de senha pelo mesmo motivo (o pooler do Supabase deixou de aceitar a antiga,
`EAUTHQUERY`). Provavelmente é regenerar no painel e atualizar o `.env`.

A conexão por **service role key** segue funcionando (é o que o app, o `seed` e o
`test:security` usam) — o problema é só o caminho `pg`/`DATABASE_URL` dos scripts.

**Aceite:** `npm run db:status` lista as 19 migrations sem erro.

### 1. Deploy na Vercel `⏫ bloqueia o resto`
GitHub já está conectado; falta a Vercel apontada para o repo, com as variáveis de
ambiente do Supabase, e uma URL de staging no ar.

**Por que é o item mais urgente:** câmera (`getUserMedia`) e Service Worker exigem
**HTTPS**. Sem deploy, ninguém consegue testar bipagem nem offline num celular real —
e isso trava 5 das 7 pendências do Vítor.

**Aceite:** URL de staging abre o login em HTTPS, e dá para instalar o PWA no celular.

### 2. Domínio + SSL
Depois do staging, o domínio definitivo para o go-live.

### 3. Monitoramento de erros (Sentry ou similar)
Não existe nada hoje — nenhuma dependência de monitoramento no `package.json`. Se um
canhoto falhar no celular do motorista em campo, ninguém fica sabendo.

**Aceite:** um erro provocado de propósito em produção aparece no painel de
monitoramento com stack trace.

### 4. Backup automático do banco
Hoje `npm run db:backup` é **manual** — e desde 20/08 nem manual funciona, porque
depende do `DATABASE_URL` (item 0). Antes de entrar dado real de cliente, precisa ser
automático (o próprio Supabase tem backup no plano pago; confirmar qual plano o projeto
está usando).

> Enquanto isso, o `scripts/reset-operacional.mjs` (criado em 20/08) faz dump das
> tabelas de movimento em JSON via service role — serve de rede de proteção pontual,
> **não** substitui backup do banco inteiro.

### 5. Cache offline da lista do dia `→ leitura offline no boot`
**Confirmado como não feito**: `STORE_CACHE` (`lib/offline/db.ts`) é criado e limpo no
logout, mas **nunca é escrito nem lido**. Só o esqueleto existe.

Efeito prático: o motorista só enxerga as entregas offline se a aba **já estava
aberta**. Se ele fechar o app numa área sem sinal e reabrir, vê tela vazia. Numa
operação na Serra, esse é o cenário provável, não a exceção.

**Aceite:** abrir o app em modo avião, do zero, e ainda ver o romaneio e as NFs do dia.

### 6. Testes E2E (Playwright)
Adiado por decisão explícita na sessão de 14/08 — não é esquecimento. Com o QA agora
sob sua responsabilidade, é seu. Não precisa cobrir tudo: priorizar login por role,
registrar canhoto offline→sync, e isolamento entre empresas (R-008).

### 7. Criar os logins reais
16 motoristas + ~20 empresas, quando o Vítor trouxer as listas do Matheus. O fluxo de
cadastro já existe na UI (`/gerencia/cadastros`), então talvez seja só operacional —
avaliar se vale um script de carga em lote.

### Extra sem dono definido — CI (GitHub Actions)
Não existe `.github/`. Hoje `npm test` (typecheck + lint + smoke de segurança) só roda
se alguém lembrar. Não é bloqueio de piloto, mas com dois devs mexendo no mesmo repo
vira rede de proteção barata.

---

## Vítor — 7 itens

### 1. Validação ao vivo de tudo que foi construído `⏫`
Roteiro completo e priorizado em
[testes-ao-vivo-vitor.md](./testes-ao-vivo-vitor.md). É o maior bloco de risco do MVP A:
**todo o código compila, mas quase nada foi visto rodando com dado real.**

### 2. Login do `cliente_final` nunca foi testado de verdade
Gerência e motorista foram confirmados em uso real; o portal do cliente, não. Como é
justamente o perfil com o risco R-008 (ver dado de outra empresa), vale testar cedo.

### 3. Critérios de sucesso do piloto (escrever)
Não existem ainda. Sugestão do próprio checklist: 2–3 motoristas × 5 dias, ≥95% das
entregas pelo app, zero perda no sync, Matheus abrindo o dashboard sem ser lembrado.
Precisa virar texto acordado com o cliente, senão "o piloto deu certo?" vira opinião.

### 4. Excel/XML reais das empresas
Pegar com o Matheus 2–3 arquivos reais para testar a importação com dado sujo de
verdade (é onde o parser costuma quebrar). Conecta com o A-012.

### 5. Testar a foto de 1280px com canhotos reais em luz ruim
A compressão foi ajustada de 800px para 1280px justamente para a assinatura ficar
legível no zoom — mas isso nunca foi validado com canhoto amassado, foto contra o sol,
caneta fraca. Se não estiver legível, o produto inteiro perde o valor probatório.

### 6. Piloto com 2–3 motoristas
Primeira entrega real registrada pelo app. Depois, os ajustes que saírem dele.

### 7. Material de apoio + treinamento
Guia de 1 página + treinamento do coordenador. É o A-015 da ata, no formato de duas
etapas (equipe faz sozinha → depois acompanha junto).

---

## Ordem recomendada

1. **Luis: corrigir o `DATABASE_URL`** — rápido, e sem isso ele não aplica migration nenhuma.
2. **Luis: deploy na Vercel** — destrava tudo do lado do Vítor.
3. **Vítor: bateria de testes ao vivo** no staging (roteiro no arquivo dedicado).
   Os marcados 💻 já podem ser feitos antes do deploy.
4. **Luis: Sentry + backup** — antes de entrar dado real de cliente.
5. **Vítor: critérios do piloto + dados reais** com o Matheus.
6. **Luis: cache offline da lista** — pode ir em paralelo, mas é o refinamento que mais
   muda a experiência real na Serra.
7. **Piloto** → ajustes → go-live.

**Não são bloqueio de piloto:** Playwright, CI e o item obsoleto de imutabilidade.

---

## O gargalo não é desenvolvimento

Vale registrar, porque muda a conversa com o cliente: **nenhuma linha de código de
produto está faltando** para o MVP A. O que separa o projeto do go-live é
**operação** — deploy, monitoramento, backup e a bateria de validação real.

Nada disso é incerto ou exploratório; é execução. A Fase B, sim, é desenvolvimento —
e depende de duas decisões de produto que ainda não foram tomadas
([fase-b-pendencias.md](./fase-b-pendencias.md)).
