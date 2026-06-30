import "server-only";

// Consultas server-side da área de gerência (RLS aplica: gerência vê tudo).
import { createClient } from "@/lib/supabase/server";
import type { NotaStatus } from "@/lib/types";

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export type ResumoDia = {
  total: number;
  pendente: number;
  em_rota: number;
  aceita: number;
  recusada: number;
  retida: number;
  ocorrencia: number;
};

export async function getResumoHoje(data?: string): Promise<ResumoDia> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notas_fiscais")
    .select("status")
    .eq("data_entrega", data ?? hojeISO());

  const r: ResumoDia = {
    total: 0,
    pendente: 0,
    em_rota: 0,
    aceita: 0,
    recusada: 0,
    retida: 0,
    ocorrencia: 0,
  };
  for (const row of (rows ?? []) as { status: NotaStatus }[]) {
    r.total++;
    r[row.status]++;
  }
  return r;
}

export type NotaRow = {
  id: string;
  numero_nf: string;
  status: NotaStatus;
  destinatario_nome: string;
  destinatario_endereco: string;
  cidade: string | null;
  empresa_nome: string | null;
  motorista_nome: string | null;
  updated_at: string;
  foto_url: string | null;
};

export type NotaFiltro = {
  status?: string;
  motorista?: string;
  empresa?: string;
  data?: string;
};

export async function getNotasDoDia(f: NotaFiltro): Promise<NotaRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("notas_fiscais")
    .select(
      "id,numero_nf,status,destinatario_nome,destinatario_endereco,cidade,updated_at,foto_url,empresas_clientes(nome),motoristas(usuarios(nome))",
    )
    .eq("data_entrega", f.data || hojeISO())
    .order("updated_at", { ascending: false });

  if (f.status) q = q.eq("status", f.status);
  if (f.empresa) q = q.eq("empresa_cliente_id", f.empresa);
  if (f.motorista) q = q.eq("motorista_id", f.motorista);

  const { data } = await q;
  // PostgREST devolve embeds como objeto/array; tipamos solto aqui.
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const empresa = r.empresas_clientes as { nome?: string } | null;
    const motorista = r.motoristas as { usuarios?: { nome?: string } } | null;
    return {
      id: r.id as string,
      numero_nf: r.numero_nf as string,
      status: r.status as NotaStatus,
      destinatario_nome: r.destinatario_nome as string,
      destinatario_endereco: r.destinatario_endereco as string,
      cidade: (r.cidade as string) ?? null,
      updated_at: r.updated_at as string,
      foto_url: (r.foto_url as string) ?? null,
      empresa_nome: empresa?.nome ?? null,
      motorista_nome: motorista?.usuarios?.nome ?? null,
    };
  });
}

export type EmpresaItem = { id: string; nome: string };
export async function listEmpresas(): Promise<EmpresaItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("empresas_clientes")
    .select("id,nome")
    .order("nome");
  return (data ?? []) as EmpresaItem[];
}

export type MotoristaItem = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  veiculo_id: string | null;
  ativo: boolean;
};
export async function listMotoristas(): Promise<MotoristaItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("motoristas")
    .select("id,telefone,veiculo_id,usuarios(nome,email,ativo)");
  return ((data ?? []) as Record<string, unknown>[]).map((m) => {
    const u = m.usuarios as
      | { nome?: string; email?: string; ativo?: boolean }
      | null;
    return {
      id: m.id as string,
      telefone: (m.telefone as string) ?? null,
      veiculo_id: (m.veiculo_id as string) ?? null,
      nome: u?.nome ?? null,
      email: u?.email ?? null,
      ativo: u?.ativo ?? true,
    };
  });
}

export type VeiculoItem = {
  id: string;
  placa: string;
  tipo: string | null;
  ativo: boolean;
};
export async function listVeiculos(): Promise<VeiculoItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("veiculos")
    .select("id,placa,tipo,ativo")
    .order("placa");
  return (data ?? []) as VeiculoItem[];
}
