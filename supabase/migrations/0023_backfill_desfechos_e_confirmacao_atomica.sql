-- 0023 — Corrige NFs legadas que têm canhoto de recusa/ocorrência mas ficaram
-- como `pendente`, e torna a confirmação de romaneio uma operação atômica.

-- Backfill conservador: somente NF solta, ainda pendente, cujo ÚLTIMO canhoto
-- comprova um desfecho aberto. NFs sem canhoto e NFs aceitas não são tocadas.
with ultimo_canhoto as (
  select distinct on (c.nota_fiscal_id)
    c.nota_fiscal_id,
    c.status
  from public.canhotos c
  order by c.nota_fiscal_id, c.registrado_em desc, c.id desc
)
update public.notas_fiscais nf
set status = uc.status
from ultimo_canhoto uc
where nf.id = uc.nota_fiscal_id
  and nf.status = 'pendente'
  and nf.romaneio_id is null
  and nf.motorista_id is null
  and uc.status in ('recusada', 'ocorrencia');

-- Antes eram dois UPDATEs independentes na Server Action. Se o segundo falhasse,
-- o romaneio ficava confirmado enquanto as NFs continuavam pendentes.
create or replace function public.confirmar_romaneio_motorista(p_romaneio_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  update public.romaneios
  set status = 'ativo',
      confirmado_em = now()
  where id = p_romaneio_id
    and motorista_id = auth.uid();

  if not found then
    raise exception 'Romaneio não encontrado ou sem permissão para este motorista';
  end if;

  update public.notas_fiscais
  set status = 'em_rota'
  where romaneio_id = p_romaneio_id
    and status = 'pendente';
end;
$$;

revoke all on function public.confirmar_romaneio_motorista(uuid) from public;
grant execute on function public.confirmar_romaneio_motorista(uuid) to authenticated;
