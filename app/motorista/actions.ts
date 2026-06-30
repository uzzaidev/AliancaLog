"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

// Motorista confirma o recebimento do romaneio antes de sair: marca o horário de
// início e coloca as NFs pendentes em rota.
export async function confirmarRomaneio(romaneioId: string) {
  const user = await requireRole("motorista");
  const supabase = await createClient();

  await supabase
    .from("romaneios")
    .update({ status: "ativo", confirmado_em: new Date().toISOString() })
    .eq("id", romaneioId)
    .eq("motorista_id", user.id);

  await supabase
    .from("notas_fiscais")
    .update({ status: "em_rota" })
    .eq("romaneio_id", romaneioId)
    .eq("status", "pendente");

  revalidatePath("/motorista/entregas");
  revalidatePath(`/motorista/romaneio/${romaneioId}`);
}
