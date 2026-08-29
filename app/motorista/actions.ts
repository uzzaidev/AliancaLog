"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
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
