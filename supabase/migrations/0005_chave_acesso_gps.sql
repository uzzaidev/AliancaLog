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
