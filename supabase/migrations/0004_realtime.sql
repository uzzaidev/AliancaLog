-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Habilita Supabase Realtime nas tabelas que o dashboard escuta.
-- Adiciona as tabelas à publicação usada pelo Realtime (postgres_changes).
-- ════════════════════════════════════════════════════════════════════════════
alter publication supabase_realtime add table public.notas_fiscais;
alter publication supabase_realtime add table public.canhotos;
alter publication supabase_realtime add table public.romaneios;
