import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NotaStatus, RomaneioStatus } from "@/lib/types";

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

const FINAIS: NotaStatus[] = ["aceita", "recusada", "retida", "ocorrencia"];

export type RomaneioDetalhe = {
  id: string;
  data: string;
  status: RomaneioStatus;
  motorista_nome: string | null;
  confirmado_em: string | null;
  notas: {
    id: string;
    numero_nf: string;
    status: NotaStatus;
    destinatario_nome: string;
    empresa_nome: string | null;
  }[];
};

export async function getRomaneio(id: string): Promise<RomaneioDetalhe | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("romaneios")
    .select(
      "id,data,status,confirmado_em,motoristas(usuarios(nome)),notas_fiscais(id,numero_nf,status,destinatario_nome,empresas_clientes(nome))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const r = data as Record<string, unknown>;
  const mot = r.motoristas as { usuarios?: { nome?: string } } | null;
  const nfs = (r.notas_fiscais ?? []) as Record<string, unknown>[];

  return {
    id: r.id as string,
    data: r.data as string,
    status: r.status as RomaneioStatus,
    confirmado_em: (r.confirmado_em as string) ?? null,
    motorista_nome: mot?.usuarios?.nome ?? null,
    notas: nfs.map((n) => {
      const emp = n.empresas_clientes as { nome?: string } | null;
      return {
        id: n.id as string,
        numero_nf: n.numero_nf as string,
        status: n.status as NotaStatus,
        destinatario_nome: n.destinatario_nome as string,
        empresa_nome: emp?.nome ?? null,
      };
    }),
  };
}

export function contarPendentes(notas: { status: NotaStatus }[]): number {
  return notas.filter((n) => !FINAIS.includes(n.status)).length;
}
