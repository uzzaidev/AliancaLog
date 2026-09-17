-- 0031 — Refaturamento: substituir uma NF por outra, e cancelar sem substituir.
--
-- PEDIDO DA OPERAÇÃO (Carol/Travizão via Matheus, 18–19/09):
--
--   "Às vezes as notas são refaturadas. Teria como entrar naquela nota que já
--    está carregada no aplicativo e botar pra substituir ela, carregando o XML?
--    Pra não precisar excluir e carregar de novo."
--
--   "Pode substituir a que está em rota, porque geralmente acontece de a gente
--    ter que refaturar quando ele já está lá no cliente."
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. O problema que isto resolve
-- ─────────────────────────────────────────────────────────────────────────────
-- NF-e autorizada não se edita: cancela-se e emite-se outra, com número e chave
-- novos. Hoje só havia dois caminhos, e os dois falham:
--
--   • excluir e reimportar → some o rastro, e o romaneio perde uma nota no meio
--     do dia sem explicação;
--   • importar como avulsa → cai no painel sem motorista, e o motorista que está
--     na porta do cliente não a enxerga.
--
-- A substituição É o vínculo: quando o embarcador diz "esta substitui aquela",
-- já disse que é a mesma entrega, do mesmo cliente, com o mesmo motorista. Por
-- isso a NF nova HERDA romaneio_id, motorista_id e data_entrega da antiga —
-- o motorista abre o app e ela já está lá, no lugar da antiga.
--
-- Bipar não resolveria este caso: o motorista está com o papel da nota ANTIGA;
-- a nova acabou de sair da impressora no escritório do embarcador.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Dois status, porque são duas mensagens diferentes para o motorista
-- ─────────────────────────────────────────────────────────────────────────────
--   substituida → veio outra nota no lugar; ele ESPERA a nova aparecer
--   cancelada   → o pedido caiu; ele NÃO entrega e vai embora
--
-- Um status só ("cancelada" para os dois casos) deixaria o motorista sem saber
-- se espera ou se vai embora — o Matheus levantou exatamente esse ponto.
-- Nenhum dos dois é entregável nem volta para a fila.
alter table public.notas_fiscais drop constraint if exists notas_fiscais_status_check;
alter table public.notas_fiscais add constraint notas_fiscais_status_check
  check (status in (
    'pendente','em_rota','aceita','recusada','ocorrencia','pendencia',
    'substituida','cancelada'
  ));

alter table public.notas_fiscais
  add column if not exists substituida_por uuid references public.notas_fiscais(id),
  add column if not exists encerrada_em timestamptz,
  add column if not exists encerrada_por uuid references public.usuarios(id),
  add column if not exists motivo_encerramento text;

comment on column public.notas_fiscais.substituida_por is
  'NF que tomou o lugar desta no refaturamento (null em cancelamento simples).';
comment on column public.notas_fiscais.motivo_encerramento is
  'Por que foi cancelada/substituída — texto do embarcador.';

-- A NF nova aponta para a antiga pela coluna acima; este índice serve à tela,
-- que precisa do caminho inverso ("esta nota substituiu qual?").
create index if not exists idx_nf_substituida_por
  on public.notas_fiscais (substituida_por)
  where substituida_por is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Quem pode fazer
-- ─────────────────────────────────────────────────────────────────────────────
-- Decisão do Matheus em 19/09: a Carol (cliente_final) substitui sozinha.
--
-- Isso NÃO é feito abrindo um UPDATE para o cliente em notas_fiscais — seria
-- amplo demais: ela passaria a poder alterar qualquer campo de qualquer NF da
-- empresa dela, inclusive as já entregues. As duas RPCs abaixo são
-- `security definer` e fazem a validação inteira dentro: só NF da própria
-- empresa, só o que ainda não foi entregue, e só estas duas operações.
-- Mesmo padrão de `assumir_nf_motorista` (0026).

