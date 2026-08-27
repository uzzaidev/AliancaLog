-- 0022 — A NF passa a mostrar o DESFECHO da última tentativa, em vez de virar
-- sempre 'pendente'. Decisão do PO (Vítor) em 27/08, refinando o A-007.
--
-- CONTEXTO — o que estava errado na experiência de uso:
--   O A-007 (migration 0016) devolve ao painel toda nota que não é 'aceita', para
--   nova tentativa. Só que ele também FORÇAVA o status para 'pendente':
--       v_status_nf := case when p_status = 'aceita' then 'aceita' else 'pendente' end;
--   Resultado: a gerência via "Pendente" numa nota em que o motorista tinha
--   registrado "cliente ausente" — o desfecho existia só em canhotos.status, invisível
--   na listagem. Na reunião de 27/08 isso apareceu como se fosse bug (D-003).
--
-- A CORREÇÃO — separar dois conceitos que estavam colapsados no mesmo campo:
--
--   "voltar ao painel"  → romaneio_id / motorista_id nulos  (não mudou nada aqui)
--   "o que aconteceu"   → status                            (agora reflete a verdade)
--
--   pendente   = nunca foi tentada
--   em_rota    = está com o motorista agora
--   ocorrencia = tentada, deu problema, precisa de nova tentativa
--   recusada   = tentada, cliente recusou, precisa de tratativa
--   aceita     = ÚNICO status final
--
-- `ocorrencia` e `recusada` continuam sendo "a fazer": entram em NF_STATUS_ABERTOS
-- (lib/types.ts) junto com pendente/em_rota. Nada que dependia de "voltar ao painel"
-- muda, porque isso nunca dependeu do status.
--
-- Não precisa mexer no CHECK de notas_fiscais.status: a migration 0008 já aceita
-- ('pendente','em_rota','aceita','recusada','ocorrencia').
--
-- SEM BACKFILL DE VOLTA, de propósito: a 0016 normalizou para 'pendente' as notas que
-- estavam presas em recusada/ocorrencia. Não dá para saber, hoje, quais delas eram
-- "nunca tentada" e quais eram "deu problema" — o histórico está em canhotos, mas
-- reconstruir isso arriscaria rotular errado. As notas antigas seguem 'pendente';
-- daqui pra frente o status conta a história certa.

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

  -- Idempotência por TENTATIVA (client_id): reenvio do mesmo registro é no-op;
  -- tentativa nova na mesma NF é permitida.
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

  -- Ocorrência ANTES do update da NF: mot_ocorrencia_insert exige
  -- notas_fiscais.motorista_id = auth.uid(), e o update abaixo zera esse campo.
  if p_status = 'ocorrencia' and p_ocorrencia_tipo is not null then
    insert into public.ocorrencias (nota_fiscal_id, tipo, descricao, client_id)
    values (p_nota_fiscal_id, p_ocorrencia_tipo, p_ocorrencia_desc, p_client_id)
    on conflict (client_id) do nothing;
  end if;

  -- MUDANÇA DESTA MIGRATION: grava o desfecho real (p_status) em vez de achatar
  -- tudo que não é 'aceita' em 'pendente'. A devolução ao painel continua sendo
  -- feita zerando romaneio_id/motorista_id, exatamente como antes.
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

  return query select false;
end;
$$;
