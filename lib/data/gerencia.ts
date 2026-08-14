import "server-only";

// Consultas server-side da área de gerência (RLS aplica: gerência vê tudo).
import { createClient } from "@/lib/supabase/server";
import { diaSeguinte, diasAtrasSP, hojeSP, inicioDiaSP } from "@/lib/date";
import {
  NF_STATUS_ABERTOS,
  type CanhotoStatus,
  type NotaStatus,
} from "@/lib/types";

// Dia operacional em São Paulo (não UTC — ver lib/date.ts).
export const hojeISO = () => hojeSP();

// KPIs do topo do dashboard. Duas naturezas diferentes de número convivem aqui,
// e a distinção importa para ler a faixa corretamente:
//
//   ESTADO AGORA  (total, pendente, pendenteTotal, em_rota) — vem de
//     notas_fiscais: quantas NFs existem e em que situação estão neste momento.
//
//   EVENTO DE HOJE (aceita, recusada, ocorrencia) — vem de canhotos: o que o
//     motorista de fato registrou hoje.
//
// Por que os desfechos NÃO podem sair de notas_fiscais.status: desde o A-007
// (migration 0016) a NF só persiste 'pendente' | 'em_rota' | 'aceita' — recusa e
// ocorrência devolvem a nota ao painel como 'pendente', e o desfecho real fica
// só em canhotos.status. Contar pela NF faria os cards "Recusadas" e
// "Ocorrências" marcarem zero para sempre.
export type ResumoDia = {
  /** NFs programadas para hoje. */
  total: number;
  /** Em aberto com data de hoje. */
  pendente: number;
  /** Passivo real: toda NF em aberto, inclusive atrasada de dias anteriores. */
  pendenteTotal: number;
  /** Em rota neste momento. */
  em_rota: number;
  /** Tentativas registradas HOJE, por desfecho. */
  aceita: number;
  recusada: number;
  ocorrencia: number;
};

export async function getResumoHoje(data?: string): Promise<ResumoDia> {
  const supabase = await createClient();
  const dia = data ?? hojeISO();

  const [doDia, abertas, tentativas] = await Promise.all([
    // Estado das NFs programadas para o dia.
    supabase.from("notas_fiscais").select("status").eq("data_entrega", dia),
    // Passivo acumulado — todo o "em aberto", sem recorte de data. É o número
    // que casa com a tabela abaixo da faixa (que também mostra o acumulado).
    supabase
      .from("notas_fiscais")
      .select("id", { count: "exact", head: true })
      .in("status", NF_STATUS_ABERTOS),
    // Desfechos de hoje: ancorados em quando a tentativa aconteceu, então uma
    // NF de ontem entregue hoje conta como entrega de hoje.
    supabase
      .from("canhotos")
      .select("status")
      .gte("registrado_em", inicioDiaSP(dia))
      .lt("registrado_em", inicioDiaSP(diaSeguinte(dia))),
  ]);

  const r: ResumoDia = {
    total: 0,
    pendente: 0,
    pendenteTotal: abertas.count ?? 0,
    em_rota: 0,
    aceita: 0,
    recusada: 0,
    ocorrencia: 0,
  };

  for (const row of (doDia.data ?? []) as { status: NotaStatus }[]) {
    r.total++;
    if (row.status === "pendente") r.pendente++;
    else if (row.status === "em_rota") r.em_rota++;
  }

  for (const row of (tentativas.data ?? []) as { status: CanhotoStatus }[]) {
    if (row.status === "aceita") r.aceita++;
    else if (row.status === "recusada") r.recusada++;
    else if (row.status === "ocorrencia") r.ocorrencia++;
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
  motorista_id: string | null;
  motorista_nome: string | null;
  // Data-alvo da entrega — base da regra de "NF parada" (lib/alertas.ts, A-008).
  data_entrega: string;
  updated_at: string;
  foto_url: string | null;
  lat: number | null;
  lng: number | null;
  geocode_status: "ok" | "falhou" | null;
  geocode_erro: string | null;
};

export type NotaFiltro = {
  status?: string;
  motorista?: string;
  empresa?: string;
  // Mesmo padrão de lib/data/cliente.ts (ClienteFiltro.periodo). Sem período
  // explícito, o default é "hoje + tudo que ainda está em aberto" — uma NF de
  // ontem ainda pendente não pode ficar escondida esperando o usuário pensar
  // em trocar o filtro (ver encaminhamentos/luis-fernando-boff.md § A-001).
  periodo?: "hoje" | "semana" | "mes" | "todos";
};

export async function getNotasDoDia(f: NotaFiltro): Promise<NotaRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("notas_fiscais")
    .select(
      "id,numero_nf,status,destinatario_nome,destinatario_endereco,cidade,data_entrega,updated_at,foto_url,motorista_id,lat,lng,geocode_status,geocode_erro,empresas_clientes(nome),motoristas(usuarios(nome))",
    )
    .order("updated_at", { ascending: false });

  if (f.periodo === "semana") q = q.gte("data_entrega", diasAtrasSP(7));
  else if (f.periodo === "mes") q = q.gte("data_entrega", diasAtrasSP(30));
  else if (f.periodo === "hoje") q = q.eq("data_entrega", hojeISO());
  else if (f.periodo !== "todos")
    q = q.or(`data_entrega.eq.${hojeISO()},status.in.(${NF_STATUS_ABERTOS.join(",")})`);

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
      data_entrega: r.data_entrega as string,
      updated_at: r.updated_at as string,
      foto_url: (r.foto_url as string) ?? null,
      empresa_nome: empresa?.nome ?? null,
      motorista_id: (r.motorista_id as string) ?? null,
      motorista_nome: motorista?.usuarios?.nome ?? null,
      lat: (r.lat as number) ?? null,
      lng: (r.lng as number) ?? null,
      geocode_status: (r.geocode_status as "ok" | "falhou") ?? null,
      geocode_erro: (r.geocode_erro as string) ?? null,
    };
  });
}

// ── Painel por cliente (empresa embarcadora) do dashboard ────────────────────
// "Cliente" da transportadora = empresa embarcadora. "Cliente final" = destinatário.
export type NotaClienteFinal = {
  id: string;
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
  total: number; // NFs de hoje + pendências antigas em aberto
  aguardando: number; // ainda sem romaneio
  cidades: CidadeGrupo[]; // agrupadas por cidade (prioridade do cliente)
};

// Agrega as NFs do dia por empresa embarcadora e, dentro dela, por cidade.
// Alimenta a faixa de clientes do dashboard e o painel que abre ao clicar.
export async function getPainelClientes(
  data?: string,
): Promise<EmpresaPainel[]> {
  const supabase = await createClient();
  let q = supabase
    .from("notas_fiscais")
    .select(
      "id,numero_nf,destinatario_nome,cidade,status,romaneio_id,empresa_cliente_id,empresas_clientes(nome)",
    );
  q = data
    ? q.eq("data_entrega", data)
    : q.or(`data_entrega.eq.${hojeISO()},status.in.(${NF_STATUS_ABERTOS.join(",")})`);
  const { data: rows } = await q;

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
      id: r.id as string,
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

export type EmpresaItem = { id: string; nome: string; ativo: boolean };
export async function listEmpresas(): Promise<EmpresaItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("empresas_clientes")
    .select("id,nome,ativo")
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
