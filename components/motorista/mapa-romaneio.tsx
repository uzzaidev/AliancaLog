"use client";

// Visão geral das paradas do romaneio no mapa — só as que já foram
// geocodificadas pela gerência (migration 0014); some sozinho se nenhuma
// NF do romaneio tiver lat/lng ainda. Sem toggle/botão de geocodificar aqui:
// isso é ação da gerência (Server Action exige role gerencia).
import dynamic from "next/dynamic";
import type { NotaMotorista } from "@/lib/types";
import type { PontoMapa } from "@/components/mapa/leaflet-map";

const MapaLeafletInner = dynamic(
  () => import("@/components/mapa/leaflet-map").then((m) => m.MapaLeafletInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted">
        Carregando mapa…
      </div>
    ),
  },
);

export function MapaRomaneio({ notas }: { notas: NotaMotorista[] }) {
  const pontos: PontoMapa[] = notas
    .filter((n): n is NotaMotorista & { lat: number; lng: number } => n.lat != null && n.lng != null)
    .map((n) => ({
      id: n.id,
      lat: n.lat,
      lng: n.lng,
      status: n.status,
      titulo: `NF ${n.numero_nf}`,
      subtitulo: n.destinatario_nome,
    }));

  if (pontos.length === 0) return null;

  return (
    <div className="h-44 w-full overflow-hidden rounded-xl border border-line shadow-sm sm:h-56">
      <MapaLeafletInner pontos={pontos} />
    </div>
  );
}
