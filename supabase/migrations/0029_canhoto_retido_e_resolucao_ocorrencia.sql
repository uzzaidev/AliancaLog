-- 0029 — Canhoto retido não volta para a fila de entrega, e ocorrência passa a
-- ter resolução formal. Também remove um overload morto da RPC.
--
-- PEDIDO DA OPERAÇÃO (Carol, via Matheus, 17/09), decidido pelo PO:
--
--   "Ela tem que voltar para a entrega somente quando NÃO for canhoto retido.
--    Se for canhoto retido, ela não pode voltar para a entrega, porque essa nota
--    já foi entregue."
--
--   "Quando tem a ocorrência de canhoto retido, a gente precisa ter uma opção
--    depois de ir lá e resolver. Tipo: editado, mercadoria entregue tal dia."
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Por que `canhoto_retido` passa a encerrar a NF como `aceita`
-- ─────────────────────────────────────────────────────────────────────────────
-- Canhoto retido = a MERCADORIA FOI ENTREGUE e o cliente ficou com a via
-- assinada. Falta papel, não entrega. Desde o A-007 (0016) tudo que não era
-- 'aceita' zerava romaneio_id/motorista_id e voltava ao painel — o que mandaria
-- o motorista entregar de novo algo já entregue.
--
-- A alternativa óbvia — deixar a NF no romaneio com status 'ocorrencia' — não
-- funciona: o fechamento automático (0024, preservado abaixo) só fecha o
-- romaneio quando não resta NF vinculada fora de 'aceita'. A NF presa em
-- 'ocorrencia' deixaria o romaneio aberto para sempre, e o motorista terminaria
-- o dia com entrega pendente na tela.
--
-- Então a NF fica 'aceita' (entrega concluída, romaneio fecha, não volta para a
-- fila) e a PENDÊNCIA passa a viver em `ocorrencias`, aberta até ser resolvida.
--
-- Os demais tipos (cliente_ausente, endereco_nao_encontrado, avaria,
-- item_faltando, outro) continuam voltando ao painel exatamente como antes.

alter table public.ocorrencias
  add column if not exists resolvida_em timestamptz,
  add column if not exists resolvida_por uuid references public.usuarios(id),
  add column if not exists resolucao text,
  add column if not exists foto_resolucao_url text;

comment on column public.ocorrencias.resolvida_em is
  'Quando a pendência foi resolvida pela gerência (null = ainda aberta).';
comment on column public.ocorrencias.resolucao is
  'O que foi feito — ex.: "mercadoria entregue dia 12/09".';
comment on column public.ocorrencias.foto_resolucao_url is
  'Caminho no bucket `canhotos` da foto do canhoto assinado que fecha a pendência. '
  'Exigida ao resolver: o canhoto retido é justamente a prova que faltou na entrega.';

-- A tela de ocorrências abertas filtra por resolvida_em is null e ordena pelas
-- mais antigas — as que estão apodrecendo aparecem primeiro.
create index if not exists idx_ocorrencias_abertas
  on public.ocorrencias (created_at)
  where resolvida_em is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Overload morto da RPC — risco latente, removido
-- ─────────────────────────────────────────────────────────────────────────────
-- A 0018 acrescentou `p_foto_chegada_url` e criou uma assinatura NOVA, sem
-- derrubar a antiga de 10 argumentos. As duas conviviam no banco. A antiga é
-- perigosa: não exige foto de chegada, achata todo desfecho em 'pendente'
-- (comportamento pré-0022) e não tem o fechamento automático da 0024. Bastaria
-- um chamador omitir o último argumento para o Postgres resolver nela.
drop function if exists public.registrar_entrega_offline(
  text, uuid, text, text, double precision, double precision, real, text, text, text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. A RPC passa a distinguir canhoto retido
-- ─────────────────────────────────────────────────────────────────────────────
-- Base: a versão de 11 argumentos em produção (0024). Só duas coisas mudam:
--   a) `v_entregue` — canhoto retido conta como entrega concluída;
--   b) status/romaneio_id/motorista_id passam a derivar de `v_entregue` em vez
--      de comparar p_status com 'aceita' direto. Sem isso a NF ficaria 'aceita'
--      porém solta do romaneio, e o fechamento automático nunca dispararia.
-- Todo o resto (idempotência, trava do romaneio, ordem das inserções) é o
-- mesmo — ver 0011, 0016, 0020, 0021, 0022 e 0024 para o porquê de cada parte.
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
  v_entregue    boolean;
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

  -- NOVO: canhoto retido encerra a entrega (ver cabeçalho).
  v_entregue := p_status = 'aceita'
    or (p_status = 'ocorrencia' and p_ocorrencia_tipo = 'canhoto_retido');

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
  set status       = case when v_entregue then 'aceita' else p_status end,
      foto_url     = p_foto_url,
      entregue_em  = now(),
      observacao   = coalesce(p_observacao, observacao),
      romaneio_id  = case when v_entregue then romaneio_id else null end,
      motorista_id = case when v_entregue then motorista_id else null end
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
