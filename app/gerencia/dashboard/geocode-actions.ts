"use server";

// Geocodifica endereços de NFs em aberto que ainda não têm lat/lng — e dá um
// jeito de recuperar quando falha, em vez da NF ficar invisível no mapa pra
// sempre em silêncio: mostra o motivo, tenta de novo, ou aceita correção manual
// (endereço reeditado ou coordenada digitada direto).
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/date";
import { geocodificarEndereco, geocodificarLote } from "@/lib/geocode";
import { NF_STATUS_ABERTOS } from "@/lib/types";

const LOTE_MAX = 15;

export type GeocodeResult = { tentadas: number; ok: number; falhas: number };

export async function geocodificarPendentes(): Promise<GeocodeResult> {
  await requireRole("gerencia");
  const supabase = await createClient();

  // Sem filtro de geocode_status: reprocessa tanto quem nunca foi tentado
  // (status null) quanto quem falhou antes (status='falhou') — antes um
  // endereço que falhava uma vez ficava invisível pra sempre, porque só
  // status IS NULL entrava aqui. Ordena com os nunca-tentados primeiro, pra um
  // endereço permanentemente ruim não "roubar" o lote de NFs novas.
  const { data: pendentes } = await supabase
    .from("notas_fiscais")
    .select("id,destinatario_endereco,cidade")
    .or(`data_entrega.eq.${hojeSP()},status.in.(${NF_STATUS_ABERTOS.join(",")})`)
    .is("lat", null)
    .order("geocode_status", { ascending: true, nullsFirst: true })
    .limit(LOTE_MAX);

  const rows = (pendentes ?? []) as { id: string; destinatario_endereco: string; cidade: string | null }[];
  if (rows.length === 0) return { tentadas: 0, ok: 0, falhas: 0 };

  const resultados = await geocodificarLote(
    rows.map((r) => ({ id: r.id, endereco: r.destinatario_endereco, cidade: r.cidade })),
  );

  let ok = 0;
  let falhas = 0;
  const agora = new Date().toISOString();
  for (const [id, r] of resultados) {
    if (r.ok) {
      ok++;
      await supabase
        .from("notas_fiscais")
        .update({ lat: r.lat, lng: r.lng, geocode_status: "ok", geocode_erro: null, geocoded_em: agora })
        .eq("id", id);
    } else {
      falhas++;
      await supabase
        .from("notas_fiscais")
        .update({ geocode_status: "falhou", geocode_erro: r.erro, geocoded_em: agora })
        .eq("id", id);
    }
  }

  revalidatePath("/gerencia/dashboard");
  return { tentadas: rows.length, ok, falhas };
}

// Corrige o endereço da NF (erro de digitação, incompleto...) e tenta
// geocodificar de novo na hora — item único, sem precisar esperar o lote.
export async function corrigirEnderecoEGeocodificar(input: {
  nfId: string;
  endereco: string;
  cidade?: string;
}): Promise<{ ok?: string; error?: string }> {
  await requireRole("gerencia");
  const endereco = input.endereco.trim();
  if (!endereco) return { error: "Endereço não pode ficar vazio." };
  const cidade = input.cidade?.trim() || null;

  const supabase = await createClient();
  const resultado = await geocodificarEndereco(endereco, cidade);
  const agora = new Date().toISOString();

  const { error } = await supabase
    .from("notas_fiscais")
    .update(
      resultado.ok
        ? {
            destinatario_endereco: endereco,
            cidade,
            lat: resultado.lat,
            lng: resultado.lng,
            geocode_status: "ok",
            geocode_erro: null,
            geocoded_em: agora,
          }
        : {
            destinatario_endereco: endereco,
            cidade,
            geocode_status: "falhou",
            geocode_erro: resultado.erro,
            geocoded_em: agora,
          },
    )
    .eq("id", input.nfId);
  if (error) return { error: error.message };

  revalidatePath("/gerencia/dashboard");
  return resultado.ok
    ? { ok: "Endereço corrigido e geocodificado." }
    : { error: `Endereço salvo, mas a geocodificação falhou de novo: ${resultado.erro}` };
}

// Último recurso: gerência informa a coordenada direto (ex.: copiada do Google
// Maps) para endereços que o Nominatim nunca vai resolver (zona rural, ponto de
// referência sem CEP/logradouro formal).
export async function definirCoordenadaManual(input: {
  nfId: string;
  lat: number;
  lng: number;
}): Promise<{ ok?: string; error?: string }> {
  await requireRole("gerencia");
  const { lat, lng } = input;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90)
    return { error: "Latitude inválida (precisa estar entre -90 e 90)." };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)
    return { error: "Longitude inválida (precisa estar entre -180 e 180)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notas_fiscais")
    .update({
      lat,
      lng,
      geocode_status: "ok",
      geocode_erro: null,
      geocoded_em: new Date().toISOString(),
    })
    .eq("id", input.nfId);
  if (error) return { error: error.message };

  revalidatePath("/gerencia/dashboard");
  return { ok: "Coordenada salva." };
}
