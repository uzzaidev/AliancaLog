-- 0013 — Rastreabilidade para a migração do legado (prepara a A-008).
--
-- Sem isto, uma importação do sistema antigo não tem como: (a) ser reexecutada
-- sem duplicar, (b) apontar de onde veio um registro, (c) ser revertida por
-- lote, (d) ser auditada (quantos vieram, quantos foram rejeitados e por quê).
--
-- Este é o esqueleto de rastreamento — nenhuma importação real acontece aqui.
-- A A-008 (exportação/mapeamento/importação do legado) deve popular
-- import_batches e preencher legacy_source/legacy_id ao inserir cada registro.

create table public.import_batches (
  id               uuid primary key default gen_random_uuid(),
  origem           text not null,           -- ex.: 'sistema_legado_aliancalog'
  arquivo          text,                    -- nome/path do arquivo exportado
  hash_sha256      text,                    -- hash do arquivo bruto exportado
  iniciado_em      timestamptz not null default now(),
  concluido_em     timestamptz,
  total_origem     int,
  total_importado  int,
  total_rejeitado  int,
  status           text not null default 'em_andamento'
                     check (status in ('em_andamento','concluido','revertido','falhou')),
  relatorio        jsonb,                   -- detalhe de rejeições/erros por linha
  criado_por       uuid references public.usuarios(id),
  created_at       timestamptz not null default now()
);

alter table public.import_batches enable row level security;
create policy ger_all on public.import_batches for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');

-- Colunas de proveniência nas entidades candidatas a migração do legado.
alter table public.empresas_clientes
  add column if not exists legacy_source text,
  add column if not exists legacy_id text,
  add column if not exists import_batch_id uuid references public.import_batches(id);

alter table public.usuarios
  add column if not exists legacy_source text,
  add column if not exists legacy_id text,
  add column if not exists import_batch_id uuid references public.import_batches(id);

alter table public.motoristas
  add column if not exists legacy_source text,
  add column if not exists legacy_id text,
  add column if not exists import_batch_id uuid references public.import_batches(id);

alter table public.notas_fiscais
  add column if not exists legacy_source text,
  add column if not exists legacy_id text,
  add column if not exists import_batch_id uuid references public.import_batches(id);

alter table public.canhotos
  add column if not exists legacy_source text,
  add column if not exists legacy_id text,
  add column if not exists import_batch_id uuid references public.import_batches(id);

-- Reexecutar o mesmo lote não duplica o mesmo registro de origem.
create unique index if not exists uq_empresas_clientes_legacy
  on public.empresas_clientes (legacy_source, legacy_id) where legacy_id is not null;
create unique index if not exists uq_usuarios_legacy
  on public.usuarios (legacy_source, legacy_id) where legacy_id is not null;
create unique index if not exists uq_motoristas_legacy
  on public.motoristas (legacy_source, legacy_id) where legacy_id is not null;
create unique index if not exists uq_notas_fiscais_legacy
  on public.notas_fiscais (legacy_source, legacy_id) where legacy_id is not null;
create unique index if not exists uq_canhotos_legacy
  on public.canhotos (legacy_source, legacy_id) where legacy_id is not null;
