-- 0010 — Data operacional em São Paulo TAMBÉM na camada RLS.
--
-- Bug: `mot_nf_select` filtrava `data_entrega = current_date`. current_date é a
-- data em UTC do servidor; a partir das 21h no Brasil (00h UTC) ela vira o dia
-- seguinte e o motorista deixa de ver as NFs do dia (não abre nem o canhoto).
-- Aqui alinhamos a RLS ao mesmo dia-calendário de São Paulo usado no app
-- (lib/date.ts). Instantes (timestamptz) não são afetados — só o "qual dia".

create or replace function public.hoje_sp()
returns date language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

drop policy if exists mot_nf_select on public.notas_fiscais;
create policy mot_nf_select on public.notas_fiscais for select
  using (
    public.jwt_role() = 'motorista'
    and motorista_id = auth.uid()
    and data_entrega = public.hoje_sp()
  );
