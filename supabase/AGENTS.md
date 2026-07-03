# supabase/ — Banco de dados e migrations

## migrations/

Cada arquivo é uma migration numerada aplicada em ordem pelo runner em `scripts/migrate.mjs`.
**Nunca edite migrations já aplicadas — crie sempre um arquivo novo.**

| Arquivo | Conteúdo |
|---------|----------|
| `0001_schema.sql` | Todas as tabelas: `empresas_clientes`, `usuarios`, `veiculos`, `motoristas`, `romaneios`, `notas_fiscais`, `canhotos`, `ocorrencias` |
| `0002_rls.sql` | RLS completo: funções `jwt_role()` / `jwt_empresa_id()` + todas as policies por role |
| `0003_seed.sql` | Dados fictícios para dev: empresa Leite Travizão, 3 motoristas, romaneio de exemplo |
| `0004_realtime.sql` | Publica `notas_fiscais`, `canhotos`, `romaneios` no canal Supabase Realtime |

## Como adicionar uma migration

```bash
# 1. Crie o arquivo
# supabase/migrations/0005_descricao.sql

# 2. Escreva o SQL (use transação se alterar estrutura)

# 3. Aplique
npm run db:migrate

# 4. Verifique
npm run db:status
```

## Modelo de dados (resumo)

```
empresas_clientes → usuarios (role: gerencia | motorista | cliente_final)
                             motoristas (vínculo 1:1 com usuario)
romaneios → notas_fiscais → canhotos (foto, status, client_id idempotente)
                          → ocorrencias (tipo + descrição)
```

## Segurança

- RLS está ativo em todas as tabelas — nunca desative
- `client_id` em `canhotos` tem índice UNIQUE para idempotência offline
- Fotos em bucket privado `canhotos` — acesso só via URL assinada gerada em `lib/data/comprovante.ts`
- A Service Role key (`admin.ts`) nunca vai para o browser
