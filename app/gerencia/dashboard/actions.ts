"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getComprovante } from "@/lib/data/comprovante";
import { hojeSP } from "@/lib/date";
import { NF_STATUS_FINAIS, type ComprovanteDetalhe } from "@/lib/types";

export async function getComprovanteGerencia(
  nfId: string,
): Promise<ComprovanteDetalhe | null> {
  await requireRole("gerencia");
  return getComprovante(nfId);
}

// Atribui um motorista a NFs "soltas" (sem romaneio) direto do painel de
// clientes do dashboard — alternativa ao bipar fisicamente: a gerência decide
// de antemão quem leva o quê, sem precisar montar o romaneio em /romaneios/novo.
// Cria um romaneio novo com exatamente essas NFs (mesmo padrão de criarRomaneio).
export async function atribuirMotorista(input: {
  nfIds: string[];
  motoristaId: string;
}): Promise<{ ok?: string; error?: string; count?: number }> {
  await requireRole("gerencia");
  if (!input.motoristaId) return { error: "Selecione o motorista." };
  const nfIds = Array.from(new Set(input.nfIds ?? []));
  if (nfIds.length === 0) return { error: "Selecione ao menos uma NF." };

  const supabase = await createClient();

  const { data: rom, error: eRom } = await supabase
    .from("romaneios")
    .insert({ data: hojeSP(), motorista_id: input.motoristaId, status: "ativo" })
    .select("id")
    .single();
  if (eRom) return { error: eRom.message };

  // .is("romaneio_id", null): só pega quem ainda está solto — evita reatribuir
  // uma NF que alguém já bipou/atribuiu entre o clique e a confirmação.
  const { data: atualizadas, error: eUpd } = await supabase
    .from("notas_fiscais")
    .update({ romaneio_id: rom.id, motorista_id: input.motoristaId })
    .in("id", nfIds)
    .is("romaneio_id", null)
    .select("id");
  if (eUpd) return { error: eUpd.message };

  const count = atualizadas?.length ?? 0;
  if (count === 0) {
    // Nada foi atualizado — desfaz o romaneio vazio que acabou de ser criado.
    await supabase.from("romaneios").delete().eq("id", rom.id);
    return { error: "Essas NFs já foram atribuídas por outra pessoa. Atualize a página." };
  }

  revalidatePath("/gerencia/dashboard");
  revalidatePath("/gerencia/romaneios");

  const parcial = count < nfIds.length;
  return {
    ok: parcial
      ? `${count} de ${nfIds.length} NF(s) atribuída(s) — as demais já tinham sido pegas por outra ação.`
      : `${count} NF(s) atribuída(s) ao motorista.`,
    count,
  };
}

