"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { interpretarCodigoBipado } from "@/lib/nfe";
import { createClient } from "@/lib/supabase/server";

// Motorista confirma o recebimento do romaneio antes de sair: marca o horário de
// início e coloca as NFs pendentes em rota.
export async function confirmarRomaneio(romaneioId: string) {
  await requireRole("motorista");
  const supabase = await createClient();

  const { error } = await supabase.rpc("confirmar_romaneio_motorista", {
    p_romaneio_id: romaneioId,
  });

  if (error) return { error: `Não foi possível iniciar o romaneio: ${error.message}` };

  revalidatePath("/motorista/entregas");
  revalidatePath(`/motorista/romaneio/${romaneioId}`);
  return { ok: true };
}

// Motorista bipa o DANFE de uma nota que está na mão dele e a assume — sem
// depender da gerência atribuir (migration 0026). Toda a regra mora na RPC
// `assumir_nf_motorista`, porque a RLS do motorista não enxerga NF de terceiro.
export type ResultadoAssumir =
  | "assumida"
  | "confirmar_troca"
  | "ja_sua"
  | "finalizada"
  | "nao_encontrada";

export type NfAssumida = {
  resultado: ResultadoAssumir;
  nfId: string | null;
  numeroNf: string | null;
  destinatarioNome: string | null;
  destinatarioEndereco: string | null;
  cidade: string | null;
  empresaNome: string | null;
  motoristaAnterior: string | null;
  romaneioId: string | null;
};

export async function assumirNf(
  codigo: string,
  confirmarTroca = false,
): Promise<{ dados?: NfAssumida; error?: string }> {
  await requireRole("motorista");

  // O código de barras do DANFE é a chave de acesso (44 dígitos); o número da NF
  // sai dela. Digitação manual do número continua funcionando (ver lib/nfe.ts).
  const { numero, chave } = interpretarCodigoBipado(codigo);
  if (!numero && !chave) return { error: "Código inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assumir_nf_motorista", {
    p_numero: numero,
    p_chave: chave ?? null,
    p_confirmar_troca: confirmarTroca,
  });

  if (error) return { error: `Não consegui assumir a NF: ${error.message}` };

  const linha = (Array.isArray(data) ? data[0] : data) as
    | Record<string, unknown>
    | undefined;
  if (!linha) return { error: "Resposta vazia do servidor." };

  const dados: NfAssumida = {
    resultado: linha.resultado as ResultadoAssumir,
    nfId: (linha.nf_id as string) ?? null,
    numeroNf: (linha.numero_nf as string) ?? null,
    destinatarioNome: (linha.destinatario_nome as string) ?? null,
    destinatarioEndereco: (linha.destinatario_endereco as string) ?? null,
    cidade: (linha.cidade as string) ?? null,
    empresaNome: (linha.empresa_nome as string) ?? null,
    motoristaAnterior: (linha.motorista_anterior as string) ?? null,
    romaneioId: (linha.romaneio_id as string) ?? null,
  };

  if (dados.resultado === "assumida") {
    revalidatePath("/motorista/entregas");
    if (dados.romaneioId) revalidatePath(`/motorista/romaneio/${dados.romaneioId}`);
  }

  return { dados };
}
