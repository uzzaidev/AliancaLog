"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getComprovante } from "@/lib/data/comprovante";
import { hojeSP } from "@/lib/date";
import type { ComprovanteDetalhe } from "@/lib/types";

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
