"use server";

// Importação de NFs pelo próprio cliente (empresa embarcadora).
// A empresa NUNCA vem do formulário — é fixada pelo JWT (à prova de adulteração,
// e o RLS cli_nf_insert em 0008 garante isso também no banco). As NFs nascem
// "soltas" (sem motorista/romaneio) e caem direto no painel da gerência para
// serem bipadas — o Realtime já propaga.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ImportRow } from "@/app/gerencia/importar/actions";

export async function confirmarImportacaoCliente(input: {
  rows: ImportRow[];
}): Promise<{ ok?: string; error?: string; count?: number }> {
  const user = await requireRole("cliente_final");
  if (!user.empresaId)
    return { error: "Sua conta não está vinculada a uma empresa embarcadora." };

  const rows = (input.rows ?? []).filter(
    (r) => r.numero_nf && r.destinatario_nome && r.destinatario_endereco,
  );
  if (rows.length === 0)
    return {
      error: "Nenhuma linha válida (precisa de NF, destinatário e endereço).",
    };

  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const payload = rows.map((r) => ({
    numero_nf: String(r.numero_nf).trim(),
    empresa_cliente_id: user.empresaId,
    destinatario_nome: String(r.destinatario_nome).trim(),
    destinatario_endereco: String(r.destinatario_endereco).trim(),
    cidade: r.cidade ? String(r.cidade).trim() : null,
    observacao: r.observacao ? String(r.observacao).trim() : null,
    chave_acesso: r.chave_acesso?.trim() || null,
    data_entrega: hoje,
    origem_importacao: "cliente",
  }));

  const { error } = await supabase.from("notas_fiscais").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/cliente/notas");
  return { ok: `${rows.length} NF(s) enviada(s).`, count: rows.length };
}
