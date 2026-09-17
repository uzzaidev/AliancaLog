"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { getComprovante } from "@/lib/data/comprovante";
import { createClient } from "@/lib/supabase/server";
import type { ComprovanteDetalhe } from "@/lib/types";

export async function getComprovanteCliente(
  nfId: string,
): Promise<ComprovanteDetalhe | null> {
  await requireRole("cliente_final");
  return getComprovante(nfId);
}

/**
 * Refaturamento (migration 0031). Os dados da nota nova vêm do XML já lido no
 * browser (`parseNfeXml`) ou digitados à mão — a operação pediu os dois caminhos,
 * porque nem sempre o arquivo está à mão no momento em que a nota é refeita.
 *
 * Toda a regra mora na RPC `substituir_nota_fiscal`: ela confere que a NF é da
 * empresa de quem chamou, que ainda não foi entregue, cria a nova herdando
 * romaneio e motorista, e encerra a antiga — numa transação só.
 */
export async function substituirNota(input: {
  nfAntigaId: string;
  numero_nf: string;
  destinatario_nome: string;
  destinatario_endereco: string;
  chave_acesso?: string;
  cidade?: string;
  motivo?: string;
}): Promise<{ ok?: true; herdouRomaneio?: boolean; error?: string }> {
  await requireRole("cliente_final");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("substituir_nota_fiscal", {
    p_nf_antiga: input.nfAntigaId,
    p_numero_nf: input.numero_nf.trim(),
    p_destinatario_nome: input.destinatario_nome.trim(),
    p_destinatario_endereco: input.destinatario_endereco.trim(),
    p_chave_acesso: input.chave_acesso?.trim() || null,
    p_cidade: input.cidade?.trim() || null,
    p_motivo: input.motivo?.trim() || null,
  });

  if (error) {
    // A chave de acesso é única (índice parcial em notas_fiscais): se o XML já
    // foi carregado antes, o erro cru do Postgres não diria isso a ninguém.
    if (error.message.includes("chave_acesso"))
      return { error: "Essa nota nova já está no sistema." };
    return { error: error.message };
  }

  const linha = (Array.isArray(data) ? data[0] : data) as
    | { herdou_romaneio?: boolean }
    | undefined;

  revalidatePath("/cliente/notas");
  return { ok: true, herdouRomaneio: linha?.herdou_romaneio ?? false };
}

/** Cancelamento sem substituição — o pedido caiu e não há nota nova. */
export async function cancelarNota(
  nfId: string,
  motivo: string,
): Promise<{ ok?: true; error?: string }> {
  await requireRole("cliente_final");
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancelar_nota_fiscal", {
    p_nf: nfId,
    p_motivo: motivo.trim(),
  });
  if (error) return { error: error.message };

  revalidatePath("/cliente/notas");
  return { ok: true };
}
