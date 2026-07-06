-- 0007 — Mantém canhotos imutáveis no Storage (sem UPDATE para motorista).
--
-- O /api/sync sobe a foto SEM upsert; o path é derivado do client_id, então
-- um re-sync cai no mesmo arquivo e o 409 "already exists" é tratado como
-- idempotência no handler. Assim o motorista precisa apenas de INSERT (0003) —
-- nenhuma permissão de UPDATE/DELETE, preservando a imutabilidade do canhoto.
-- Esta migration garante que nenhuma policy de UPDATE foi deixada para trás.
drop policy if exists canhotos_update on storage.objects;
