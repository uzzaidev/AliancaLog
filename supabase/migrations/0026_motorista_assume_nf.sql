-- 0026 — O motorista assume a NF bipando o código de barras dela.
--
-- PEDIDO DO PO (Vítor, 06/09): a gerência não quer mais atribuir nota a nota na
-- mão. O motorista recebe a NF física, bipa o DANFE e a nota entra no romaneio
-- dele na hora. Decisões registradas (as quatro perguntas em aberto):
--   1. A NF já existe no sistema (importada por Excel/XML) — o motorista NÃO cria
--      NF nova bipando. Código desconhecido devolve `nao_encontrada`.
--   2. Vai para o romaneio do DIA dele: reaproveita o `ativo` de hoje se houver,
--      senão cria um. Já nasce confirmado (ele está com a nota na mão, em rota).
--   3. Entra na hora, sem aprovação da gerência — mas fica registrado QUEM assumiu
--      e QUANDO (`assumida_em`), e de quem foi tirada (`assumida_de`), para o
--      painel mostrar que a atribuição veio do motorista e não da gerência.
--   4. NF que já é de outro motorista exige confirmação explícita: a primeira
--      chamada devolve `confirmar_troca` com o nome do dono atual; só uma segunda
--      chamada com p_confirmar_troca = true efetiva a troca.
--
-- POR QUE PRECISA SER `security definer` E NÃO UMA POLICY NOVA:
-- `mot_nf_select` (migration 0021) enxerga só "NF minha ou NF em que eu registrei
-- canhoto". Uma NF de outro motorista — ou sem dono — é invisível para ele, e
-- `mot_nf_update` (última versão na 0016) exige `motorista_id = auth.uid()` na
-- linha ANTIGA (o USING) — ou seja, ele só alcança NF que já é dele. Abrir
-- isso via policy significaria deixar todo motorista LER todas as NFs do sistema
-- para poder achar a que ele bipou — exatamente o afrouxamento que a 0021 evitou.
-- A função abaixo faz a busca com os privilégios do dono, aplica as regras acima e
-- devolve apenas a NF bipada. O alcance continua sendo "a nota que está na mão
-- dele", não "todas as notas".

-- ── Rastro da auto-atribuição (é isso que a gerência vê no painel) ────────────
alter table public.notas_fiscais
  add column if not exists assumida_em timestamptz;
alter table public.notas_fiscais
  add column if not exists assumida_de uuid references public.motoristas(id);

comment on column public.notas_fiscais.assumida_em is
  'Quando o próprio motorista assumiu a NF bipando (null = atribuída pela gerência).';
comment on column public.notas_fiscais.assumida_de is
  'Motorista de quem a NF foi tirada na auto-atribuição, quando houve troca.';

-- ── Guard do motorista precisa liberar ESTE caminho ──────────────────────────
-- ⚠️ A versão EM VIGOR de `nf_guard_motorista` é a da migration `0016`, NÃO a da
-- `0009` — a 0016 (A-007) reescreveu a função para: (a) bloquear só depois de
-- 'aceita', não mais em recusada/ocorrencia, e (b) incluir romaneio_id e
-- motorista_id na whitelist, para a NF poder voltar ao painel. O corpo abaixo é o
-- da 0016 verbatim + a liberação nova. Copiar da 0009 aqui reverteria as duas
-- coisas e quebraria o fluxo de reentrega inteiro.
--
-- O que a whitelist da 0016 ainda NÃO cobre e a bipagem precisa mexer:
-- `assumida_em`, `assumida_de` e `chave_acesso`. Em vez de afrouxar a whitelist
-- permanentemente para essas três (o motorista passaria a poder reescrever a chave
-- de acesso de qualquer NF dele, num UPDATE comum), a liberação é uma flag
-- TRANSACTION-LOCAL (`set_config(..., true)`), setada só dentro da RPC e zerada
-- logo depois.
--
-- Por que não é buraco: `set_config` vive em `pg_catalog`, que o PostgREST não
-- expõe — ele só alcança funções do schema `public`. E mesmo que alcançasse,
-- `mot_nf_update` continuaria barrando UPDATE em linha que não é dele.
create or replace function public.nf_guard_motorista()
returns trigger language plpgsql as $$
begin
  if public.jwt_role() <> 'motorista' then
    return new;
  end if;

  -- Auto-atribuição por bipagem (assumir_nf_motorista): a RPC valida tudo antes,
  -- inclusive recusar NF já aceita.
  if coalesce(current_setting('app.assumindo_nf', true), '') = 'on' then
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

