"use client";

// Mapa de entregas do dashboard da gerência — duas camadas:
//   "destino"  → geocodificação do endereço da NF (lib/geocode.ts)
//   "entregue" → GPS real capturado no momento do canhoto
// O Leaflet só existe no browser, por isso o componente que de fato usa
// react-leaflet é carregado via next/dynamic com ssr:false.
import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { IconMapPin, IconRefresh } from "@tabler/icons-react";
import { Button, Card, Spinner } from "@/components/ui";
import type { PontoDestino, PontoEntregue } from "@/lib/data/mapa";
import { geocodificarPendentes } from "@/app/gerencia/dashboard/geocode-actions";
import type { PontoMapa } from "@/components/mapa/leaflet-map";

const MapaLeafletInner = dynamic(
  () => import("@/components/mapa/leaflet-map").then((m) => m.MapaLeafletInner),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted">Carregando mapa…</div> },
);

type Camada = "destino" | "entregue";

export function MapaEntregas({
  destinos,
  entregues,
  pendentesDeGeocode,
}: {
  destinos: PontoDestino[];
  entregues: PontoEntregue[];
  pendentesDeGeocode: number;
}) {
  const [camada, setCamada] = useState<Camada>("destino");
  const [isPending, startTransition] = useTransition();
  const [ultimoResultado, setUltimoResultado] = useState<string | null>(null);

  const pontos: PontoMapa[] =
    camada === "destino"
      ? destinos.map((d) => ({
          id: d.id,
          lat: d.lat,
          lng: d.lng,
          status: d.status,
          titulo: `NF ${d.numero_nf}`,
          subtitulo: `${d.destinatario_nome}${d.cidade ? " · " + d.cidade : ""}`,
        }))
      : entregues.map((e) => ({
          id: e.id,
          lat: e.lat,
          lng: e.lng,
          status: e.status,
          titulo: `NF ${e.numero_nf}`,
          subtitulo: `${e.destinatario_nome} · ${new Date(e.registrado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        }));

  function geocodificar() {
    startTransition(async () => {
      const r = await geocodificarPendentes();
      setUltimoResultado(
        r.tentadas === 0
          ? "Nenhum endereço pendente."
          : `${r.ok} geocodificado(s), ${r.falhas} falha(s) de ${r.tentadas}.`,
      );
    });
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-3">
        <div className="flex items-center gap-2">
          <IconMapPin className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold text-dark">Mapa de entregas</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-line p-0.5">
            <button
              onClick={() => setCamada("destino")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                camada === "destino" ? "bg-brand text-white" : "text-muted hover:text-ink"
              }`}
            >
              Destino ({destinos.length})
            </button>
            <button
              onClick={() => setCamada("entregue")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                camada === "entregue" ? "bg-brand text-white" : "text-muted hover:text-ink"
              }`}
            >
              Entregue (GPS) ({entregues.length})
            </button>
          </div>
          {camada === "destino" && (
            <Button
              variant="secondary"
              className="h-8 text-xs"
              disabled={isPending || pendentesDeGeocode === 0}
              onClick={geocodificar}
            >
              {isPending ? <Spinner /> : <IconRefresh className="h-3.5 w-3.5" />}
              {pendentesDeGeocode > 0 ? `Geocodificar (${pendentesDeGeocode})` : "Geocodificado"}
            </Button>
          )}
        </div>
      </div>

      {/* isolate: os panes/controles internos do Leaflet usam z-index até 1000;
          sem isolar o contexto de empilhamento aqui, eles vazam por cima da
          topbar sticky (z-20) mesmo estando bem mais abaixo no DOM. */}
      <div className="isolate relative h-64 w-full sm:h-80 lg:h-90">
        <MapaLeafletInner pontos={pontos} />
      </div>

      {ultimoResultado && (
        <p className="border-t border-line px-3 py-2 text-xs text-muted">{ultimoResultado}</p>
      )}
    </Card>
  );
}
