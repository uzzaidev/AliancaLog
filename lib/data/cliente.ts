import "server-only";

// Consultas do portal do cliente final. RLS já restringe à própria empresa
// (cli_nf_select em supabase/migrations/0002_rls.sql) — aqui só aplicamos os
// filtros extras de UI por cima do que o banco já retorna.
import { createClient } from "@/lib/supabase/server";
import type { NotaStatus } from "@/lib/types";

export type NotaCliente = {
  id: string;
  numero_nf: string;
  status: NotaStatus;
  destinatario_nome: string;
  cidade: string | null;
  data_entrega: string;
  updated_at: string;
};

export type ClienteFiltro = {
  status?: string;
  periodo?: "hoje" | "semana" | "mes" | "todos";
  busca?: string;
};

function inicioPeriodo(periodo?: ClienteFiltro["periodo"]): string | null {
  const hoje = new Date();
  if (periodo === "semana") {
    const d = new Date(hoje);
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }
  if (periodo === "mes") {
    const d = new Date(hoje);
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }
  if (periodo === "todos") return null;
  // padrão "hoje"
  return hoje.toISOString().slice(0, 10);
}

export async function getNotasCliente(f: ClienteFiltro): Promise<NotaCliente[]> {
  const supabase = await createClient();
  let q = supabase
    .from("notas_fiscais")
    .select("id,numero_nf,status,destinatario_nome,cidade,data_entrega,updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  const desde = inicioPeriodo(f.periodo);
  if (desde) q = q.gte("data_entrega", desde);
  if (f.status) q = q.eq("status", f.status);
  if (f.busca) {
    const termo = f.busca.trim();
    if (termo) q = q.or(`numero_nf.ilike.%${termo}%,cidade.ilike.%${termo}%`);
  }

  const { data } = await q;
  return (data ?? []) as NotaCliente[];
}
