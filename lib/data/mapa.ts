import "server-only";

// Dados para o mapa do dashboard da gerência. Duas camadas distintas:
//  - "destino": geocodificação do endereço da NF (lib/geocode.ts) — mostra pra
//    onde a entrega vai, antes de acontecer.
//  - "entregue": GPS real capturado no momento do canhoto (migration 0005) —
//    mostra onde a entrega de fato aconteceu.
import { createClient } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/date";
import type { NotaStatus } from "@/lib/types";

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
  const { data: rows } = await supabase
    .from("notas_fiscais")
    .select("id,numero_nf,destinatario_nome,cidade,status,lat,lng")
    .eq("data_entrega", data ?? hojeSP())
    .not("lat", "is", null)
    .not("lng", "is", null);

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
  const { count } = await supabase
    .from("notas_fiscais")
    .select("id", { count: "exact", head: true })
    .eq("data_entrega", data ?? hojeSP())
    .is("lat", null)
    .is("geocode_status", null);
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
  const { data: rows } = await supabase
    .from("canhotos")
    .select(
      "registrado_em,status,lat,lng,notas_fiscais!inner(id,numero_nf,destinatario_nome,data_entrega)",
    )
    .eq("notas_fiscais.data_entrega", data ?? hojeSP())
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