// Troca o motorista de uma NF que já está em rota (já tem romaneio) — ex.: o
// motorista escalado não pode mais entregar. Diferente de atribuirMotorista
// (que só pega NF solta), esta remove a NF do romaneio de origem e a encaixa
// no romaneio ativo do motorista destino (reaproveitando um se já existir hoje,
// para não fragmentar a rota dele em vários romaneios de 1 NF cada).
export async function trocarMotorista(input: {
  nfId: string;
  motoristaId: string;
}): Promise<{ ok?: string; error?: string }> {
  await requireRole("gerencia");
  if (!input.nfId) return { error: "NF inválida." };
  if (!input.motoristaId) return { error: "Selecione o motorista." };

  const supabase = await createClient();

  const { data: nf, error: eNf } = await supabase
    .from("notas_fiscais")
    .select("id,romaneio_id,motorista_id,status")
    .eq("id", input.nfId)
    .maybeSingle();
  if (eNf) return { error: eNf.message };
  if (!nf) return { error: "NF não encontrada." };
  if (nf.motorista_id === input.motoristaId)
    return { error: "A NF já está com esse motorista." };
  if (NF_STATUS_FINAIS.includes(nf.status))
    return { error: "Essa NF já tem status final — não há entrega para transferir." };

  const romaneioAntigoId = nf.romaneio_id as string | null;

  // Reaproveita o romaneio ativo do motorista destino criado hoje, se existir.
  const { data: romaneioExistente } = await supabase
    .from("romaneios")
    .select("id")
    .eq("motorista_id", input.motoristaId)
    .eq("status", "ativo")
    .eq("data", hojeSP())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let romaneioDestinoId = romaneioExistente?.id as string | undefined;
  if (!romaneioDestinoId) {
    const { data: novoRomaneio, error: eRom } = await supabase
      .from("romaneios")
      .insert({ data: hojeSP(), motorista_id: input.motoristaId, status: "ativo" })
      .select("id")
      .single();
    if (eRom) return { error: eRom.message };
    romaneioDestinoId = novoRomaneio.id as string;
  }

  // Reler o romaneio_id no update (não só no select acima) evita reatribuir
  // uma NF que mudou de dono entre a leitura e a confirmação — mesmo cuidado
  // de concorrência do atribuirMotorista.
  let update = supabase
    .from("notas_fiscais")
    .update({ romaneio_id: romaneioDestinoId, motorista_id: input.motoristaId })
    .eq("id", input.nfId);
  update = romaneioAntigoId
    ? update.eq("romaneio_id", romaneioAntigoId)
    : update.is("romaneio_id", null);
  const { data: trocada, error: eUpd } = await update.select("id").maybeSingle();
  if (eUpd) return { error: eUpd.message };
  if (!trocada) {
    // Ninguém foi atualizado — desfaz o romaneio novo, se foi este trecho que o criou.
    if (!romaneioExistente)
      await supabase.from("romaneios").delete().eq("id", romaneioDestinoId);
    return { error: "Essa NF já foi alterada por outra ação. Atualize a página." };
  }

  // Romaneio de origem ficou vazio depois da remoção → apaga (mesmo padrão de atribuirMotorista).
  if (romaneioAntigoId) {
    const { count } = await supabase
      .from("notas_fiscais")
      .select("id", { count: "exact", head: true })
      .eq("romaneio_id", romaneioAntigoId);
    if ((count ?? 0) === 0)
      await supabase.from("romaneios").delete().eq("id", romaneioAntigoId);
  }

  revalidatePath("/gerencia/dashboard");
  revalidatePath("/gerencia/romaneios");
  if (romaneioAntigoId) revalidatePath(`/gerencia/romaneios/${romaneioAntigoId}`);
  revalidatePath(`/gerencia/romaneios/${romaneioDestinoId}`);

  return { ok: "Motorista trocado." };
}

// Exclusão em lote de NFs (duplicadas de importação/bipagem). Destrutivo —
// trava real no servidor, não só confirmação na tela: canhotos/ocorrencias têm
// "on delete cascade" (migration 0001), então excluir uma NF com canhoto
// apagaria a prova de entrega junto. A seleção feita na tela é só uma sugestão.
export async function excluirNotas(
  nfIds: string[],
): Promise<{ ok?: string; error?: string; count?: number }> {
  await requireRole("gerencia");
  const ids = Array.from(new Set(nfIds ?? []));
  if (ids.length === 0) return { error: "Selecione ao menos uma NF." };

  const supabase = await createClient();

  const { data: comCanhoto, error: eCanhoto } = await supabase
    .from("canhotos")
    .select("nota_fiscal_id")
    .in("nota_fiscal_id", ids);
  if (eCanhoto) return { error: eCanhoto.message };

  const bloqueadas = new Set((comCanhoto ?? []).map((c) => c.nota_fiscal_id as string));
  const excluiveis = ids.filter((id) => !bloqueadas.has(id));
  if (excluiveis.length === 0)
    return { error: "Todas as NFs selecionadas já têm canhoto — não é possível excluir." };

  const { data: excluidas, error } = await supabase
    .from("notas_fiscais")
    .delete()
    .in("id", excluiveis)
    .select("id");
  if (error) return { error: error.message };

  revalidatePath("/gerencia/dashboard");
  revalidatePath("/gerencia/romaneios");

  const count = excluidas?.length ?? 0;
  const bloqueadasCount = ids.length - excluiveis.length;
  return {
    ok:
      bloqueadasCount > 0
        ? `${count} NF(s) excluída(s) — ${bloqueadasCount} não foram (já têm canhoto).`
        : `${count} NF(s) excluída(s).`,
    count,
  };
}
