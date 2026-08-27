-- 0021 — Segunda metade da correção de 27/08: registrar OCORRÊNCIA falhava em produção.
--
-- Depois da 0020 (que liberou o SELECT em `ocorrencias`), o erro andou para a
-- etapa seguinte da mesma transação:
--   "new row violates row-level security policy for table \"notas_fiscais\""
--
-- CAUSA RAIZ — o Postgres aplica as policies de SELECT à linha NOVA de um UPDATE.
--
-- A `registrar_entrega_offline` devolve a NF ao painel quando o desfecho não é
-- 'aceita' (A-007), zerando `motorista_id` e `romaneio_id`. Só que `mot_nf_select`
-- só enxerga `motorista_id = auth.uid()` — ou seja, ao zerar esse campo o motorista
-- deixa de "ver" a própria linha que acabou de atualizar, e o UPDATE é recusado.
-- O `WITH CHECK` de `mot_nf_update` já permitia `motorista_id is null`; o bloqueio
-- vinha da policy de SELECT, não da de UPDATE.
--
-- Comprovado empiricamente antes desta migration (tudo em transação revertida):
--   • UPDATE só de status / foto / entregue_em / romaneio_id  → PASSA
--   • UPDATE zerando motorista_id                             → FALHA
--   • o mesmo UPDATE, com uma policy de SELECT que cobrisse a linha nova → PASSA
--
-- CORREÇÃO: o motorista passa a enxergar também as NFs em que ELE já registrou
-- canhoto — não só as atualmente atribuídas a ele. Isso:
--   1. destrava o UPDATE de devolução ao painel (a linha nova segue visível,
--      porque o canhoto daquela tentativa foi inserido logo antes, na mesma
--      transação);
--   2. corrige um efeito colateral do A-007 que ninguém tinha notado — depois de
--      uma ocorrência, a NF saía da posse do motorista e ele PERDIA acesso ao
--      próprio histórico (/motorista/historico), que a migration 0015 tinha
--      justamente aberto.
--
-- Não afrouxa segurança: o alcance é "NF que eu atendi", não "NF sem dono".
-- Validado: outro motorista continua sem ver NF de terceiro E sem ver NF solta.
--
-- Por que a checagem vai numa função `security definer`: referenciar `canhotos`
-- direto dentro da policy de `notas_fiscais` cria recursão infinita — a policy de
-- `canhotos` (cli_canhoto_select) consulta `notas_fiscais` de volta. O Postgres
-- aborta com "infinite recursion detected in policy". A função roda com os
-- privilégios do dono e não dispara RLS, quebrando o ciclo; é `stable` e só
-- devolve boolean, sem expor nenhuma linha.

create or replace function public.motorista_registrou_nf(p_nf uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.canhotos c
    where c.nota_fiscal_id = p_nf
      and c.motorista_id = auth.uid()
  );
$$;

revoke all on function public.motorista_registrou_nf(uuid) from public;
grant execute on function public.motorista_registrou_nf(uuid) to authenticated;

drop policy if exists mot_nf_select on public.notas_fiscais;
create policy mot_nf_select on public.notas_fiscais for select
  using (
    public.jwt_role() = 'motorista'
    and (
      motorista_id = auth.uid()
      or public.motorista_registrou_nf(id)
    )
  );
