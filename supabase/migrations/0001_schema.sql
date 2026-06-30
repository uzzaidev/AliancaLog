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
