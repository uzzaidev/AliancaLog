-- 0025 — Permite ao motorista fechar apenas romaneio realmente concluído.
--
-- A policy da migration 0009 tinha `status <> 'fechado'` no WITH CHECK. Isso
-- também bloqueava o fechamento legítimo feito pela RPC da migration 0024 e
-- revertia a entrega inteira. Mantemos a proteção: `fechado` só passa se não
-- existir nenhuma NF vinculada cujo status ainda não seja `aceita`.

drop policy if exists mot_romaneios_update on public.romaneios;
create policy mot_romaneios_update on public.romaneios for update
  using (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
    and status <> 'fechado'
  )
  with check (
    motorista_id = auth.uid()
    and (
      status <> 'fechado'
      or not exists (
        select 1
        from public.notas_fiscais nf
        where nf.romaneio_id = romaneios.id
          and nf.status <> 'aceita'
      )
    )
  );
