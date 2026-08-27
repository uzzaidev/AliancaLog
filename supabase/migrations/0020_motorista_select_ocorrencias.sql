-- 0020 — Corrige falha em produção: motorista não conseguia registrar OCORRÊNCIA.
--
-- Sintoma (27/08, testes reais no celular):
--   POST /api/sync → 500
--   "new row violates row-level security policy for table \"ocorrencias\""
-- Entrega ACEITA funcionava; só ocorrência falhava. E como um 500 interrompe o
-- flush da fila, a ocorrência travada bloqueava todos os registros seguintes —
-- dando a impressão de que "nada mais sincroniza".
--
-- CAUSA RAIZ — assimetria de policies entre as duas tabelas:
--
--   canhotos     → mot_canhoto_insert  +  mot_canhoto_select   ✅
--   ocorrencias  → mot_ocorrencia_insert  (sem SELECT)         ❌
--
-- A função registrar_entrega_offline grava nas duas com
-- `INSERT ... ON CONFLICT (client_id) DO NOTHING` (idempotência do sync offline).
-- Para resolver o ON CONFLICT o Postgres precisa CONSULTAR a linha conflitante
-- pelo índice único; com RLS ativo e sem policy de SELECT, essa leitura é negada
-- e o erro sobe como violação de RLS na inserção. O canhoto passa justamente
-- porque o motorista tem SELECT nele.
--
-- Confirmado empiricamente antes desta migration:
--   • INSERT simples em ocorrencias, como motorista        → PASSA
--   • a mesma inserção via RPC (com ON CONFLICT)           → FALHA com o erro acima
--
-- Não afrouxa segurança: o motorista passa a enxergar apenas ocorrências de NFs
-- que já são dele — exatamente o mesmo alcance que a policy de INSERT já concede,
-- e o mesmo padrão que `mot_canhoto_select` usa em canhotos.

drop policy if exists mot_ocorrencia_select on public.ocorrencias;
create policy mot_ocorrencia_select on public.ocorrencias for select
  using (
    public.jwt_role() = 'motorista'
    and exists (
      select 1 from public.notas_fiscais nf
      where nf.id = nota_fiscal_id and nf.motorista_id = auth.uid()
    )
  );
