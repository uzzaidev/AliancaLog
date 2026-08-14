-- 0018 — A-010: foto obrigatória da chegada no cliente.
--
-- Mitiga o R-002 da ata (motorista alegar porta fechada sem comprovação).
-- É uma foto SEPARADA da foto do canhoto — antes só existia uma foto no fluxo
-- inteiro. Guardada na MESMA linha de canhotos (não em tabela própria): o app
-- continua enviando as duas fotos + status numa única tentativa/transação
-- (mesmo client_id), então não há hoje um "registro de chegada" que sobrevive
-- independente de uma tentativa de entrega — se isso vier a ser necessário
-- (ex.: motorista chega mas só confirma status minutos depois), é um redesenho
-- maior da fila offline, fora do escopo deste item.
alter table public.canhotos add column if not exists foto_chegada_url text;

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
  p_ocorrencia_desc text default null,
  p_foto_chegada_url text default null
) returns table (ja_existia boolean)
language plpgsql
security invoker
as $$
declare
  v_status_nf text;
begin
  if p_client_id is null or p_client_id = '' then
    raise exception 'client_id é obrigatório';
  end if;
  if p_nota_fiscal_id is null then
    raise exception 'nota_fiscal_id é obrigatório';
  end if;
  if p_foto_chegada_url is null or p_foto_chegada_url = '' then
    raise exception 'foto de chegada é obrigatória';
  end if;

  if exists (select 1 from public.canhotos where client_id = p_client_id) then
    return query select true;
    return;
  end if;

  insert into public.canhotos (
    client_id, nota_fiscal_id, motorista_id, foto_url, foto_chegada_url, status,
    observacao, lat, lng, gps_precisao, sincronizado
  )
  values (
    p_client_id, p_nota_fiscal_id, auth.uid(), p_foto_url, p_foto_chegada_url, p_status,
    p_observacao, p_lat, p_lng, p_gps_precisao, true
  )
  on conflict (client_id) do nothing;

  if p_status = 'ocorrencia' and p_ocorrencia_tipo is not null then
    insert into public.ocorrencias (nota_fiscal_id, tipo, descricao, client_id)
    values (p_nota_fiscal_id, p_ocorrencia_tipo, p_ocorrencia_desc, p_client_id)
    on conflict (client_id) do nothing;
  end if;

  v_status_nf := case when p_status = 'aceita' then 'aceita' else 'pendente' end;

  update public.notas_fiscais
  set status       = v_status_nf,
      foto_url     = p_foto_url,
      entregue_em  = now(),
      observacao   = coalesce(p_observacao, observacao),
      romaneio_id  = case when p_status = 'aceita' then romaneio_id else null end,
      motorista_id = case when p_status = 'aceita' then motorista_id else null end
  where id = p_nota_fiscal_id;

  if not found then
    raise exception 'NF % não encontrada ou sem permissão de atualização', p_nota_fiscal_id;
  end if;

  return query select false;
end;
$$;
