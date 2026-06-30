-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Schema base (modelo reconciliado: romaneio -> NFs -> canhotos/ocorrências)
-- ════════════════════════════════════════════════════════════════════════════
create extension if not exists "pgcrypto";

-- Empresas embarcadoras (clientes finais: Leite Travizão, Aurora, ...)
create table public.empresas_clientes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  cnpj          text,
  contato_nome  text,
  contato_email text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Usuários do sistema (espelha auth.users e carrega o papel).
-- O papel também vai no app_metadata do JWT (definido na criação do login).
create table public.usuarios (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  email      text,
  role       text not null check (role in ('gerencia','motorista','cliente_final')),
  empresa_id uuid references public.empresas_clientes(id),  -- só para cliente_final
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.veiculos (
  id         uuid primary key default gen_random_uuid(),
  placa      text not null unique,
  tipo       text,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- Motoristas: extensão 1-1 do usuário.
create table public.motoristas (
  id         uuid primary key references public.usuarios(id) on delete cascade,
  telefone   text,
  cnh        text,
  veiculo_id uuid references public.veiculos(id),
  created_at timestamptz not null default now()
);

-- Romaneio: o que sai no caminhão (montado por Excel e/ou câmera).
create table public.romaneios (
  id            uuid primary key default gen_random_uuid(),
  data          date not null default current_date,
  motorista_id  uuid references public.motoristas(id),
  veiculo_id    uuid references public.veiculos(id),
  criado_por    uuid references public.usuarios(id),
  status        text not null default 'rascunho'
                  check (status in ('rascunho','ativo','fechado')),
  confirmado_em timestamptz,   -- motorista confirmou recebimento
  fechado_em    timestamptz,
  created_at    timestamptz not null default now()
);

-- Nota fiscal = item de entrega.
create table public.notas_fiscais (
  id                    uuid primary key default gen_random_uuid(),
  romaneio_id           uuid references public.romaneios(id) on delete set null,
  numero_nf             text not null,
  empresa_cliente_id    uuid not null references public.empresas_clientes(id),
  destinatario_nome     text not null,
  destinatario_endereco text not null,
  cidade                text,
  motorista_id          uuid references public.motoristas(id),
  data_entrega          date not null default current_date,
  ordem                 int,   -- sequência de rota (Fase B)
  status                text not null default 'pendente'
                          check (status in ('pendente','em_rota','aceita','recusada','retida','ocorrencia')),
  foto_url              text,
  entregue_em           timestamptz,
  observacao            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Canhoto: registro feito pelo motorista em campo (imutável após confirmado).
create table public.canhotos (
  id             uuid primary key default gen_random_uuid(),
  nota_fiscal_id uuid not null references public.notas_fiscais(id) on delete cascade,
  motorista_id   uuid not null references public.motoristas(id),
  foto_url       text,
  status         text not null check (status in ('aceita','recusada','retida','ocorrencia')),
  registrado_em  timestamptz not null default now(),
  sincronizado   boolean not null default true,  -- false = veio do sync offline
  client_id      text,                            -- id idempotente gerado no device
  created_at     timestamptz not null default now()
);

create table public.ocorrencias (
  id             uuid primary key default gen_random_uuid(),
  nota_fiscal_id uuid not null references public.notas_fiscais(id) on delete cascade,
  tipo           text not null
                   check (tipo in ('item_faltando','endereco_nao_encontrado','cliente_ausente','avaria','outro')),
  descricao      text,
  created_at     timestamptz not null default now()
);

-- ─── Índices ─────────────────────────────────────────────────────────────────
create index idx_nf_data      on public.notas_fiscais(data_entrega);
create index idx_nf_empresa   on public.notas_fiscais(empresa_cliente_id);
create index idx_nf_motorista on public.notas_fiscais(motorista_id);
create index idx_nf_romaneio  on public.notas_fiscais(romaneio_id);
create index idx_canhotos_nf  on public.canhotos(nota_fiscal_id);
-- Garante idempotência do sync offline (mesmo registro não duplica).
create unique index uq_canhoto_client_id
  on public.canhotos(client_id) where client_id is not null;

-- ─── updated_at automático em notas_fiscais ──────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_nf_updated
  before update on public.notas_fiscais
  for each row execute function public.touch_updated_at();
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
-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Storage das fotos de canhoto (bucket privado)
-- Leitura pela gerência/cliente acontece via URL assinada gerada no servidor
-- (service role). Aqui controlamos apenas quem escreve.
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('canhotos', 'canhotos', false)
on conflict (id) do nothing;

-- Motorista e gerência podem enviar fotos para o bucket 'canhotos'.
create policy canhotos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'canhotos'
    and public.jwt_role() in ('motorista', 'gerencia')
  );

-- Gerência pode listar/baixar diretamente; demais perfis usam URL assinada.
create policy canhotos_select on storage.objects for select to authenticated
  using (bucket_id = 'canhotos' and public.jwt_role() = 'gerencia');
-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Habilita Supabase Realtime nas tabelas que o dashboard escuta.
-- Adiciona as tabelas à publicação usada pelo Realtime (postgres_changes).
-- ════════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.notas_fiscais;
alter publication supabase_realtime add table public.canhotos;
alter publication supabase_realtime add table public.romaneios;
