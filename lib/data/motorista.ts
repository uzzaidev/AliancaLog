import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/date";
import {
  NF_STATUS_FINAIS,
  type NotaMotorista,
  type NotaStatus,
  type RomaneioStatus,
} from "@/lib/types";

export type { NotaMotorista };

const hoje = () => hojeSP();

export type RomaneioMotorista = {
  id: string;
  status: RomaneioStatus;
  confirmado_em: string | null;
  total: number;
  concluidas: number;
};

// "Minhas entregas" reúne o trabalho em aberto (mesmo de dias anteriores) e os
// romaneios fechados HOJE. Assim o motorista recebe confirmação visual de que a
// carga terminou; fechados antigos permanecem apenas no histórico.
export async function getRomaneiosDoDia(): Promise<RomaneioMotorista[]> {
  const supabase = await createClient();
  const { data, error: erro } = await supabase
    .from("romaneios")
    .select("id,status,confirmado_em,created_at,notas_fiscais(status)")
    .or(`status.eq.ativo,and(status.eq.fechado,data.eq.${hoje()})`)
    .order("created_at", { ascending: true });
  // Lista vazia e erro de query sao indistinguiveis na tela — por isso o erro
  // precisa aparecer no log (ver o embed ambiguo da 0026, invisivel por 3 dias).
  if (erro) console.error("[getRomaneiosDoDia] query falhou:", erro.message);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const nfs = (r.notas_fiscais ?? []) as { status: NotaStatus }[];
    return {
      id: r.id as string,
      status: r.status as RomaneioStatus,
      confirmado_em: (r.confirmado_em as string) ?? null,
      total: nfs.length,
      concluidas: nfs.filter((n) => NF_STATUS_FINAIS.includes(n.status)).length,
    };
  });
}

export type RomaneioHistorico = RomaneioMotorista & { data: string };

const HISTORICO_LIMITE = 90; // ~3 meses de romaneios diários — evita lista sem fim

// Histórico do motorista: todos os romaneios dele, exceto o de hoje (que já
// aparece em getRomaneiosDoDia / "Minhas entregas"). Depende da RLS de
// notas_fiscais não estar mais presa ao dia (migration 0015).
export async function getHistoricoRomaneios(): Promise<RomaneioHistorico[]> {
  const supabase = await createClient();
  const { data, error: erro } = await supabase
    .from("romaneios")
    .select("id,status,confirmado_em,data,notas_fiscais(status)")
    .neq("data", hoje())
    .order("data", { ascending: false })
    .limit(HISTORICO_LIMITE);
  // Lista vazia e erro de query sao indistinguiveis na tela — por isso o erro
  // precisa aparecer no log (ver o embed ambiguo da 0026, invisivel por 3 dias).
  if (erro) console.error("[getHistoricoRomaneios] query falhou:", erro.message);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const nfs = (r.notas_fiscais ?? []) as { status: NotaStatus }[];
    return {
      id: r.id as string,
      status: r.status as RomaneioStatus,
      confirmado_em: (r.confirmado_em as string) ?? null,
      data: r.data as string,
      total: nfs.length,
      concluidas: nfs.filter((n) => NF_STATUS_FINAIS.includes(n.status)).length,
    };
  });
}

const NF_COLS =
  "id,numero_nf,destinatario_nome,destinatario_endereco,cidade,status,lat,lng";

export async function getNotasDoRomaneio(
  romaneioId: string,
): Promise<NotaMotorista[]> {
  const supabase = await createClient();
  const { data, error: erro } = await supabase
    .from("notas_fiscais")
    .select(
      "id,numero_nf,destinatario_nome,destinatario_endereco,cidade,status,ordem,lat,lng",
    )
    .eq("romaneio_id", romaneioId)
    .order("ordem", { ascending: true, nullsFirst: false });
  // Lista vazia e erro de query sao indistinguiveis na tela — por isso o erro
  // precisa aparecer no log (ver o embed ambiguo da 0026, invisivel por 3 dias).
  if (erro) console.error("[getNotasDoRomaneio] query falhou:", erro.message);
  return (data ?? []) as unknown as NotaMotorista[];
}

// Inclui romaneio_id para a tela do canhoto ter um "Voltar" que leva de volta
// à lista de NFs daquele romaneio.
export type NotaComRomaneio = NotaMotorista & { romaneio_id: string | null };

export async function getNota(nfId: string): Promise<NotaComRomaneio | null> {
  const supabase = await createClient();
  const { data, error: erroGetNota } = await supabase
    .from("notas_fiscais")
    .select(NF_COLS + ",romaneio_id")
    .eq("id", nfId)
    .maybeSingle();
  // Lista vazia e erro de query sao indistinguiveis na tela — por isso o erro
  // precisa aparecer no log (ver o embed ambiguo da 0026, invisivel por 3 dias).
  if (erroGetNota) console.error("[getNota] query falhou:", erroGetNota.message);
  return (data as unknown as NotaComRomaneio) ?? null;
}
