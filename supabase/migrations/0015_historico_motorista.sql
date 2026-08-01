-- 0015 — Motorista passa a ver o próprio histórico completo, não só o dia.
--
-- mot_nf_select (migration 0010) restringia a `data_entrega = hoje_sp()` — bloqueio
-- de RLS, não só filtro de UI: mesmo uma tela nova não conseguiria mostrar NFs de
-- dias anteriores enquanto essa cláusula existir. mot_romaneios_select e
-- mot_canhoto_select já não tinham essa restrição (motorista via os próprios
-- romaneios/canhotos de qualquer data) — só notas_fiscais ficava preso ao dia.
--
-- Continua só leitura do que é dele: motorista_id = auth.uid() não muda. Escrita
-- não é afetada por esta migration — mot_nf_update já não tinha filtro de data, e
-- o trigger nf_guard_motorista (0009) já bloqueia edição de NF finalizada
-- independente da data.
drop policy if exists mot_nf_select on public.notas_fiscais;
create policy mot_nf_select on public.notas_fiscais for select
  using (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
  );
