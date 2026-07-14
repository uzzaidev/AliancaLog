"use server";

// Confirma a importação de NFs a partir das linhas mapeadas no cliente.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/date";

export type ImportRow = {
  numero_nf: string;
  destinatario_nome: string;
  destinatario_endereco: string;
  cidade?: string;
  observacao?: string;
  // Chave de acesso da NF-e (44 díg.) — vem do XML/PDF; Excel geralmente não tem.
  chave_acesso?: string;
};

export async function confirmarImportacao(input: {
  empresaId: string;
  motoristaId?: string;
  rows: ImportRow[];
}): Promise<{ ok?: string; error?: string; count?: number }> {
  await requireRole("gerencia");

  if (!input.empresaId) return { error: "Selecione a empresa embarcadora." };
  const rows = (input.rows ?? []).filter(
    (r) => r.numero_nf && r.destinatario_nome && r.destinatario_endereco,
  );
  if (rows.length === 0)
    return {
      error: "Nenhuma linha válida (precisa de NF, destinatário e endereço).",
    };

  const supabase = await createClient();
  const hoje = hojeSP();

  // Se um motorista foi escolhido, já cria o romaneio do dia e vincula as NFs.
  let romaneioId: string | null = null;
  if (input.motoristaId) {
    const { data: rom, error } = await supabase
      .from("romaneios")
      .insert({ data: hoje, motorista_id: input.motoristaId, status: "ativo" })
      .select("id")
      .single();
    if (error) return { error: error.message };
    romaneioId = rom.id;
  }

  const payload = rows.map((r) => ({
    numero_nf: String(r.numero_nf).trim(),
    empresa_cliente_id: input.empresaId,
    destinatario_nome: String(r.destinatario_nome).trim(),
    destinatario_endereco: String(r.destinatario_endereco).trim(),
    cidade: r.cidade ? String(r.cidade).trim() : null,
    observacao: r.observacao ? String(r.observacao).trim() : null,
    chave_acesso: r.chave_acesso?.trim() || null,
    data_entrega: hoje,
    origem_importacao: "gerencia",
    motorista_id: input.motoristaId || null,
    romaneio_id: romaneioId,
  }));

  const { error } = await supabase.from("notas_fiscais").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/gerencia/dashboard");
  return { ok: `${rows.length} NF(s) importada(s).`, count: rows.length };
}
