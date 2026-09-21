-- 0033 — Resolver ocorrência que NÃO gera pendência devolve a NF para 'pendente'.
--
-- Contexto: na 0030, resolver_ocorrencia só mexia na NF quando era pendência
-- (canhoto retido / nota de devolução → 'aceita'). Cliente ausente, endereço não
-- encontrado e "outro" não entregam a mercadoria, então a NF ficava 'ocorrencia'
-- mesmo depois da gerência marcar a ocorrência como resolvida — a Carol via a
-- NF "resolvida" e ainda com o selo de problema.
--
-- Decisão do PO (21/09): resolvida = NF volta para 'pendente', pronta para ser
-- atribuída a um motorista numa nova tentativa. Só vale quando a ocorrência
-- resolvida é a MAIS RECENTE da NF: resolver uma tentativa antiga não pode
-- apagar o selo de uma ocorrência nova que ainda está aberta.
create or replace function public.resolver_ocorrencia(
  p_ocorrencia_id uuid,
  p_resolucao text,
  p_foto_url text default null
) returns table (nf_encerrada boolean)
language plpgsql
security invoker
as $$
declare
  v_nf uuid;
  v_tipo text;
  v_criada timestamptz;
  v_restantes int;
  v_e_a_ultima boolean;
begin
  if public.jwt_role() <> 'gerencia' then
    raise exception 'Apenas a gerência resolve ocorrências.';
  end if;
  if coalesce(p_resolucao, '') = '' then
    raise exception 'Descreva o que foi feito para resolver.';
  end if;

  -- `resolvida_em is null` no WHERE fecha a corrida entre duas abas: a segunda
  -- não encontra linha e recebe o aviso, em vez de sobrescrever a primeira.
  update public.ocorrencias
  set resolvida_em = now(),
      resolvida_por = auth.uid(),
      resolucao = p_resolucao,
      foto_resolucao_url = coalesce(p_foto_url, foto_resolucao_url)
  where id = p_ocorrencia_id and resolvida_em is null
  returning nota_fiscal_id, tipo, created_at into v_nf, v_tipo, v_criada;

  if v_nf is null then
    raise exception 'Ocorrência não encontrada ou já resolvida.';
  end if;

  if public.ocorrencia_gera_pendencia(v_tipo) then
    -- Uma NF pode ter mais de uma pendência (tentativas diferentes). Só encerra
    -- quando a última é resolvida.
    select count(*) into v_restantes
    from public.ocorrencias o
    where o.nota_fiscal_id = v_nf
      and o.resolvida_em is null
      and public.ocorrencia_gera_pendencia(o.tipo);

    if v_restantes = 0 then
      update public.notas_fiscais
      set status = 'aceita'
      where id = v_nf and status = 'pendencia';
      return query select found;
      return;
    end if;

    return query select false;
    return;
  end if;

  select not exists (
    select 1 from public.ocorrencias o
    where o.nota_fiscal_id = v_nf and o.created_at > v_criada
  ) into v_e_a_ultima;

  if v_e_a_ultima then
    update public.notas_fiscais
    set status = 'pendente'
    where id = v_nf and status = 'ocorrencia';
  end if;

  return query select false;
end;
$$;

revoke all on function public.resolver_ocorrencia(uuid, text, text) from public;
grant execute on function public.resolver_ocorrencia(uuid, text, text) to authenticated;

-- Ajuste dos dados que já existem: NF em 'ocorrencia' cuja ocorrência mais
-- recente é de tipo comum (não gera pendência) e já foi resolvida.
update public.notas_fiscais nf
set status = 'pendente'
where nf.status = 'ocorrencia'
  and exists (
    select 1 from public.ocorrencias o
    where o.nota_fiscal_id = nf.id
      and o.resolvida_em is not null
      and not public.ocorrencia_gera_pendencia(o.tipo)
      and not exists (
        select 1 from public.ocorrencias o2
        where o2.nota_fiscal_id = nf.id and o2.created_at > o.created_at
      )
  );