-- ── A RPC ────────────────────────────────────────────────────────────────────
-- `resultado` é o contrato com a UI:
--   assumida        → entrou no romaneio dele
--   confirmar_troca → é de outro motorista; UI pergunta e rechama com true
--   ja_sua          → já estava com ele (bipe repetido)
--   finalizada      → já foi entregue/aceita, não se reabre
--   nao_encontrada  → código não bate com nenhuma NF do sistema
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

  -- 1) Match exato pela chave de acesso; número é o fallback (NF importada por
  --    Excel não tem chave). Desempate pelo mais recente, igual ao buscarNf da
  --    gerência — sem filtro de data, senão NF de romaneio antigo "não existe".
  if coalesce(p_chave, '') <> '' then
    select * into v_nf
    from public.notas_fiscais
    where chave_acesso = p_chave
    order by data_entrega desc
    limit 1;
  end if;

  if v_nf.id is null and coalesce(p_numero, '') <> '' then
    select * into v_nf
    from public.notas_fiscais
    where numero_nf = p_numero
    order by data_entrega desc
    limit 1;
  end if;

  if v_nf.id is null then
    return query select 'nao_encontrada'::text, null::uuid, null::text, null::text,
                        null::text, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  select e.nome into v_empresa
  from public.empresas_clientes e
  where e.id = v_nf.empresa_cliente_id;

  -- 2) NF já entregue não volta atrás por bipagem.
  if v_nf.status = 'aceita' then
    return query select 'finalizada'::text, v_nf.id, v_nf.numero_nf,
                        v_nf.destinatario_nome, v_nf.destinatario_endereco,
                        v_nf.cidade, v_empresa, null::text, null::uuid;
    return;
  end if;

  -- 3) Bipe repetido da mesma nota — não é erro, só não faz nada.
  if v_nf.motorista_id = v_uid then
    return query select 'ja_sua'::text, v_nf.id, v_nf.numero_nf,
                        v_nf.destinatario_nome, v_nf.destinatario_endereco,
                        v_nf.cidade, v_empresa, null::text, v_nf.romaneio_id;
    return;
  end if;

  if v_nf.motorista_id is not null then
    select u.nome into v_anterior
    from public.usuarios u
    where u.id = v_nf.motorista_id;
  end if;

  -- 4) É de outro motorista: primeira passada só avisa.
  if v_nf.motorista_id is not null and not p_confirmar_troca then
    return query select 'confirmar_troca'::text, v_nf.id, v_nf.numero_nf,
                        v_nf.destinatario_nome, v_nf.destinatario_endereco,
                        v_nf.cidade, v_empresa, v_anterior, null::uuid;
    return;
  end if;

  -- 5) Romaneio do dia dele. Só reaproveita `ativo`: um já fechado (inclusive
  --    pelo fechamento automático da 0024) não reabre — cria outro.
  select r.id into v_rom
  from public.romaneios r
  where r.motorista_id = v_uid
    and r.data = public.hoje_sp()
    and r.status = 'ativo'
  order by r.created_at
  limit 1;

  if v_rom is null then
    -- Nasce confirmado: ele está com a nota na mão, já está em rota. Isso também
    -- liga o PosicaoTracker, que exige romaneio ativo + confirmado.
    insert into public.romaneios (data, motorista_id, status, confirmado_em)
    values (public.hoje_sp(), v_uid, 'ativo', now())
    returning id into v_rom;
  else
    update public.romaneios
    set confirmado_em = coalesce(confirmado_em, now())
    where id = v_rom;
  end if;

  v_rom_antigo := v_nf.romaneio_id;

  -- 6) Assume. `chave_acesso` é enriquecida quando a NF veio do Excel sem chave e
  --    acabou de ser bipada — próximos matches passam a ser exatos.
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

  -- 7) Romaneio de origem que ficou vazio não vira fantasma (mesmo tratamento do
  --    trocarMotorista da gerência).
  if v_rom_antigo is not null and v_rom_antigo <> v_rom then
    delete from public.romaneios r
    where r.id = v_rom_antigo
      and not exists (
        select 1 from public.notas_fiscais n where n.romaneio_id = r.id
      );
  end if;

  return query select 'assumida'::text, v_nf.id, v_nf.numero_nf,
                      v_nf.destinatario_nome, v_nf.destinatario_endereco,
                      v_nf.cidade, v_empresa, v_anterior, v_rom;
end;
$$;

revoke all on function public.assumir_nf_motorista(text, text, boolean) from public;
grant execute on function public.assumir_nf_motorista(text, text, boolean) to authenticated;
