-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Schema completo (auto-gerado)
--
-- ARQUIVO GERADO — não edite diretamente. Gerado por scripts/gen-setup-sql.mjs
-- a partir de supabase/migrations/*.sql (fonte de verdade real do banco).
-- Regenere com `node scripts/gen-setup-sql.mjs` sempre que houver migration nova.
--
-- Uso: colar inteiro no SQL Editor do Supabase para montar o schema completo
-- em um banco ZERADO (ambiente novo de dev/staging). Em um banco que já rodou
-- migrations antes, use `npm run db:migrate`, não este arquivo.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0001_schema.sql ───────────────────────────────────────────────────────────
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

-- ─── 0002_rls.sql ───────────────────────────────────────────────────────────
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

-- ─── 0003_storage.sql ───────────────────────────────────────────────────────────
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

-- ─── 0004_realtime.sql ───────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Habilita Supabase Realtime nas tabelas que o dashboard escuta.
-- Adiciona as tabelas à publicação usada pelo Realtime (postgres_changes).
-- ════════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.notas_fiscais;
alter publication supabase_realtime add table public.canhotos;
alter publication supabase_realtime add table public.romaneios;

-- ─── 0005_chave_acesso_gps.sql ───────────────────────────────────────────────────────────
-- 0005 — Chave de acesso da NF-e + carimbo de GPS no registro do canhoto.
--
-- Chave de acesso: o código de barras do DANFE contém a chave (44 dígitos),
-- não o número da NF. Guardá-la permite casar a bipagem por match exato e
-- prepara a futura importação por XML da NF-e.
alter table public.notas_fiscais
  add column if not exists chave_acesso text
    check (chave_acesso is null or chave_acesso ~ '^[0-9]{44}$');

create unique index if not exists notas_fiscais_chave_acesso_key
  on public.notas_fiscais (chave_acesso)
  where chave_acesso is not null;

-- GPS do registro do canhoto: coleta PONTUAL no momento do registro
-- (best-effort — pode ser nulo se o motorista negar a permissão).
-- Não é rastreamento contínuo do veículo, que segue fora de escopo.
alter table public.canhotos
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists gps_precisao real;

-- ─── 0006_fix_client_id_index.sql ───────────────────────────────────────────────────────────
-- 0006 — Troca o índice parcial de client_id por um índice único não-parcial.
-- O índice parcial (WHERE client_id IS NOT NULL) impede que o Supabase upsert
-- use ON CONFLICT (client_id) sem especificar o predicado, causando erro 500
-- no sync offline. PostgreSQL permite múltiplos NULL num índice único normal
-- (NULL != NULL), por isso a semântica é idêntica mas o conflict target funciona.
drop index if exists public.uq_canhoto_client_id;
create unique index uq_canhoto_client_id on public.canhotos (client_id);

-- ─── 0007_storage_upsert.sql ───────────────────────────────────────────────────────────
-- 0007 — Mantém canhotos imutáveis no Storage (sem UPDATE para motorista).
--
-- O /api/sync sobe a foto SEM upsert; o path é derivado do client_id, então
-- um re-sync cai no mesmo arquivo e o 409 "already exists" é tratado como
-- idempotência no handler. Assim o motorista precisa apenas de INSERT (0003) —
-- nenhuma permissão de UPDATE/DELETE, preservando a imutabilidade do canhoto.
-- Esta migration garante que nenhuma policy de UPDATE foi deixada para trás.
drop policy if exists canhotos_update on storage.objects;

-- ─── 0008_retida_ocorrencia_e_import_cliente.sql ───────────────────────────────────────────────────────────
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

-- ─── 0009_sync_idempotente_e_rls_motorista.sql ───────────────────────────────────────────────────────────
-- 0009 — Endurecimento de confiabilidade/segurança pré-piloto (Sprint 3.5):
--   (a) Sync idempotente de ponta a ponta: ocorrência não duplica no reenvio e
--       cada NF tem no máximo UM canhoto.
--   (b) Imutabilidade: uma NF finalizada não é mais alterável pelo motorista, e o
--       motorista só mexe em status/foto/observação (nunca destinatário, etc.).
--   (c) RLS mais restrita: canhoto só na própria NF, em romaneio ATIVO; romaneio
--       fechado não reabre.

-- ── (a.1) Ocorrência idempotente pelo client_id do canhoto ─────────────────────
alter table public.ocorrencias add column if not exists client_id text;
-- Índice único NÃO-parcial: múltiplos NULL são permitidos (ocorrências antigas),
-- mas o ON CONFLICT (client_id) do /api/sync funciona (precisa de índice pleno).
create unique index if not exists uq_ocorrencia_client_id
  on public.ocorrencias (client_id);

-- ── (a.2) No máximo um canhoto por NF ──────────────────────────────────────────
-- Dedup defensivo antes do índice: mantém o canhoto mais antigo de cada NF
-- (desempate por id) e remove os demais.
delete from public.canhotos c
  using public.canhotos d
  where c.nota_fiscal_id = d.nota_fiscal_id
    and (c.created_at > d.created_at
      or (c.created_at = d.created_at and c.id > d.id));
create unique index if not exists uq_canhoto_nf
  on public.canhotos (nota_fiscal_id);

-- ── (b) Imutabilidade + colunas permitidas ao motorista ───────────────────────
-- Trigger só age quando quem edita é o MOTORISTA (via JWT). Gerência e service
-- role (jwt_role vazio) passam sem restrição.
create or replace function public.nf_guard_motorista()
returns trigger language plpgsql as $$
begin
  if public.jwt_role() <> 'motorista' then
    return new;
  end if;

  -- Imutável após finalizada.
  if old.status in ('aceita', 'recusada', 'ocorrencia') then
    raise exception 'NF % já finalizada — não pode ser alterada.', old.numero_nf;
  end if;

  -- Whitelist: só status/foto_url/entregue_em/observacao podem mudar.
  -- (comparação por jsonb é robusta a novas colunas futuras.)
  if (to_jsonb(new) - 'status' - 'foto_url' - 'entregue_em' - 'observacao' - 'updated_at')
     is distinct from
     (to_jsonb(old) - 'status' - 'foto_url' - 'entregue_em' - 'observacao' - 'updated_at')
  then
    raise exception 'Motorista só pode alterar status/foto/observação da NF.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_nf_guard_motorista on public.notas_fiscais;
create trigger trg_nf_guard_motorista
  before update on public.notas_fiscais
  for each row execute function public.nf_guard_motorista();

-- ── (c.1) Canhoto só na própria NF, em romaneio ativo ──────────────────────────
drop policy if exists mot_canhoto_insert on public.canhotos;
create policy mot_canhoto_insert on public.canhotos for insert
  with check (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
    and exists (
      select 1
      from public.notas_fiscais nf
      join public.romaneios r on r.id = nf.romaneio_id
      where nf.id = nota_fiscal_id
        and nf.motorista_id = auth.uid()
        and r.status = 'ativo'
    )
  );

-- ── (c.2) Romaneio fechado não reabre (nem vira fechado) pelo motorista ────────
drop policy if exists mot_romaneios_update on public.romaneios;
create policy mot_romaneios_update on public.romaneios for update
  using (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
    and status <> 'fechado'
  )
  with check (motorista_id = auth.uid() and status <> 'fechado');

-- ─── 0010_data_operacional_sp_rls.sql ───────────────────────────────────────────────────────────
-- 0010 — Data operacional em São Paulo TAMBÉM na camada RLS.
--
-- Bug: `mot_nf_select` filtrava `data_entrega = current_date`. current_date é a
-- data em UTC do servidor; a partir das 21h no Brasil (00h UTC) ela vira o dia
-- seguinte e o motorista deixa de ver as NFs do dia (não abre nem o canhoto).
-- Aqui alinhamos a RLS ao mesmo dia-calendário de São Paulo usado no app
-- (lib/date.ts). Instantes (timestamptz) não são afetados — só o "qual dia".

create or replace function public.hoje_sp()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

drop policy if exists mot_nf_select on public.notas_fiscais;
create policy mot_nf_select on public.notas_fiscais for select
  using (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
    and data_entrega = public.hoje_sp()
  );

-- ─── 0011_registrar_entrega_transacional.sql ───────────────────────────────────────────────────────────
-- 0011 — Sync do canhoto como uma única transação (fecha o gap de consistência
-- apontado na revisão pré-piloto).
--
-- Problema: /api/sync fazia upload da foto, insert do canhoto, update da NF e
-- insert da ocorrência como 4 chamadas separadas. Se o processo caísse entre o
-- insert do canhoto e o update da NF, o reenvio via retry encontrava o canhoto
-- já existente, respondia 409, e o app tratava 409 como sucesso — removendo o
-- item da fila com a NF ainda "pendente" e a ocorrência possivelmente ausente.
--
-- Solução: uma função em PL/pgSQL executa canhoto + NF + ocorrência atomicamente.
-- Uma chamada RPC do PostgREST é uma única transação de banco — se qualquer
-- INSERT/UPDATE aqui dentro falhar (exceção), tudo é revertido, inclusive o que
-- já tinha sido feito nesta mesma chamada. O upload da foto continua fora da
-- transação (é operação de Storage, não de banco), mas agora só é referenciado
-- pela NF/canhoto depois que o restante já foi validado — e o path é
-- determinístico pelo client_id, então um retry de upload é idempotente por si.
--
-- SECURITY INVOKER (padrão): a função roda com o papel de quem chama, então as
-- policies de RLS existentes (mot_canhoto_insert, mot_nf_update + trigger
-- nf_guard_motorista) continuam sendo a autorização real — a função não abre
-- nenhum privilégio novo, só agrupa as escritas em uma transação.
create or replace function public.registrar_entrega_offline(
  p_client_id text,
  p_nota_fiscal_id uuid,
  p_status text,
  p_foto_url text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_gps_precisao real default null,
  p_observacao text default null,
  p_ocorrencia_tipo text default null,
  p_ocorrencia_desc text default null
) returns table (ja_existia boolean)
language plpgsql
security invoker
as $$
begin
  if p_client_id is null or p_client_id = '' then
    raise exception 'client_id é obrigatório';
  end if;
  if p_nota_fiscal_id is null then
    raise exception 'nota_fiscal_id é obrigatório';
  end if;

  -- Idempotência: NF já tem canhoto → no-op, sinaliza para o chamador tratar
  -- como sucesso (mesmo comportamento que o 409 anterior).
  if exists (select 1 from public.canhotos where nota_fiscal_id = p_nota_fiscal_id) then
    return query select true;
    return;
  end if;

  insert into public.canhotos (
    client_id, nota_fiscal_id, motorista_id, foto_url, status,
    lat, lng, gps_precisao, sincronizado
  )
  values (
    p_client_id, p_nota_fiscal_id, auth.uid(), p_foto_url, p_status,
    p_lat, p_lng, p_gps_precisao, true
  )
  on conflict (client_id) do nothing;

  update public.notas_fiscais
  set status      = p_status,
      foto_url    = p_foto_url,
      entregue_em = now(),
      observacao  = coalesce(p_observacao, observacao)
  where id = p_nota_fiscal_id;

  if not found then
    raise exception 'NF % não encontrada ou sem permissão de atualização', p_nota_fiscal_id;
  end if;

  if p_status = 'ocorrencia' and p_ocorrencia_tipo is not null then
    insert into public.ocorrencias (nota_fiscal_id, tipo, descricao, client_id)
    values (p_nota_fiscal_id, p_ocorrencia_tipo, p_ocorrencia_desc, p_client_id)
    on conflict (client_id) do nothing;
  end if;

  return query select false;
end;
$$;

grant execute on function public.registrar_entrega_offline(
  text, uuid, text, text, double precision, double precision, real, text, text, text
) to authenticated;

-- ─── 0012_storage_endurecimento.sql ───────────────────────────────────────────────────────────
-- 0012 — Endurecimento do bucket 'canhotos' (revisão pré-piloto).
--
-- Antes: qualquer motorista/gerência autenticado podia inserir em QUALQUER
-- path do bucket, sem limite de tamanho ou tipo de arquivo. Não havia
-- isolamento entre motoristas — nada impedia um motorista de subir um arquivo
-- no path de outro (ou de outra NF).
--
-- Agora: /api/sync sobe em `{motorista_id}/{nf_id}/{client_id}.jpg`
-- (ver app/api/sync/route.ts). A policy abaixo obriga a primeira pasta do
-- path a ser o próprio auth.uid() para quem é motorista.

-- Limite de tamanho (5 MB) e MIME permitido no próprio bucket.
update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/webp']
where id = 'canhotos';

drop policy if exists canhotos_insert on storage.objects;

-- Motorista: só na própria pasta (1º segmento do path = auth.uid()).
create policy canhotos_insert_motorista on storage.objects for insert to authenticated
  with check (
    bucket_id = 'canhotos'
    and public.jwt_role() = 'motorista'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Gerência: mantém acesso irrestrito de escrita (uso administrativo/correção).
create policy canhotos_insert_gerencia on storage.objects for insert to authenticated
  with check (
    bucket_id = 'canhotos'
    and public.jwt_role() = 'gerencia'
  );

-- ─── 0013_import_batches_legacy.sql ───────────────────────────────────────────────────────────
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

