-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Row Level Security
-- Regra: gerência vê tudo · motorista só o que é seu (do dia) · cliente só a sua empresa.
-- Papel e empresa são lidos do JWT (app_metadata) para evitar recursão de RLS.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.jwt_role()
returns text language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.jwt_empresa_id()
returns uuid language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'empresa_id', '')::uuid
$$;

alter table public.empresas_clientes enable row level security;
alter table public.usuarios          enable row level security;
alter table public.veiculos          enable row level security;
alter table public.motoristas        enable row level security;
alter table public.romaneios         enable row level security;
alter table public.notas_fiscais     enable row level security;
alter table public.canhotos          enable row level security;
alter table public.ocorrencias       enable row level security;

-- ─── GERÊNCIA: acesso total a todas as tabelas ───────────────────────────────
create policy ger_all on public.empresas_clientes for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');
create policy ger_all on public.usuarios for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');
create policy ger_all on public.veiculos for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');
create policy ger_all on public.motoristas for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');
create policy ger_all on public.romaneios for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');
create policy ger_all on public.notas_fiscais for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');
create policy ger_all on public.canhotos for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');
create policy ger_all on public.ocorrencias for all
  using (public.jwt_role() = 'gerencia') with check (public.jwt_role() = 'gerencia');

-- ─── Qualquer usuário enxerga o próprio registro em usuarios ─────────────────
create policy self_select on public.usuarios for select
  using (id = auth.uid());

-- ─── MOTORISTA ───────────────────────────────────────────────────────────────
-- Vê apenas seus romaneios.
create policy mot_romaneios_select on public.romaneios for select
  using (public.jwt_role() = 'motorista' and motorista_id = auth.uid());
-- Pode confirmar recebimento / fechar o próprio romaneio.
create policy mot_romaneios_update on public.romaneios for update
  using (public.jwt_role() = 'motorista' and motorista_id = auth.uid())
  with check (motorista_id = auth.uid());

-- Vê apenas as NFs dele do dia.
create policy mot_nf_select on public.notas_fiscais for select
  using (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
    and data_entrega = current_date
  );
-- Pode atualizar o status das próprias NFs.
create policy mot_nf_update on public.notas_fiscais for update
  using (public.jwt_role() = 'motorista' and motorista_id = auth.uid())
  with check (motorista_id = auth.uid());

-- Pode registrar canhotos das próprias entregas e relê-los.
create policy mot_canhoto_insert on public.canhotos for insert
  with check (public.jwt_role() = 'motorista' and motorista_id = auth.uid());
create policy mot_canhoto_select on public.canhotos for select
  using (public.jwt_role() = 'motorista' and motorista_id = auth.uid());

-- Pode lançar ocorrências nas próprias NFs.
create policy mot_ocorrencia_insert on public.ocorrencias for insert
  with check (
    public.jwt_role() = 'motorista'
    and exists (
      select 1 from public.notas_fiscais nf
      where nf.id = nota_fiscal_id and nf.motorista_id = auth.uid()
    )
  );

-- ─── CLIENTE FINAL (read-only, só a própria empresa) ─────────────────────────
create policy cli_empresa_select on public.empresas_clientes for select
  using (public.jwt_role() = 'cliente_final' and id = public.jwt_empresa_id());

create policy cli_nf_select on public.notas_fiscais for select
  using (
    public.jwt_role() = 'cliente_final'
    and empresa_cliente_id = public.jwt_empresa_id()
  );

create policy cli_canhoto_select on public.canhotos for select
  using (
    public.jwt_role() = 'cliente_final'
    and exists (
      select 1 from public.notas_fiscais nf
      where nf.id = nota_fiscal_id
        and nf.empresa_cliente_id = public.jwt_empresa_id()
    )
  );

create policy cli_ocorrencia_select on public.ocorrencias for select
  using (
    public.jwt_role() = 'cliente_final'
    and exists (
      select 1 from public.notas_fiscais nf
      where nf.id = nota_fiscal_id
        and nf.empresa_cliente_id = public.jwt_empresa_id()
    )
  );
