-- 0009 — Endurecimento de confiabilidade/segurança pré-piloto (Sprint 3.5):
--   (a) Sync idempotente de ponta a ponta: ocorrência não duplica no reenvio e
--       cada NF tem no máximo UM canhoto.
--   (b) Imutabilidade: uma NF finalizada não é mais alterável pelo motorista, e o
--       motorista só mexe em status/foto/observação (nunca destinatário, etc.).
--   (c) RLS mais restrita: canhoto só na própria NF, em romaneio ATIVO; romaneio
--       fechado não reabre.

-- ── (a.1) Ocorrência idempotente pelo client_id do canhoto ─────────────────────
alter table public.ocorrencias add column if not exists client_id text;
-- Índice único NÃO-parcial: múltiplos NULL são permitidos (ocorrências antigas),
-- mas o ON CONFLICT (client_id) do /api/sync funciona (precisa de índice pleno).
create unique index if not exists uq_ocorrencia_client_id
  on public.ocorrencias (client_id);

-- ── (a.2) No máximo um canhoto por NF ──────────────────────────────────────────
-- Dedup defensivo antes do índice: mantém o canhoto mais antigo de cada NF
-- (desempate por id) e remove os demais.
delete from public.canhotos c
  using public.canhotos d
  where c.nota_fiscal_id = d.nota_fiscal_id
    and (c.created_at > d.created_at
      or (c.created_at = d.created_at and c.id > d.id));
create unique index if not exists uq_canhoto_nf
  on public.canhotos (nota_fiscal_id);

-- ── (b) Imutabilidade + colunas permitidas ao motorista ───────────────────────
-- Trigger só age quando quem edita é o MOTORISTA (via JWT). Gerência e service
-- role (jwt_role vazio) passam sem restrição.
create or replace function public.nf_guard_motorista()
returns trigger language plpgsql as $$
begin
  if public.jwt_role() <> 'motorista' then
    return new;
  end if;

  -- Imutável após finalizada.
  if old.status in ('aceita', 'recusada', 'ocorrencia') then
    raise exception 'NF % já finalizada — não pode ser alterada.', old.numero_nf;
  end if;

  -- Whitelist: só status/foto_url/entregue_em/observacao podem mudar.
  -- (comparação por jsonb é robusta a novas colunas futuras.)
  if (to_jsonb(new) - 'status' - 'foto_url' - 'entregue_em' - 'observacao' - 'updated_at')
     is distinct from
     (to_jsonb(old) - 'status' - 'foto_url' - 'entregue_em' - 'observacao' - 'updated_at')
  then
    raise exception 'Motorista só pode alterar status/foto/observação da NF.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_nf_guard_motorista on public.notas_fiscais;
create trigger trg_nf_guard_motorista
  before update on public.notas_fiscais
  for each row execute function public.nf_guard_motorista();

-- ── (c.1) Canhoto só na própria NF, em romaneio ativo ──────────────────────────
drop policy if exists mot_canhoto_insert on public.canhotos;
create policy mot_canhoto_insert on public.canhotos for insert
  with check (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
    and exists (
      select 1
      from public.notas_fiscais nf
      join public.romaneios r on r.id = nf.romaneio_id
      where nf.id = nota_fiscal_id
        and nf.motorista_id = auth.uid()
        and r.status = 'ativo'
    )
  );

-- ── (c.2) Romaneio fechado não reabre (nem vira fechado) pelo motorista ────────
drop policy if exists mot_romaneios_update on public.romaneios;
create policy mot_romaneios_update on public.romaneios for update
  using (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
    and status <> 'fechado'
  )
  with check (motorista_id = auth.uid() and status <> 'fechado');
