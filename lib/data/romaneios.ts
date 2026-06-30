import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { RomaneioStatus } from "@/lib/types";

export type RomaneioRow = {
  id: string;
  data: string;
  status: RomaneioStatus;
  motorista_nome: string | null;
  total_nfs: number;
};

export async function listRomaneios(): Promise<RomaneioRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("romaneios")
    .select("id,data,status,motoristas(usuarios(nome)),notas_fiscais(count)")
    .order("data", { ascending: false })
    .limit(50);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const mot = r.motoristas as { usuarios?: { nome?: string } } | null;
    const nfs = r.notas_fiscais as { count: number }[] | null;
    return {
      id: r.id as string,
      data: r.data as string,
      status: r.status as RomaneioStatus,
      motorista_nome: mot?.usuarios?.nome ?? null,
      total_nfs: nfs?.[0]?.count ?? 0,
    };
  });
}
