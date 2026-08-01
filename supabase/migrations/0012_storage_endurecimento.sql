-- 0012 — Endurecimento do bucket 'canhotos' (revisão pré-piloto).
--
-- Antes: qualquer motorista/gerência autenticado podia inserir em QUALQUER
-- path do bucket, sem limite de tamanho ou tipo de arquivo. Não havia
-- isolamento entre motoristas — nada impedia um motorista de subir um arquivo
-- no path de outro (ou de outra NF).
--
-- Agora: /api/sync sobe em `{motorista_id}/{nf_id}/{client_id}.jpg`
-- (ver app/api/sync/route.ts). A policy abaixo obriga a primeira pasta do
-- path a ser o próprio auth.uid() para quem é motorista.

-- Limite de tamanho (5 MB) e MIME permitido no próprio bucket.
update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/webp']
where id = 'canhotos';

drop policy if exists canhotos_insert on storage.objects;

-- Motorista: só na própria pasta (1º segmento do path = auth.uid()).
create policy canhotos_insert_motorista on storage.objects for insert to authenticated
  with check (
    bucket_id = 'canhotos'
    and public.jwt_role() = 'motorista'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Gerência: mantém acesso irrestrito de escrita (uso administrativo/correção).
create policy canhotos_insert_gerencia on storage.objects for insert to authenticated
  with check (
    bucket_id = 'canhotos'
    and public.jwt_role() = 'gerencia'
  );
