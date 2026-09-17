import "server-only";

// Consultas do portal do cliente final. RLS já restringe à própria empresa
// (cli_nf_select em supabase/migrations/0002_rls.sql) — aqui só aplicamos os
// filtros extras de UI por cima do que o banco já retorna.
import { createClient } from "@/lib/supabase/server";
import { diasAtrasSP, hojeSP } from "@/lib/date";
import type { NotaStatus, OcorrenciaTipo } from "@/lib/types";

export type NotaCliente = {
  id: string;
  numero_nf: string;
  status: NotaStatus;
  destinatario_nome: string;
  cidade: string | null;
  data_entrega: string;
  updated_at: string;
  /**
   * Ocorrência mais recente da NF, quando há. Vem junto na listagem — e não só
   * no detalhe expandido — porque o cliente precisa enxergar O QUE aconteceu sem
   * abrir NF por NF: um selo "Ocorrência" sozinho obriga a caçar a informação.
   */
  ocorrencia: { tipo: OcorrenciaTipo; descricao: string | null } | null;
};

export type ClienteFiltro = {
  status?: string;
  periodo?: "hoje" | "semana" | "mes" | "todos";
  busca?: string;
};

function inicioPeriodo(periodo?: ClienteFiltro["periodo"]): string | null {
  if (periodo === "semana") return diasAtrasSP(7);
  if (periodo === "mes") return diasAtrasSP(30);
  if (periodo === "todos") return null;
  // padrão "hoje"
  return hojeSP();
}

export async function getNotasCliente(f: ClienteFiltro): Promise<NotaCliente[]> {
  const supabase = await createClient();
  let q = supabase
    .from("notas_fiscais")
    .select(
      "id,numero_nf,status,destinatario_nome,cidade,data_entrega,updated_at,ocorrencias(tipo,descricao,created_at)",
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  const desde = inicioPeriodo(f.periodo);
  if (desde) q = q.gte("data_entrega", desde);
  if (f.status) q = q.eq("status", f.status);
  if (f.busca) {
    const termo = f.busca.trim();
    if (termo) q = q.or(`numero_nf.ilike.%${termo}%,cidade.ilike.%${termo}%`);
  }

  const { data, error } = await q;
  if (error) console.error("[getNotasCliente] query falhou:", error.message);

  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    // Uma NF pode ter mais de uma ocorrência (A-007: cada tentativa pode gerar a
    // sua). Na lista mostramos a mais recente — é o estado atual da pendência.
    const todas = (r.ocorrencias ?? []) as {
      tipo: OcorrenciaTipo;
      descricao: string | null;
      created_at: string;
    }[];
    const ultima = [...todas].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0];
    return {
      id: r.id as string,
      numero_nf: r.numero_nf as string,
      status: r.status as NotaStatus,
      destinatario_nome: r.destinatario_nome as string,
      cidade: (r.cidade as string) ?? null,
      data_entrega: r.data_entrega as string,
      updated_at: r.updated_at as string,
      ocorrencia: ultima
        ? { tipo: ultima.tipo, descricao: ultima.descricao }
        : null,
    };
  });
}
