-- 0027 — Correção da ambiguidade de colunas na RPC assumir_nf_motorista.
-- O retorno de RETURNS TABLE (numero_nf text, ...) colide no escopo da função PL/pgSQL
-- com a coluna `where numero_nf = p_numero` da tabela notas_fiscais.
-- Qualifica as referências para notas_fiscais / nf.

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
    from public.notas_fiscais nf
    where nf.chave_acesso = p_chave
    order by nf.data_entrega desc
    limit 1;
  end if;

  if v_nf.id is null and coalesce(p_numero, '') <> '' then
    select * into v_nf
    from public.notas_fiscais nf
    where nf.numero_nf = p_numero
    order by nf.data_entrega desc
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
  where public.notas_fiscais.id = v_nf.id;
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

