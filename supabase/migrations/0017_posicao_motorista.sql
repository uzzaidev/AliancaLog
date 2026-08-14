-- 0017 — A-006: rastreamento ao vivo dos motoristas no mapa da gerência.
--
-- Decisão do PO: rastreia SÓ enquanto o motorista tem romaneio ativo (e já
-- confirmado — ver confirmado_em); guarda só a ÚLTIMA posição, sem trilha nem
-- histórico de trajeto. A migration 0005 já registrava explicitamente que
-- rastreamento contínuo estava fora de escopo — a ata de 12/08 trouxe isso pra
-- agora (ver encaminhamentos/luis-fernando-boff.md § A-006).
create table public.motorista_posicao (
  motorista_id  uuid primary key references public.motoristas(id) on delete cascade,
  lat           double precision not null,
  lng           double precision not null,
  atualizado_em timestamptz not null default now()
);

-- atualizado_em é sempre o relógio do SERVIDOR, nunca o do device (celular com
-- hora errada/sem NTP daria um "visto há X min" errado no mapa da gerência,
-- mesmo com a posição em si atualizada).
create or replace function public.motorista_posicao_touch()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_motorista_posicao_touch
  before insert or update on public.motorista_posicao
  for each row execute function public.motorista_posicao_touch();

alter table public.motorista_posicao enable row level security;

-- Motorista só escreve a própria linha (upsert: insert na 1ª posição do dia,
-- update depois — 1 linha por motorista, sempre sobrescrita).
create policy mot_posicao_insert on public.motorista_posicao for insert
  with check (public.jwt_role() = 'motorista' and motorista_id = auth.uid());
create policy mot_posicao_update on public.motorista_posicao for update
  using (public.jwt_role() = 'motorista' and motorista_id = auth.uid())
  with check (motorista_id = auth.uid());

-- Gerência lê a posição de todos.
create policy ger_posicao_select on public.motorista_posicao for select
  using (public.jwt_role() = 'gerencia');

-- Realtime — mesmo padrão de 0004: o marcador no mapa da gerência se move sem
-- precisar de refresh manual.
alter publication supabase_realtime add table public.motorista_posicao;