create or replace function public.nf_pode_encerrar(p_status text)
returns boolean language sql immutable as $$
  -- Entregue não se cancela nem se refatura: "ela já está entregue, não vai ser
  -- cancelada". `pendencia` também já teve a entrega feita.
  select p_status in ('pendente', 'em_rota', 'ocorrencia', 'recusada')
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Substituir (refaturamento)
-- ─────────────────────────────────────────────────────────────────────────────
-- Uma transação: cria a NF nova herdando a rota da antiga e marca a antiga como
-- substituída. Se qualquer parte falhar, nada acontece — nunca fica uma NF nova
-- solta sem a antiga encerrada, nem o contrário.
create or replace function public.substituir_nota_fiscal(
  p_nf_antiga uuid,
  p_numero_nf text,
  p_destinatario_nome text,
  p_destinatario_endereco text,
  p_chave_acesso text default null,
  p_cidade text default null,
  p_motivo text default null
) returns table (nf_nova uuid, herdou_romaneio boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_antiga public.notas_fiscais%rowtype;
  v_papel  text := public.jwt_role();
  v_nova   uuid;
begin
  if v_papel not in ('cliente_final', 'gerencia') then
    raise exception 'Sem permissão para substituir NF.';
  end if;
  if coalesce(p_numero_nf, '') = '' then
    raise exception 'Informe o número da nota nova.';
  end if;
  if coalesce(p_destinatario_nome, '') = '' or coalesce(p_destinatario_endereco, '') = '' then
    raise exception 'A nota nova precisa de destinatário e endereço.';
  end if;

  select * into v_antiga from public.notas_fiscais where id = p_nf_antiga;
  if v_antiga.id is null then
    raise exception 'Nota original não encontrada.';
  end if;

  -- O embarcador só mexe no que é dele. A gerência opera tudo.
  if v_papel = 'cliente_final'
     and v_antiga.empresa_cliente_id is distinct from public.jwt_empresa_id() then
    raise exception 'Essa nota não é da sua empresa.';
  end if;

  if not public.nf_pode_encerrar(v_antiga.status) then
    raise exception 'NF % não pode ser substituída (situação: %).',
      v_antiga.numero_nf, v_antiga.status;
  end if;

  -- A nova nasce no lugar exato da antiga: mesmo romaneio, mesmo motorista,
  -- mesma data. É isso que faz ela aparecer no app do motorista que já está no
  -- cliente, sem ninguém precisar atribuir nada.
  insert into public.notas_fiscais (
    numero_nf, chave_acesso, empresa_cliente_id,
    destinatario_nome, destinatario_endereco, cidade,
    data_entrega, status, romaneio_id, motorista_id, origem_importacao
  ) values (
    p_numero_nf, nullif(p_chave_acesso, ''), v_antiga.empresa_cliente_id,
    p_destinatario_nome, p_destinatario_endereco,
    coalesce(nullif(p_cidade, ''), v_antiga.cidade),
    v_antiga.data_entrega,
    -- Se a antiga já estava com o motorista, a nova entra em rota direto.
    case when v_antiga.romaneio_id is not null then 'em_rota' else 'pendente' end,
    -- origem_importacao só aceita gerencia|cliente (0008): a nova herda a da
    -- antiga, que é de onde a entrega veio de fato.
    v_antiga.romaneio_id, v_antiga.motorista_id, v_antiga.origem_importacao
  )
  returning id into v_nova;

  update public.notas_fiscais
  set status              = 'substituida',
      substituida_por     = v_nova,
      encerrada_em        = now(),
      encerrada_por       = auth.uid(),
      motivo_encerramento = p_motivo,
      romaneio_id         = null,
      motorista_id        = null
  where id = p_nf_antiga;

  return query select v_nova, v_antiga.romaneio_id is not null;
end;
$$;

revoke all on function public.substituir_nota_fiscal(uuid, text, text, text, text, text, text) from public;
grant execute on function public.substituir_nota_fiscal(uuid, text, text, text, text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Cancelar (sem substituição)
-- ─────────────────────────────────────────────────────────────────────────────
-- "Sim, existe cancelar sem substituir" — Matheus, 19/09. O pedido caiu: não há
-- nota nova e o motorista não entrega nada.
create or replace function public.cancelar_nota_fiscal(
  p_nf uuid,
  p_motivo text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nf    public.notas_fiscais%rowtype;
  v_papel text := public.jwt_role();
begin
  if v_papel not in ('cliente_final', 'gerencia') then
    raise exception 'Sem permissão para cancelar NF.';
  end if;
  if coalesce(p_motivo, '') = '' then
    raise exception 'Informe o motivo do cancelamento.';
  end if;

  select * into v_nf from public.notas_fiscais where id = p_nf;
  if v_nf.id is null then
    raise exception 'Nota não encontrada.';
  end if;
  if v_papel = 'cliente_final'
     and v_nf.empresa_cliente_id is distinct from public.jwt_empresa_id() then
    raise exception 'Essa nota não é da sua empresa.';
  end if;
  if not public.nf_pode_encerrar(v_nf.status) then
    raise exception 'NF % não pode ser cancelada (situação: %).',
      v_nf.numero_nf, v_nf.status;
  end if;

  update public.notas_fiscais
  set status              = 'cancelada',
      encerrada_em        = now(),
      encerrada_por       = auth.uid(),
      motivo_encerramento = p_motivo,
      romaneio_id         = null,
      motorista_id        = null
  where id = p_nf;
end;
$$;

revoke all on function public.cancelar_nota_fiscal(uuid, text) from public;
grant execute on function public.cancelar_nota_fiscal(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Nota encerrada não volta para a rota por bipagem
-- ─────────────────────────────────────────────────────────────────────────────
-- Mesmo cuidado da 0030 com `pendencia`: sem isto o motorista bipa uma NF
-- substituída ou cancelada e a traz de volta para o romaneio.
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

  -- 'aceita' encerrou · 'pendencia' aguarda resolução (0030) ·
  -- 'substituida'/'cancelada' saíram de circulação (0031). Nenhuma volta à rota.
  if v_nf.status in ('aceita', 'pendencia', 'substituida', 'cancelada') then
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
