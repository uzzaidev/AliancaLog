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
