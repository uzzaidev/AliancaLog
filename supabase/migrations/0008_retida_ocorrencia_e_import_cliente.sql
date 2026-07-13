-- 0008 — Três mudanças de regra de negócio pós-aprovação do piloto:
--   (a) "Retida" deixa de ser status próprio e passa a ser um tipo de OCORRÊNCIA.
--   (b) Cliente final pode IMPORTAR NFs da própria empresa (antes era read-only).
--   (c) Rastreio da origem da importação (gerência x cliente) p/ o painel por cliente.

-- ── (a.1) Novo tipo de ocorrência: canhoto_retido ──────────────────────────────
alter table public.ocorrencias drop constraint if exists ocorrencias_tipo_check;
alter table public.ocorrencias add constraint ocorrencias_tipo_check
  check (tipo in (
    'item_faltando','endereco_nao_encontrado','cliente_ausente',
    'avaria','canhoto_retido','outro'
  ));

-- ── (a.2) Migra dados: quem estava 'retida' vira ocorrência 'canhoto_retido' ────
insert into public.ocorrencias (nota_fiscal_id, tipo, descricao)
  select id, 'canhoto_retido',
         'Migrado automaticamente do antigo status "retida" (migration 0008).'
  from public.notas_fiscais
  where status = 'retida';

update public.notas_fiscais set status = 'ocorrencia' where status = 'retida';
update public.canhotos       set status = 'ocorrencia' where status = 'retida';

-- ── (a.3) Remove 'retida' dos checks de status ─────────────────────────────────
alter table public.notas_fiscais drop constraint if exists notas_fiscais_status_check;
alter table public.notas_fiscais add constraint notas_fiscais_status_check
  check (status in ('pendente','em_rota','aceita','recusada','ocorrencia'));

alter table public.canhotos drop constraint if exists canhotos_status_check;
alter table public.canhotos add constraint canhotos_status_check
  check (status in ('aceita','recusada','ocorrencia'));

-- ── (c) Rastreio da origem da importação ───────────────────────────────────────
alter table public.notas_fiscais
  add column if not exists origem_importacao text not null default 'gerencia'
    check (origem_importacao in ('gerencia','cliente')),
  add column if not exists importado_em timestamptz not null default now();

-- ── (b) RLS: cliente_final pode INSERIR NFs, só da própria empresa ──────────────
-- empresa vem do JWT (jwt_empresa_id) → à prova de adulteração pelo cliente.
drop policy if exists cli_nf_insert on public.notas_fiscais;
create policy cli_nf_insert on public.notas_fiscais for insert
  with check (
    public.jwt_role() = 'cliente_final'
    and empresa_cliente_id = public.jwt_empresa_id()
  );
