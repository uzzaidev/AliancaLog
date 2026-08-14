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

// Resultado explícito (em vez de `Coordenada | null`) para a gerência conseguir
// ver POR QUE um endereço falhou, não só "falhou" — endereço com erro de
// digitação, incompleto ou fora do OSM tem causas bem diferentes de "sem sinal".
export type GeocodeResultado =
  | { ok: true; lat: number; lng: number }
  | { ok: false; erro: string };

export async function geocodificarEndereco(
  endereco: string,
  cidade?: string | null,
): Promise<GeocodeResultado> {
  const query = [endereco, cidade, "Brasil"].filter(Boolean).join(", ");
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR" },
    });
  } catch {
    return { ok: false, erro: "Falha de rede ao consultar o serviço de mapas." };
  }
  if (!res.ok)
    return { ok: false, erro: `Serviço de mapas indisponível (erro ${res.status}).` };

  let data: { lat: string; lon: string }[];
  try {
    data = await res.json();
  } catch {
    return { ok: false, erro: "Resposta inválida do serviço de mapas." };
  }
  if (!data.length)
    return {
      ok: false,
      erro: "Endereço não encontrado no mapa — confira rua, número e cidade.",
    };

  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    return { ok: false, erro: "Coordenada inválida devolvida pelo serviço de mapas." };
  return { ok: true, lat, lng };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Geocodifica uma lista de itens sequencialmente, respeitando o rate limit do
// Nominatim (1 req/s). Chame com poucos itens por vez (ver geocode-actions.ts) —
// isto pode ser lento (item.length segundos) e roda dentro do tempo de uma Server Action.
export async function geocodificarLote<T extends { id: string; endereco: string; cidade?: string | null }>(
  itens: T[],
): Promise<Map<string, GeocodeResultado>> {
  const resultado = new Map<string, GeocodeResultado>();
  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    resultado.set(item.id, await geocodificarEndereco(item.endereco, item.cidade));
    if (i < itens.length - 1) await sleep(INTERVALO_MS);
  }
  return resultado;
}
