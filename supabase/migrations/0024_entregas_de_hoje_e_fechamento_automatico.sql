-- 0024 — Fecha o romaneio automaticamente quando não restar NF aberta.
--
-- O app já calculava 100% usando apenas NFs aceitas, mas o status do romaneio
-- continuava `ativo` até uma ação manual da gerência. O fechamento agora faz
-- parte da mesma transação da entrega, evitando progresso e status divergentes.

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
  v_romaneio_id uuid;
begin
  if p_client_id is null or p_client_id = '' then
    raise exception 'client_id é obrigatório';
  end if;
  if p_nota_fiscal_id is null then
    raise exception 'nota_fiscal_id é obrigatório';
  end if;
  if p_foto_url is null or p_foto_url = '' then
    raise exception 'foto do canhoto é obrigatória';
  end if;
  if p_foto_chegada_url is null or p_foto_chegada_url = '' then
    raise exception 'foto de chegada é obrigatória';
  end if;

  if exists (select 1 from public.canhotos where client_id = p_client_id) then
    return query select true;
    return;
  end if;

  select nf.romaneio_id
    into v_romaneio_id
  from public.notas_fiscais nf
  where nf.id = p_nota_fiscal_id;

  -- Serializa entregas simultâneas do mesmo romaneio. Assim, quando duas NFs
  -- finais sincronizam juntas, a última transação sempre enxerga a anterior.
  if v_romaneio_id is not null then
    perform 1
    from public.romaneios r
    where r.id = v_romaneio_id
    for update;
  end if;

  insert into public.canhotos (
    client_id, nota_fiscal_id, motorista_id, foto_url, foto_chegada_url, status,
    observacao, lat, lng, gps_precisao, sincronizado
  ) values (
    p_client_id, p_nota_fiscal_id, auth.uid(), p_foto_url, p_foto_chegada_url, p_status,
    p_observacao, p_lat, p_lng, p_gps_precisao, true
  )
  on conflict (client_id) do nothing;

  if p_status = 'ocorrencia' and p_ocorrencia_tipo is not null then
    insert into public.ocorrencias (nota_fiscal_id, tipo, descricao, client_id)
    values (p_nota_fiscal_id, p_ocorrencia_tipo, p_ocorrencia_desc, p_client_id)
    on conflict (client_id) do nothing;
  end if;

  update public.notas_fiscais
  set status       = p_status,
      foto_url     = p_foto_url,
      entregue_em  = now(),
      observacao   = coalesce(p_observacao, observacao),
      romaneio_id  = case when p_status = 'aceita' then romaneio_id else null end,
      motorista_id = case when p_status = 'aceita' then motorista_id else null end
  where id = p_nota_fiscal_id;

  if not found then
    raise exception 'NF % não encontrada ou sem permissão de atualização', p_nota_fiscal_id;
  end if;

  -- Um romaneio termina quando todas as NFs que permaneceram vinculadas foram
  -- aceitas. Recusas/ocorrências já saem dele para reatribuição.
  if v_romaneio_id is not null and not exists (
    select 1
    from public.notas_fiscais nf
    where nf.romaneio_id = v_romaneio_id
      and nf.status <> 'aceita'
  ) then
    update public.romaneios
    set status = 'fechado',
        fechado_em = coalesce(fechado_em, now())
    where id = v_romaneio_id
      and motorista_id = auth.uid()
      and status = 'ativo';
  end if;

  return query select false;
end;
$$;

-- Corrige romaneios confirmados que já chegaram a 100% antes desta migration.
update public.romaneios r
set status = 'fechado',
    fechado_em = coalesce(r.fechado_em, now())
where r.status = 'ativo'
  and r.confirmado_em is not null
  and not exists (
    select 1
    from public.notas_fiscais nf
    where nf.romaneio_id = r.id
      and nf.status <> 'aceita'
  );
