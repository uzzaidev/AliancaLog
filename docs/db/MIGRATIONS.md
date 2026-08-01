# Migrations do banco (Aliança Log)

Toda mudança de estrutura do banco passa por **migrations versionadas** em
`supabase/migrations/`. Nunca rode DDL solto no SQL Editor do Supabase para
mudança estrutural — o banco tem que ser reconstruível a partir desses arquivos.

## Como funciona

- As migrations são arquivos `.sql` com **prefixo numérico**: `0001_schema.sql`,
  `0002_rls.sql`, … Rodam em ordem alfabética/numérica.
- Um runner em Node (`scripts/migrate.mjs`, driver `pg`) aplica só as pendentes,
  **cada uma numa transação** (tudo-ou-nada), e registra o que aplicou na tabela
  `public.schema_migrations` (`version`, `name`, `hash`, `applied_at`).
- Se o conteúdo de uma migration **já aplicada** mudar (hash diferente), o runner
  **aborta**. Migration aplicada é imutável — corrija criando uma nova.
- Não depende de `supabase login` nem do Supabase CLI: conecta direto via
  `DATABASE_URL`.

## Setup (uma vez)

No `.env.local`, preencha `DATABASE_URL` com a connection string do banco:

Supabase → **Project Settings → Database → Connection string → "Session pooler"**
(porta **5432** — é compatível com `pg_dump`; o transaction pooler 6543 não é).

```
DATABASE_URL=postgresql://postgres.<ref>:<senha>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

> A senha vai **URL-encoded** dentro da string. O projeto fica na região
> **South America (São Paulo) / sa-east-1** → pooler `aws-1-sa-east-1`.

## Comandos

```bash
npm run db:status    # o que já foi aplicado x pendente (exit 2 se houver pendente)
npm run db:migrate   # aplica as pendentes e registra em schema_migrations
npm run db:backup    # dump do schema public em backups/ (faça antes de algo arriscado)
```

## Workflow padrão (criar uma migration)

1. **Crie o arquivo** com o próximo número, nome descritivo:
   `supabase/migrations/0005_add_coluna_x.sql`
2. **Escreva o SQL** (idempotente quando fizer sentido: `if not exists`, `on conflict do nothing`):
   ```sql
   alter table public.notas_fiscais add column prioridade int not null default 0;
   create index idx_nf_prioridade on public.notas_fiscais(prioridade);
   comment on column public.notas_fiscais.prioridade is 'Ordem de entrega (maior = antes)';
   ```
3. **Confira** o que está pendente: `npm run db:status`
4. **Aplique**: `npm run db:migrate`
5. **Commite** o `.sql` junto com o código que depende dele:
   ```bash
   git add supabase/migrations/0005_add_coluna_x.sql
   git commit -m "feat(db): adiciona prioridade em notas_fiscais"
   ```

## Regras

- **Nunca** edite uma migration já aplicada — crie uma nova (inclusive para reverter).
- **Nunca** delete arquivos de migration — são o histórico do banco.
- **Não** use migration para inserir dados de demonstração — isso é o `npm run seed`.
- Faça `npm run db:backup` antes de migrations destrutivas (drop/alter de coluna com dados).

## Notas

- `supabase/setup.sql` é a versão **monolítica** (o mesmo schema num arquivo só),
  útil para colar no SQL Editor num banco zerado. A fonte de verdade para aplicar
  incrementalmente é `supabase/migrations/` + `npm run db:migrate`.
- Os backups em `backups/` **não** vão pro git (podem conter dados sensíveis) e
  precisam de `pg_dump` instalado (PostgreSQL client).
