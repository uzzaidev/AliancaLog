import "server-only";

// Geocodificação de endereço → lat/lng via Nominatim (OpenStreetMap), gratuito.
//
// Política de uso do Nominatim (https://operations.osmfoundation.org/policies/nominatim/):
// máx. 1 requisição/segundo e User-Agent identificando a aplicação. Por isso
// geocodificarLote() chama sequencialmente com um intervalo — nunca em paralelo.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "AliancaLog/1.0 (contato: gerencia@rotta.com.br)";
const INTERVALO_MS = 1100;

export type Coordenada = { lat: number; lng: number };

export async function geocodificarEndereco(
  endereco: string,
  cidade?: string | null,
): Promise<Coordenada | null> {
  const query = [endereco, cidade, "Brasil"].filter(Boolean).join(", ");
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null; // best-effort — endereço fica sem coordenada, não trava o fluxo
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Geocodifica uma lista de itens sequencialmente, respeitando o rate limit do
// Nominatim (1 req/s). Chame com poucos itens por vez (ver geocodificar-actions.ts) —
// isto pode ser lento (item.length segundos) e roda dentro do tempo de uma Server Action.
export async function geocodificarLote<T extends { id: string; endereco: string; cidade?: string | null }>(
  itens: T[],
): Promise<Map<string, Coordenada | null>> {
  const resultado = new Map<string, Coordenada | null>();
  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    resultado.set(item.id, await geocodificarEndereco(item.endereco, item.cidade));
    if (i < itens.length - 1) await sleep(INTERVALO_MS);
  }
  return resultado;
}
