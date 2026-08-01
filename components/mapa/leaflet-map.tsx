"use client";

// Renderização Leaflet de verdade — só roda no browser (ver mapa-entregas.tsx,
// que carrega este componente via next/dynamic com ssr:false). CircleMarker em
// vez de ícone de imagem: evita o problema clássico do Leaflet com o path dos
// ícones padrão quebrando em bundlers.
import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { NOTA_STATUS_META, type NotaStatus } from "@/lib/types";

// Centro padrão: Caxias do Sul, RS (Serra Gaúcha — região de operação da Rotta).
const CENTRO_PADRAO: [number, number] = [-29.1678, -51.1794];

export type PontoMapa = {
  id: string;
  lat: number;
  lng: number;
  status: NotaStatus;
  titulo: string;
  subtitulo: string;
};

// Tom → variável CSS de cor (mesmos tokens usados em components/ui/index.tsx),
// resolvida em runtime porque o Leaflet precisa de uma cor concreta, não uma
// classe Tailwind.
const TONE_VAR: Record<NotaStatus, string> = {
  pendente: "--color-gray-600",
  em_rota: "--color-info",
  aceita: "--color-success",
  recusada: "--color-danger",
  ocorrencia: "--color-warning",
};

function corDoStatus(status: NotaStatus): string {
  if (typeof window === "undefined") return "#757575";
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(TONE_VAR[status])
    .trim();
  return valor || "#757575";
}

export function MapaLeafletInner({ pontos }: { pontos: PontoMapa[] }) {
  const centro: [number, number] =
    pontos.length > 0
      ? [
          pontos.reduce((s, p) => s + p.lat, 0) / pontos.length,
          pontos.reduce((s, p) => s + p.lng, 0) / pontos.length,
        ]
      : CENTRO_PADRAO;

  return (
    <MapContainer
      center={centro}
      zoom={pontos.length > 0 ? 12 : 11}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pontos.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={8}
          pathOptions={{
            color: corDoStatus(p.status),
            fillColor: corDoStatus(p.status),
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{p.titulo}</p>
              <p className="text-muted">{p.subtitulo}</p>
              <p className="mt-1">{NOTA_STATUS_META[p.status].label}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
