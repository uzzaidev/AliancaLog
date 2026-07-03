"use server";

import { requireRole } from "@/lib/auth/dal";
import { getComprovante } from "@/lib/data/comprovante";
import type { ComprovanteDetalhe } from "@/lib/types";

export async function getComprovanteGerencia(
  nfId: string,
): Promise<ComprovanteDetalhe | null> {
  await requireRole("gerencia");
  return getComprovante(nfId);
}
