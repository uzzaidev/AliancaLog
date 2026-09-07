# Guia de Configurações, Variáveis e Carga — Piloto Aliança Log

> **Objetivo:** Este documento orienta passo a passo tudo o que a equipe (Luis, Vítor e Matheus) precisa configurar no painel da Vercel, no Sentry e na carga de dados dos 16 motoristas e ~20 empresas para a entrega ao cliente na semana de **08–12/09/2026**.

---

## 1. Monitoramento com Sentry na Vercel

O código da aplicação já está 100% integrado com `@sentry/nextjs`, capturando falhas de API, erros de renderização e falhas na fila offline do motorista (com a tag `area: offline-sync`). Falta apenas inserir a chave DSN na Vercel.

### 1.1 Onde obter a chave DSN
1. Acesse sua conta no [sentry.io](https://sentry.io).
2. Entre no projeto do **Aliança Log** (ou crie um novo projeto selecionando **Next.js**).
3. No menu lateral esquerdo do projeto, clique em **Settings (Configurações)** > **Client Keys (DSN)**.
4. Copie o valor do campo **DSN** (formato: `https://[chave]@o[org].ingest.sentry.io/[projeto]`).

### 1.2 Onde cadastrar na Vercel
1. Acesse o dashboard do projeto na [Vercel](https://vercel.com).
2. Vá na aba **Settings** > **Environment Variables**.
3. Adicione a variável:
   - **Key:** `NEXT_PUBLIC_SENTRY_DSN`
   - **Value:** `https://[sua-chave-copiada-do-sentry]`
   - **Environments:** Marque as opções **Production**, **Preview** e **Development**.
4. Clique em **Save**.
5. *(Opcional)* Promova um novo redeploy na aba **Deployments** (Redeploy sem cache) para que a variável seja embutida no build.

### 1.3 Como testar e validar em 10 segundos
Criamos uma tela operacional exclusiva na gerência para você testar sem precisar forçar erros no app:
1. Acesse com seu login de gerência: `https://alianca-log.vercel.app/gerencia/diagnostico`.
2. O painel exibirá o status da DSN (`● Ativo no Servidor`).
3. Clique no botão **"Disparar erro no Servidor"**.
4. O sistema retornará o **Event ID** gerado.
5. Abra o dashboard do Sentry: o evento aparecerá imediatamente com as tags:
   - `area: "offline-sync"`
   - `piloto: "true"`

---

## 2. Carga dos 16 Motoristas e ~20 Empresas Clientes

Para não perder tempo cadastrando 36+ contas manualmente uma a uma, deixamos pronto um script automatizado (`npm run importar:piloto`) que lê arquivos CSV simples e cria tudo no banco e no Supabase Auth de forma segura e idempotente.

### 2.1 Formato dos Arquivos CSV

Os arquivos devem ser salvos dentro da pasta `scripts/dados/`:

#### A) Motoristas: `scripts/dados/motoristas.csv`
Crie o arquivo com as seguintes colunas na primeira linha:
```csv
nome,email,senha,telefone,placa,tipo_veiculo
Marcos Silva,marcos.silva@rottalog.com.br,rotta@2026,54999990001,IVV1A23,Fiorino
Roberto Andrade,roberto.andrade@rottalog.com.br,rotta@2026,54999990002,JAA2B34,Van Master
Antonio Carlos,antonio.carlos@rottalog.com.br,rotta@2026,54999990003,KBB3C45,Caminhão 3/4
```
* **Notas:**
  - `nome` e `email`: Obrigatórios.
  - `senha`: Opcional. Se deixada em branco, será preenchida automaticamente com `rotta@2026`.
  - `telefone`: Opcional (apenas números ou formatado).
  - `placa` e `tipo_veiculo`: Opcionais. Se preenchidos, o script cadastra o veículo automaticamente e já vincula ao motorista.

#### B) Empresas: `scripts/dados/empresas.csv`
Crie o arquivo com as seguintes colunas na primeira linha:
```csv
nome,cnpj,email,senha
Aurora Alimentos S.A.,02.345.678/0001-20,portal@aurora.com.br,cliente@2026
Leite Travizão Indústria,01.234.567/0001-10,acesso@leitetravizao.com.br,cliente@2026
Distribuidora Serra Ltda,03.456.789/0001-30,logistica@distribuidoraserrars.com.br,cliente@2026
```
* **Notas:**
  - `nome`: Obrigatório (nome da empresa embarcadora).
  - `cnpj`: Opcional.
  - `email` e `senha`: Opcionais. Se preenchidos, o script cria o login do portal do cliente com permissão restrita via RLS (só vê as NFs da própria empresa). Se deixados em branco, apenas a empresa é cadastrada no catálogo.

### 2.2 Como Rodar a Importação
Basta executar na raiz do projeto:
```bash
npm run importar:piloto
```
Ou passando caminhos customizados:
```bash
node --env-file-if-exists=.env.local scripts/importar-usuarios-piloto.mjs --motoristas=./minha-lista.csv --empresas=./empresas.csv
```

O script criará os usuários no Supabase Auth, nas tabelas do sistema e exibirá um relatório com o resultado de cada registro. Pode ser executado múltiplas vezes: ele atualiza os registros existentes sem duplicar nem gerar erros.

*(Alternativa manual: a qualquer momento você pode criar pontualmente na página `/gerencia/cadastros`)*.

---

## 3. Decisão de Domínio e SSL

O Vítor levantou a questão sobre o domínio definitivo do piloto:

### Opção A: Usar `alianca-log.vercel.app` (Recomendada para o Piloto)
* **Status:** Já está pronto, funcionando e com certificado SSL (HTTPS) emitido pela Vercel.
* **Vantagens:** Risco zero, não depende de apontamento de DNS externo de cliente, compatível com a instalação do PWA no iPhone/Android e câmera liberada.
* **Ação necessária:** Nenhuma.

### Opção B: Usar Domínio Próprio (Ex: `canhotos.rottalog.com.br`)
Se for decidido usar domínio institucional:
1. No painel da **Vercel** > **Settings** > **Domains** > digite `canhotos.rottalog.com.br` e clique em **Add**.
2. A Vercel informará o registro DNS a criar.
3. No painel de DNS da empresa (onde o domínio `rottalog.com.br` está hospedado):
   - **Tipo:** `CNAME`
   - **Nome / Host:** `canhotos`
   - **Valor / Destino:** `cname.vercel-dns.com`
4. A propagação leva entre 5 minutos e poucas horas. O certificado SSL é gerado automaticamente pela Vercel.

---

## 4. Tabela Geral de Variáveis de Ambiente

Para conferência no painel da Vercel ou no arquivo `.env.local`:

| Variável | Onde cadastrar | Obrigatória no Piloto | Descrição |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel & `.env.local` | **Sim** | URL da instância do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel & `.env.local` | **Sim** | Chave pública anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel & `.env.local` | **Sim** | Chave admin para Server Actions de cadastro e scripts |
| `DATABASE_URL` | GitHub Secrets & `.env.local` | **Sim** | String de conexão direta (Postgres) para migrations e backups |
| `NEXT_PUBLIC_SENTRY_DSN` | Vercel & `.env.local` | **Sim** | DSN do projeto no Sentry para monitoramento em tempo real |
| `CRON_SECRET` | Vercel & `.env.local` | Opcional | Segredo para rotas de agendamento automático |
| `SENTRY_AUTH_TOKEN` | Vercel & GitHub Secrets | Opcional | Usado apenas se for fazer upload de Source Maps no build |

---

## 5. Checklist Final de Entrega

- [x] App Shell offline estático (`○ /offline`) para cold-open no iPhone (Safari/PWA).
- [x] Tratamento de erro 500 permanente na fila offline (pula após 5 falhas e preserva o registro localmente).
- [x] Bipagem de NF para motorista assumir nota fiscal (Migration 0026 + 0027, 29/29 testes de segurança passando).
- [x] Backup automático diário configurado no GitHub Actions com PostgreSQL 17 e retenção de 30 dias.
- [x] Ferramenta de diagnóstico e simulação do Sentry em `/gerencia/diagnostico`.
- [x] Script de carga em lote (`npm run importar:piloto`) com templates prontos.
- [x] Pipeline de Integração Contínua (CI) no GitHub Actions (`.github/workflows/ci.yml`).
- [ ] Inserir `NEXT_PUBLIC_SENTRY_DSN` na Vercel e disparar o teste pelo painel.
- [ ] Preencher as listas em `scripts/dados/` e rodar `npm run importar:piloto` assim que o Vítor/Matheus enviarem.

