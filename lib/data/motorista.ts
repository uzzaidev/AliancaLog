import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  NotaMotorista,
  NotaStatus,
  RomaneioStatus,
} from "@/lib/types";

export type { NotaMotorista };

const hoje = () => new Date().toISOString().slice(0, 10);
const FINAIS: NotaStatus[] = ["aceita", "recusada", "ocorrencia"];

export type RomaneioMotorista = {
  id: string;
  status: RomaneioStatus;
  confirmado_em: string | null;
  total: number;
  concluidas: number;
};

export async function getRomaneiosDoDia(): Promise<RomaneioMotorista[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("romaneios")
    .select("id,status,confirmado_em,created_at,notas_fiscais(status)")
    .eq("data", hoje())
    .order("created_at", { ascending: true });

  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const nfs = (r.notas_fiscais ?? []) as { status: NotaStatus }[];
    return {
      id: r.id as string,
      status: r.status as RomaneioStatus,
      confirmado_em: (r.confirmado_em as string) ?? null,
      total: nfs.length,
      concluidas: nfs.filter((n) => FINAIS.includes(n.status)).length,
    };
  });
}

const NF_COLS =
  "id,numero_nf,destinatario_nome,destinatario_endereco,cidade,status";

export async function getNotasDoRomaneio(
  romaneioId: string,
): Promise<NotaMotorista[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notas_fiscais")
    .select(
      "id,numero_nf,destinatario_nome,destinatario_endereco,cidade,status,ordem",
    )
    .eq("romaneio_id", romaneioId)
    .order("ordem", { ascending: true, nullsFirst: false });
  return (data ?? []) as unknown as NotaMotorista[];
}

// Inclui romaneio_id para a tela do canhoto ter um "Voltar" que leva de volta
// à lista de NFs daquele romaneio.
export type NotaComRomaneio = NotaMotorista & { romaneio_id: string | null };

export async function getNota(nfId: string): Promise<NotaComRomaneio | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notas_fiscais")
    .select(NF_COLS + ",romaneio_id")
    .eq("id", nfId)
    .maybeSingle();
  return (data as unknown as NotaComRomaneio) ?? null;
}
