"use server";

import { requireRole } from "@/lib/auth/dal";
import { getComprovante } from "@/lib/data/comprovante";
import type { ComprovanteDetalhe } from "@/lib/types";

export async function getComprovanteCliente(
  nfId: string,
): Promise<ComprovanteDetalhe | null> {
  await requireRole("cliente_final");
  return getComprovante(nfId);
}
