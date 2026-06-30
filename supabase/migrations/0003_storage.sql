-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Storage das fotos de canhoto (bucket privado)
-- Leitura pela gerência/cliente acontece via URL assinada gerada no servidor
-- (service role). Aqui controlamos apenas quem escreve.
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('canhotos', 'canhotos', false)
on conflict (id) do nothing;

-- Motorista e gerência podem enviar fotos para o bucket 'canhotos'.
create policy canhotos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'canhotos'
    and public.jwt_role() in ('motorista', 'gerencia')
  );

-- Gerência pode listar/baixar diretamente; demais perfis usam URL assinada.
create policy canhotos_select on storage.objects for select to authenticated
  using (bucket_id = 'canhotos' and public.jwt_role() = 'gerencia');
