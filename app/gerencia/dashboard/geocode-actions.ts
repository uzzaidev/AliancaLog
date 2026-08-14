"use server";

// Geocodifica endereços de NFs do dia que ainda não têm lat/lng. Roda em lote
// pequeno por chamada (Nominatim exige ~1 req/s — um dia inteiro de NFs
// estouraria o tempo de uma Server Action se disparado tudo de uma vez).
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/date";
import { geocodificarLote } from "@/lib/geocode";
import { NF_STATUS_ABERTOS } from "@/lib/types";

const LOTE_MAX = 15;

export type GeocodeResult = { tentadas: number; ok: number; falhas: number };

export async function geocodificarPendentes(): Promise<GeocodeResult> {
  await requireRole("gerencia");
  const supabase = await createClient();

  // Mesmo filtro "hoje + em aberto" de contarDestinosPendentesDeGeocode
  // (lib/data/mapa.ts) — o contador do botão já usava isso; a ação em si tinha
  // ficado presa em "só hoje", então uma NF pendente de dias anteriores contava
  // no botão mas nunca era de fato processada ao clicar.
  const { data: pendentes } = await supabase
    .from("notas_fiscais")
    .select("id,destinatario_endereco,cidade")
    .or(`data_entrega.eq.${hojeSP()},status.in.(${NF_STATUS_ABERTOS.join(",")})`)
    .is("lat", null)
    .is("geocode_status", null)
    .limit(LOTE_MAX);

  const rows = (pendentes ?? []) as { id: string; destinatario_endereco: string; cidade: string | null }[];
  if (rows.length === 0) return { tentadas: 0, ok: 0, falhas: 0 };

  const resultados = await geocodificarLote(
    rows.map((r) => ({ id: r.id, endereco: r.destinatario_endereco, cidade: r.cidade })),
  );

  let ok = 0;
  let falhas = 0;
  const agora = new Date().toISOString();
  for (const [id, coord] of resultados) {
    if (coord) {
      ok++;
      await supabase
        .from("notas_fiscais")
        .update({ lat: coord.lat, lng: coord.lng, geocode_status: "ok", geocoded_em: agora })
        .eq("id", id);
    } else {
      falhas++;
      await supabase
        .from("notas_fiscais")
        .update({ geocode_status: "falhou", geocoded_em: agora })
        .eq("id", id);
    }
  }

  revalidatePath("/gerencia/dashboard");
  return { tentadas: rows.length, ok, falhas };
}
