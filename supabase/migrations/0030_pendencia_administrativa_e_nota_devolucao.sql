-- 0030 — Ocorrência que não volta para a fila vira PENDÊNCIA administrativa, e
-- `avaria` vira `nota_devolucao`.
--
-- CORRIGE A 0029. Na conversa de 17/09 a operação disse que canhoto retido "já
-- foi entregue", e a 0029 passou a marcar a NF como `aceita` na hora. Em 18/09,
-- ao explicar o caso completo, veio a regra de verdade:
--
--   "O canhoto fica retido porque faltou um item. O cliente não devolve o
--    documento até o item ser entregue. Assim que esse produto que faltou for
--    entregue e o canhoto for liberado, AÍ SIM ele fica como entregue
--    totalmente. Enquanto isso, ele tem que ficar com uma pendência."
--
-- Ou seja: `aceita` na hora estava errado — a entrega não terminou. Mas devolver
-- para a fila também está errado, porque a maior parte já foi entregue e ninguém
-- refaz a entrega inteira. É um terceiro estado, que não existia.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Status novo: `pendencia`
-- ─────────────────────────────────────────────────────────────────────────────
-- Nem "a entregar" nem "concluída": a mercadoria foi entregue (no todo ou em
-- parte) e sobrou uma pendência administrativa que alguém resolve fora do app.
--
-- Por que status novo e não uma coluna booleana: quem lê `status` precisa saber
-- a verdade sem consultar mais nada. Uma NF `ocorrencia` com flag escondida
-- continuaria aparecendo como "volta para a fila" em qualquer consulta que
-- alguém escrevesse depois sem conhecer a flag.
--
--   pendente   = nunca foi tentada
--   em_rota    = está com o motorista agora
--   ocorrencia = tentada, deu problema, VOLTA para a fila (cliente ausente…)
--   recusada   = cliente recusou, volta para tratativa
--   pendencia  = entregue, mas com pendência administrativa aberta  ← NOVO
--   aceita     = encerrada de verdade (único status final)
--
-- `pendencia` fica FORA de NF_STATUS_ABERTOS (lib/types.ts): não é trabalho de
-- entrega pendente e não pode ser reatribuída nem bipada. Vira `aceita` quando a
-- ocorrência é resolvida na tela de Ocorrências.
alter table public.notas_fiscais drop constraint if exists notas_fiscais_status_check;
alter table public.notas_fiscais add constraint notas_fiscais_status_check
  check (status in ('pendente','em_rota','aceita','recusada','ocorrencia','pendencia'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. `avaria` vira `nota_devolucao`; `item_faltando` deixa de existir
-- ─────────────────────────────────────────────────────────────────────────────
-- Pedido da operação em 18/09:
--
--   "Ao invés de avaria, vai ser nota de devolução. E aí nessa nota de devolução
--    a gente vai ter que explicar o motivo: por avaria, por data curta, porque
--    faltou produto."
--
-- O motivo passa a ser texto livre em `descricao` — avaria virou UM dos motivos,
-- não o rótulo.
--
--   "A gente pode eliminar esse item faltando do menu, deixar só como canhoto
--    retido, porque o canhoto só fica retido porque tem um item faltando."
--
-- `item_faltando` e `canhoto_retido` descreviam o mesmo evento por ângulos
-- diferentes. O que sobra é `canhoto_retido`: o que trava a baixa é o documento.
-- Os dados atuais são de teste (confirmado pelo PO), então a conversão é direta.
update public.ocorrencias set tipo = 'canhoto_retido' where tipo = 'item_faltando';
update public.ocorrencias set tipo = 'nota_devolucao' where tipo = 'avaria';

alter table public.ocorrencias drop constraint if exists ocorrencias_tipo_check;
alter table public.ocorrencias add constraint ocorrencias_tipo_check
  check (tipo in ('canhoto_retido','nota_devolucao','cliente_ausente','endereco_nao_encontrado','outro'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Quais tipos geram pendência
-- ─────────────────────────────────────────────────────────────────────────────
-- Função nomeada em vez de lista solta dentro da RPC: a mesma regra é consultada
-- pela resolução da ocorrência, e duas cópias divergem com o tempo.
create or replace function public.ocorrencia_gera_pendencia(p_tipo text)
returns boolean language sql immutable as $$
  -- Canhoto retido: mercadoria entregue, falta o documento assinado.
  -- Nota de devolução: mercadoria voltou, alguém resolve por fora e dá o ok.
  -- Nenhum dos dois manda o motorista refazer a entrega.
  select p_tipo in ('canhoto_retido', 'nota_devolucao')
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. A RPC do motorista
-- ─────────────────────────────────────────────────────────────────────────────
-- Base: versão de 11 argumentos da 0029. Muda só o destino da NF:
--   pendência  → status 'pendencia', SAI do romaneio (para o romaneio fechar) e
--                não volta para a fila;
--   demais     → comportamento de sempre (volta para a fila);
--   aceita     → inalterado.
--
-- Todos os três saem do romaneio quando não são 'aceita', então o fechamento
-- automático da 0024 continua valendo sem mudança.
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
  v_pendencia   boolean;
  v_status_nf   text;
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

  select nf.romaneio_id into v_romaneio_id
  from public.notas_fiscais nf where nf.id = p_nota_fiscal_id;

  -- Serializa entregas simultâneas do mesmo romaneio: quando duas NFs finais
  -- sincronizam juntas, a última transação sempre enxerga a anterior.
  if v_romaneio_id is not null then
    perform 1 from public.romaneios r where r.id = v_romaneio_id for update;
  end if;

  v_pendencia := p_status = 'ocorrencia'
    and public.ocorrencia_gera_pendencia(p_ocorrencia_tipo);
  v_status_nf := case when v_pendencia then 'pendencia' else p_status end;

  insert into public.canhotos (
    client_id, nota_fiscal_id, motorista_id, foto_url, foto_chegada_url, status,
    observacao, lat, lng, gps_precisao, sincronizado
  ) values (
    p_client_id, p_nota_fiscal_id, auth.uid(), p_foto_url, p_foto_chegada_url, p_status,
    p_observacao, p_lat, p_lng, p_gps_precisao, true
  )
  on conflict (client_id) do nothing;

  -- Ocorrência ANTES do update: mot_ocorrencia_insert exige
  -- notas_fiscais.motorista_id = auth.uid(), e o update abaixo zera esse campo.
  if p_status = 'ocorrencia' and p_ocorrencia_tipo is not null then
    insert into public.ocorrencias (nota_fiscal_id, tipo, descricao, client_id)
    values (p_nota_fiscal_id, p_ocorrencia_tipo, p_ocorrencia_desc, p_client_id)
    on conflict (client_id) do nothing;
  end if;

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

  if v_romaneio_id is not null and not exists (
    select 1 from public.notas_fiscais nf
    where nf.romaneio_id = v_romaneio_id and nf.status <> 'aceita'
  ) then
    update public.romaneios
    set status = 'fechado', fechado_em = coalesce(fechado_em, now())
    where id = v_romaneio_id and motorista_id = auth.uid() and status = 'ativo';
  end if;

  return query select false;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NF em pendência não pode ser assumida por bipagem
-- ─────────────────────────────────────────────────────────────────────────────
-- `assumir_nf_motorista` (0026/0027) só recusava NF 'aceita'. Sem isto, o
-- motorista bipa uma NF que está aguardando resolução administrativa e a puxa
-- de volta para a rota — exatamente o que esta migration existe para impedir.
create or replace function public.assumir_nf_motorista(
  p_numero text,
  p_chave text default null,
  p_confirmar_troca boolean default false
)
returns table (
  resultado             text,
  nf_id                 uuid,
  numero_nf             text,
  destinatario_nome     text,
  destinatario_endereco text,
  cidade                text,
  empresa_nome          text,
  motorista_anterior    text,
  romaneio_id           uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_nf         public.notas_fiscais%rowtype;
  v_empresa    text;
  v_anterior   text;
  v_rom        uuid;
  v_rom_antigo uuid;
begin
  if public.jwt_role() <> 'motorista' then
    raise exception 'Apenas motoristas podem assumir uma NF.';
  end if;
  if v_uid is null then
    raise exception 'Sessão inválida.';
  end if;
  if coalesce(p_numero, '') = '' and coalesce(p_chave, '') = '' then
    raise exception 'Código de barras inválido.';
  end if;

  if coalesce(p_chave, '') <> '' then
    select * into v_nf from public.notas_fiscais nf
    where nf.chave_acesso = p_chave
    order by nf.data_entrega desc limit 1;
  end if;

  if v_nf.id is null and coalesce(p_numero, '') <> '' then
    select * into v_nf from public.notas_fiscais nf
    where nf.numero_nf = p_numero
    order by nf.data_entrega desc limit 1;
  end if;

  if v_nf.id is null then
    return query select 'nao_encontrada'::text, null::uuid, null::text, null::text,
                        null::text, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  select e.nome into v_empresa
  from public.empresas_clientes e where e.id = v_nf.empresa_cliente_id;

  -- 'aceita' encerrou; 'pendencia' aguarda resolução administrativa. Nos dois
  -- casos a entrega não é refeita — a NF não volta para a rota por bipagem.
  if v_nf.status in ('aceita', 'pendencia') then
    return query select 'finalizada'::text, v_nf.id, v_nf.numero_nf,
                        v_nf.destinatario_nome, v_nf.destinatario_endereco,
                        v_nf.cidade, v_empresa, null::text, null::uuid;
    return;
  end if;

  if v_nf.motorista_id = v_uid then
    return query select 'ja_sua'::text, v_nf.id, v_nf.numero_nf,
                        v_nf.destinatario_nome, v_nf.destinatario_endereco,
                        v_nf.cidade, v_empresa, null::text, v_nf.romaneio_id;
    return;
  end if;

  if v_nf.motorista_id is not null then
    select u.nome into v_anterior from public.usuarios u where u.id = v_nf.motorista_id;
  end if;

  if v_nf.motorista_id is not null and not p_confirmar_troca then
    return query select 'confirmar_troca'::text, v_nf.id, v_nf.numero_nf,
                        v_nf.destinatario_nome, v_nf.destinatario_endereco,
                        v_nf.cidade, v_empresa, v_anterior, null::uuid;
    return;
  end if;

  select r.id into v_rom from public.romaneios r
  where r.motorista_id = v_uid and r.data = public.hoje_sp() and r.status = 'ativo'
  order by r.created_at limit 1;

  if v_rom is null then
    insert into public.romaneios (data, motorista_id, status, confirmado_em)
    values (public.hoje_sp(), v_uid, 'ativo', now())
    returning id into v_rom;
  else
    update public.romaneios set confirmado_em = coalesce(confirmado_em, now())
    where id = v_rom;
  end if;

  v_rom_antigo := v_nf.romaneio_id;

  perform set_config('app.assumindo_nf', 'on', true);
  update public.notas_fiscais
  set motorista_id = v_uid,
      romaneio_id  = v_rom,
      status       = 'em_rota',
      assumida_em  = now(),
      assumida_de  = v_nf.motorista_id,
      chave_acesso = coalesce(chave_acesso, nullif(p_chave, ''))
  where id = v_nf.id;
  perform set_config('app.assumindo_nf', 'off', true);

  if v_rom_antigo is not null and v_rom_antigo <> v_rom then
    delete from public.romaneios r
    where r.id = v_rom_antigo
      and not exists (select 1 from public.notas_fiscais n where n.romaneio_id = r.id);
  end if;

  return query select 'assumida'::text, v_nf.id, v_nf.numero_nf,
                      v_nf.destinatario_nome, v_nf.destinatario_endereco,
                      v_nf.cidade, v_empresa, v_anterior, v_rom;
end;
$$;

revoke all on function public.assumir_nf_motorista(text, text, boolean) from public;
grant execute on function public.assumir_nf_motorista(text, text, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Resolver a pendência encerra a NF
-- ─────────────────────────────────────────────────────────────────────────────
-- A gerência resolve na tela de Ocorrências. Numa transação só: marca a
-- ocorrência como resolvida e, se não sobrar nenhuma pendência aberta naquela
-- NF, promove a NF de 'pendencia' para 'aceita' — "aí sim ele fica como
-- entregue totalmente".
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
  v_restantes int;
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
  returning nota_fiscal_id into v_nf;

  if v_nf is null then
    raise exception 'Ocorrência não encontrada ou já resolvida.';
  end if;

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
  end if;

  return query select false;
end;
$$;

revoke all on function public.resolver_ocorrencia(uuid, text, text) from public;
grant execute on function public.resolver_ocorrencia(uuid, text, text) to authenticated;
