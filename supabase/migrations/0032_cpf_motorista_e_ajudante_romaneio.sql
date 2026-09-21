-- 0032 — CPF do motorista (cadastro real, 21/09) + ajudante do dia (romaneio).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CPF do motorista
-- ─────────────────────────────────────────────────────────────────────────────
-- O doc real de motoristas (MOTORISTAS.docx) traz CPF, não CNH. `motoristas` só
-- tinha `cnh` — são documentos diferentes, não dá para misturar. Segue o mesmo
-- padrão de `empresas_clientes.cnpj`: campo simples, sem validação de formato no
-- banco (a UI decide se exige máscara).
alter table public.motoristas
  add column if not exists cpf text;

comment on column public.motoristas.cpf is
  'CPF do motorista, só dígitos ou formatado — sem validação no banco.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ajudante do dia
-- ─────────────────────────────────────────────────────────────────────────────
-- Pedido da operação (21/09): o motorista às vezes sai com um ajudante, e
-- precisa registrar quem foi. Ajudante NÃO tem cadastro nem login — é só um
-- nome, preenchido pelo próprio motorista.
--
-- Por que fica em `romaneios`, não numa tabela própria: "o ajudante do dia"
-- já tem um "dia" pronto no modelo — o romaneio é exatamente o recorte de
-- trabalho de um motorista num dia (`data` + `motorista_id`). Uma tabela nova
-- só para isso duplicaria esse conceito sem necessidade.
alter table public.romaneios
  add column if not exists ajudante_nome text;

comment on column public.romaneios.ajudante_nome is
  'Nome do ajudante que acompanhou o motorista neste romaneio — texto livre,
   sem cadastro (não é usuário do sistema). Preenchido pelo próprio motorista.';

-- Nenhuma policy nova: a UPDATE que já existe (`mot_romaneios_update`, 0025)
-- cobre qualquer coluna da própria linha, contanto que o romaneio não esteja
-- fechado — exatamente o mesmo alcance que o motorista já tem para o resto do
-- romaneio. Validado por teste antes de construir a UI (ver encaminhamento).
