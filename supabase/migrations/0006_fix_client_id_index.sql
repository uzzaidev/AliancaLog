-- 0006 — Troca o índice parcial de client_id por um índice único não-parcial.
-- O índice parcial (WHERE client_id IS NOT NULL) impede que o Supabase upsert
-- use ON CONFLICT (client_id) sem especificar o predicado, causando erro 500
-- no sync offline. PostgreSQL permite múltiplos NULL num índice único normal
-- (NULL != NULL), por isso a semântica é idêntica mas o conflict target funciona.
drop index if exists public.uq_canhoto_client_id;
create unique index uq_canhoto_client_id on public.canhotos (client_id);
