import "server-only";

// Dados para o mapa do dashboard da gerência. Duas camadas distintas:
//  - "destino": geocodificação do endereço da NF (lib/geocode.ts) — mostra pra
//    onde a entrega vai, antes de acontecer.
//  - "entregue": GPS real capturado no momento do canhoto (migration 0005) —
//    mostra onde a entrega de fato aconteceu.
import { createClient } from "@/lib/supabase/server";
import { diaSeguinte, hojeSP, inicioDiaSP } from "@/lib/date";
import { NF_STATUS_ABERTOS, type NotaStatus } from "@/lib/types";

export type PontoDestino = {
  id: string;
  numero_nf: string;
  destinatario_nome: string;
  cidade: string | null;
  status: NotaStatus;
  lat: number;
  lng: number;
};

export async function getDestinosGeocodificados(data?: string): Promise<PontoDestino[]> {
  const supabase = await createClient();
  const dia = data ?? hojeSP();
  let q = supabase
    .from("notas_fiscais")
    .select("id,numero_nf,destinatario_nome,cidade,status,lat,lng")
    .not("lat", "is", null)
    .not("lng", "is", null);
  // Hoje (qualquer status) + pendências antigas em aberto — mesmo padrão de
  // lib/data/gerencia.ts (ver A-001). Sem isso, um pino de entrega já feita há
  // meses nunca sairia do mapa "de hoje".
  q = data
    ? q.eq("data_entrega", data)
    : q.or(`data_entrega.eq.${dia},status.in.(${NF_STATUS_ABERTOS.join(",")})`);
  const { data: rows } = await q;

  return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    numero_nf: r.numero_nf as string,
    destinatario_nome: r.destinatario_nome as string,
    cidade: (r.cidade as string) ?? null,
    status: r.status as NotaStatus,
    lat: r.lat as number,
    lng: r.lng as number,
  }));
}

export async function contarDestinosPendentesDeGeocode(data?: string): Promise<number> {
  const supabase = await createClient();
  const dia = data ?? hojeSP();
  let q = supabase
    .from("notas_fiscais")
    .select("id", { count: "exact", head: true })
    .is("lat", null)
    .is("geocode_status", null);
  q = data
    ? q.eq("data_entrega", data)
    : q.or(`data_entrega.eq.${dia},status.in.(${NF_STATUS_ABERTOS.join(",")})`);
  const { count } = await q;
  return count ?? 0;
}

export type PontoEntregue = {
  id: string;
  numero_nf: string;
  destinatario_nome: string;
  status: NotaStatus;
  registrado_em: string;
  lat: number;
  lng: number;
};

export async function getEntreguesComGps(data?: string): Promise<PontoEntregue[]> {
  const supabase = await createClient();
  const dia = data ?? hojeSP();
  // Ancorado em QUANDO a entrega aconteceu (canhotos.registrado_em), não na
  // data_entrega alvo da NF: desde A-007 uma NF pode ser entregue dias depois
  // do previsto (nova tentativa após recusa/ocorrência), e o mapa "de hoje"
  // precisa mostrar a ação de hoje, não o planejamento antigo.
  const { data: rows } = await supabase
    .from("canhotos")
    .select(
      "registrado_em,status,lat,lng,notas_fiscais!inner(id,numero_nf,destinatario_nome)",
    )
    .gte("registrado_em", inicioDiaSP(dia))
    .lt("registrado_em", inicioDiaSP(diaSeguinte(dia)))
    .not("lat", "is", null)
    .not("lng", "is", null);

  return ((rows ?? []) as Record<string, unknown>[]).map((r) => {
    const nf = r.notas_fiscais as {
      id: string;
      numero_nf: string;
      destinatario_nome: string;
    };
    return {
      id: nf.id,
      numero_nf: nf.numero_nf,
      destinatario_nome: nf.destinatario_nome,
      status: r.status as NotaStatus,
      registrado_em: r.registrado_em as string,
      lat: r.lat as number,
      lng: r.lng as number,
    };
  });
}

export type PosicaoMotorista = {
  motorista_id: string;
  nome: string | null;
  lat: number;
  lng: number;
  atualizado_em: string;
};

// Camada "Motoristas" do mapa (A-006) — só quem tem romaneio ativo E confirmado
// agora aparece; sem trilha, só a última posição (migration 0017).
export async function getPosicoesMotoristas(): Promise<PosicaoMotorista[]> {
  const supabase = await createClient();

  const { data: ativos } = await supabase
    .from("romaneios")
    .select("motorista_id")
    .eq("status", "ativo")
    .not("confirmado_em", "is", null);
  const motoristaIds = Array.from(
    new Set(
      (ativos ?? [])
        .map((r) => r.motorista_id as string | null)
        .filter((id): id is string => id !== null),
    ),
  );
  if (motoristaIds.length === 0) return [];

  const { data: rows } = await supabase
    .from("motorista_posicao")
    .select("motorista_id,lat,lng,atualizado_em,motoristas(usuarios(nome))")
    .in("motorista_id", motoristaIds);

  return ((rows ?? []) as Record<string, unknown>[]).map((r) => {
    const motorista = r.motoristas as { usuarios?: { nome?: string } } | null;
    return {
      motorista_id: r.motorista_id as string,
      nome: motorista?.usuarios?.nome ?? null,
      lat: r.lat as number,
      lng: r.lng as number,
      atualizado_em: r.atualizado_em as string,
    };
  });
}
