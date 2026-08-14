-- 0016 — A-007: NF não aceita volta para o painel; múltiplas tentativas por NF.
--
-- Decisão do PO (encaminhamentos/luis-fernando-boff.md § A-007, sobrescreve D-006
-- da ata de 12/08): TUDO que não é 'aceita' (recusada, qualquer tipo de ocorrência)
-- devolve a NF ao painel, disponível para nova tentativa de entrega. Nenhuma
-- entrega encerra sem ser aceita.
--
-- Isso reverte três invariantes que a migration 0009 tinha fixado (por boas razões
-- na época — pré-piloto, antes desta decisão de produto):
--   1. uq_canhoto_nf: no máximo 1 canhoto por NF → vira múltiplos por NF, um por
--      tentativa. A idempotência real já era por client_id (uq_canhoto_client_id);
--      agora ela também vira A checagem de negócio, não só uma trava técnica.
--   2. nf_guard_motorista: a whitelist de colunas não incluía romaneio_id/
--      motorista_id — o motorista (via a função abaixo) precisa poder limpar os
--      dois quando a tentativa não é 'aceita', pra NF voltar a aparecer como
--      "não atribuída" no painel da gerência.
--   3. registrar_entrega_offline: idempotência checava "existe canhoto para esta
--      NF" → vira "existe canhoto para este client_id" (reenvio de rede continua
--      no-op; NOVA tentativa, client_id novo, passa a ser aceita mesmo se já
--      existe canhoto de tentativa anterior).
--
-- app/api/sync/route.ts tem a MESMA checagem replicada como saída rápida (antes
-- de chamar a RPC) — também precisa mudar de nota_fiscal_id para client_id, senão
-- a 2ª tentativa nunca chega a entrar na função de novo (ver comentário lá).

-- ── 1. Múltiplos canhotos por NF ───────────────────────────────────────────────
drop index if exists public.uq_canhoto_nf;

-- Cada tentativa tem sua própria observação livre (aceita/recusada). Antes só
-- existia notas_fiscais.observacao — um valor só, que a 2ª tentativa sobrescrevia
-- apagando o que a 1ª tinha registrado.
alter table public.canhotos add column if not exists observacao text;

-- ── 2. Whitelist do motorista ganha romaneio_id/motorista_id ──────────────────
-- Continua imutável, mas só depois de 'aceita' — 'recusada'/'ocorrencia' deixam
-- de ser estado final da NF (viram só o resultado registrado NESTA tentativa,
-- em canhotos.status; a NF em si volta pra 'pendente').
create or replace function public.nf_guard_motorista()
returns trigger language plpgsql as $$
begin
  if public.jwt_role() <> 'motorista' then
    return new;
  end if;

  if old.status = 'aceita' then
    raise exception 'NF % já aceita — não pode ser alterada.', old.numero_nf;
  end if;

  if (to_jsonb(new) - 'status' - 'foto_url' - 'entregue_em' - 'observacao'
        - 'updated_at' - 'romaneio_id' - 'motorista_id')
     is distinct from
     (to_jsonb(old) - 'status' - 'foto_url' - 'entregue_em' - 'observacao'
        - 'updated_at' - 'romaneio_id' - 'motorista_id')
  then
    raise exception 'Motorista só pode alterar status/foto/observação/atribuição da NF.';
  end if;

  return new;
end;
$$;
-- trg_nf_guard_motorista já aponta pra esta function — create or replace basta.

-- WITH CHECK de mot_nf_update exigia motorista_id = auth.uid() na linha NOVA;
-- ao zerar motorista_id numa tentativa não aceita, a própria função abaixo
-- (rodando como o motorista, security invoker) seria bloqueada por RLS sem este
-- ajuste.
drop policy if exists mot_nf_update on public.notas_fiscais;
create policy mot_nf_update on public.notas_fiscais for update
  using (public.jwt_role() = 'motorista' and motorista_id = auth.uid())
  with check (motorista_id = auth.uid() or motorista_id is null);

-- ── 3. registrar_entrega_offline: idempotência por tentativa + "volta ao painel" ──
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
declare
  v_status_nf text;
begin
  if p_client_id is null or p_client_id = '' then
    raise exception 'client_id é obrigatório';
  end if;
  if p_nota_fiscal_id is null then
    raise exception 'nota_fiscal_id é obrigatório';
  end if;

  -- Idempotência por TENTATIVA (client_id), não mais por NF: reenvio de rede do
  -- MESMO registro é no-op; uma NOVA tentativa (client_id novo) é permitida mesmo
  -- que a NF já tenha canhoto de tentativa(s) anterior(es).
  if exists (select 1 from public.canhotos where client_id = p_client_id) then
    return query select true;
    return;
  end if;

  insert into public.canhotos (
    client_id, nota_fiscal_id, motorista_id, foto_url, status,
    observacao, lat, lng, gps_precisao, sincronizado
  )
  values (
    p_client_id, p_nota_fiscal_id, auth.uid(), p_foto_url, p_status,
    p_observacao, p_lat, p_lng, p_gps_precisao, true
  )
  on conflict (client_id) do nothing;

  -- Ocorrência é inserida ANTES do update da NF (abaixo): mot_ocorrencia_insert
  -- checa notas_fiscais.motorista_id = auth.uid() — se a NF já tivesse sido
  -- desatribuída antes desta inserção, a RLS bloquearia a própria ocorrência.
  if p_status = 'ocorrencia' and p_ocorrencia_tipo is not null then
    insert into public.ocorrencias (nota_fiscal_id, tipo, descricao, client_id)
    values (p_nota_fiscal_id, p_ocorrencia_tipo, p_ocorrencia_desc, p_client_id)
    on conflict (client_id) do nothing;
  end if;

  -- 'aceita' encerra a NF; qualquer outro desfecho devolve pro painel — sai do
  -- romaneio e da posse do motorista, pronta pra gerência reatribuir (A-001/A-005
  -- já fazem essas NFs reaparecerem como "aguardando" nas telas existentes).
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

-- ── 4. Backfill de NFs que já estavam paradas em 'recusada'/'ocorrencia' ──────
-- Sem isso, uma NF nesse estado de antes desta migration ficaria presa para
-- sempre: STATUS_FINAIS (app) não reconhece mais recusada/ocorrencia como
-- final, e nenhuma escrita nova passa a transicioná-la (o novo fluxo só toca
-- NFs a partir de uma nova tentativa de entrega). Alinha o dado existente ao
-- mesmo invariante que a função acima passa a garantir daqui pra frente.
update public.notas_fiscais
set status = 'pendente', romaneio_id = null, motorista_id = null
where status in ('recusada', 'ocorrencia');
