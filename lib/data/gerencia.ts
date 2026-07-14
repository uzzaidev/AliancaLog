import "server-only";

// Consultas server-side da área de gerência (RLS aplica: gerência vê tudo).
import { createClient } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/date";
import type { NotaStatus } from "@/lib/types";

// Dia operacional em São Paulo (não UTC — ver lib/date.ts).
export const hojeISO = () => hojeSP();

export type ResumoDia = {
  total: number;
  pendente: number;
  em_rota: number;
  aceita: number;
  recusada: number;
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

// ── Painel por cliente (empresa embarcadora) do dashboard ────────────────────
// "Cliente" da transportadora = empresa embarcadora. "Cliente final" = destinatário.
export type NotaClienteFinal = {
  numero_nf: string;
  destinatario_nome: string;
  cidade: string | null;
  status: NotaStatus;
  aguardando: boolean; // ainda sem romaneio (não bipada)
};

export type CidadeGrupo = { cidade: string; notas: NotaClienteFinal[] };

export type EmpresaPainel = {
  id: string;
  nome: string;
  total: number; // NFs importadas hoje
  aguardando: number; // ainda sem romaneio
  cidades: CidadeGrupo[]; // agrupadas por cidade (prioridade do cliente)
};

// Agrega as NFs do dia por empresa embarcadora e, dentro dela, por cidade.
// Alimenta a faixa de clientes do dashboard e o painel que abre ao clicar.
export async function getPainelClientes(
  data?: string,
): Promise<EmpresaPainel[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notas_fiscais")
    .select(
      "numero_nf,destinatario_nome,cidade,status,romaneio_id,empresa_cliente_id,empresas_clientes(nome)",
    )
    .eq("data_entrega", data ?? hojeISO());

  const porEmpresa = new Map<string, EmpresaPainel>();
  for (const r of (rows ?? []) as Record<string, unknown>[]) {
    const empId = (r.empresa_cliente_id as string) ?? "sem-empresa";
    const nome =
      (r.empresas_clientes as { nome?: string } | null)?.nome ?? "Sem empresa";
    let emp = porEmpresa.get(empId);
    if (!emp) {
      emp = { id: empId, nome, total: 0, aguardando: 0, cidades: [] };
      porEmpresa.set(empId, emp);
    }
    const aguardando = !(r.romaneio_id as string | null);
    emp.total++;
    if (aguardando) emp.aguardando++;

    const cidade = (r.cidade as string) || "Sem cidade";
    let grupo = emp.cidades.find((c) => c.cidade === cidade);
    if (!grupo) {
      grupo = { cidade, notas: [] };
      emp.cidades.push(grupo);
    }
    grupo.notas.push({
      numero_nf: r.numero_nf as string,
      destinatario_nome: r.destinatario_nome as string,
      cidade: (r.cidade as string) ?? null,
      status: r.status as NotaStatus,
      aguardando,
    });
  }

  const lista = Array.from(porEmpresa.values());
  for (const emp of lista) {
    emp.cidades.sort((a, b) => b.notas.length - a.notas.length);
    for (const c of emp.cidades)
      c.notas.sort((a, b) => a.numero_nf.localeCompare(b.numero_nf));
  }
  lista.sort((a, b) => b.total - a.total);
  return lista;
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
