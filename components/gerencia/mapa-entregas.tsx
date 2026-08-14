"use client";

// Mapa de entregas do dashboard da gerência.
//   Camadas exclusivas:
//     "destino"  → geocodificação do endereço da NF (lib/geocode.ts)
//     "entregue" → GPS real capturado no momento do canhoto
//   Sobreposta (independente):
//     motoristas → última posição de quem está com romaneio ativo (A-006)
//
// O Leaflet só existe no browser, por isso o componente que de fato usa
// react-leaflet é carregado via next/dynamic com ssr:false.
import { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { IconMapPin, IconRefresh, IconSteeringWheel } from "@tabler/icons-react";
import { Button, Card, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { PontoDestino, PontoEntregue, PosicaoMotorista } from "@/lib/data/mapa";
import { geocodificarPendentes } from "@/app/gerencia/dashboard/geocode-actions";
import type { MotoristaMapa, PontoMapa } from "@/components/mapa/leaflet-map";

const MapaLeafletInner = dynamic(
  () => import("@/components/mapa/leaflet-map").then((m) => m.MapaLeafletInner),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-muted">Carregando mapa…</div> },
);

type Camada = "destino" | "entregue";

// De quanto em quanto tempo o "visto há X min" é recalculado. Só mexe em estado
// local — nada de ir ao servidor.
const MS_RECALCULO_RELOGIO = 30_000;

/** Posição recebida por Realtime, sem o nome (que vem de um join no servidor). */
type PosicaoAoVivo = { lat: number; lng: number; atualizado_em: string };

export function MapaEntregas({
  destinos,
  entregues,
  pendentesDeGeocode,
  motoristas,
}: {
  destinos: PontoDestino[];
  entregues: PontoEntregue[];
  pendentesDeGeocode: number;
  motoristas: PosicaoMotorista[];
}) {
  const [camada, setCamada] = useState<Camada>("destino");
  const [verMotoristas, setVerMotoristas] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [ultimoResultado, setUltimoResultado] = useState<string | null>(null);

  // Só as atualizações que chegaram por Realtime ficam em estado; a lista de
  // QUEM está ativo continua vindo do servidor. Guardar a lista inteira em
  // estado exigiria um efeito de sincronia com as props — que, além de ser um
  // antipadrão, entraria em loop de render caso a prop viesse com um array
  // default novo a cada renderização.
  // Deliberadamente NÃO usamos o RealtimeRefresher genérico aqui: ele dispara
  // router.refresh(), o que recarregaria o dashboard inteiro a cada ping de GPS
  // (~30s por motorista ativo).
  const [aoVivo, setAoVivo] = useState<Record<string, PosicaoAoVivo>>({});

  // Relógio: sem isto, "visto há 2 min" continuaria escrito 2 min para sempre
  // enquanto nenhuma posição nova chegasse — justamente o caso em que o dado
  // envelhecendo é a informação importante.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), MS_RECALCULO_RELOGIO);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`motorista-posicao-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "motorista_posicao" },
        (payload) => {
          const nova = payload.new as Partial<PosicaoMotorista> | null;
          if (
            !nova?.motorista_id ||
            nova.lat == null ||
            nova.lng == null ||
            !nova.atualizado_em
          )
            return;
          setAoVivo((prev) => ({
            ...prev,
            [nova.motorista_id as string]: {
              lat: nova.lat as number,
              lng: nova.lng as number,
              atualizado_em: nova.atualizado_em as string,
            },
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

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

  // Servidor manda QUEM está ativo (com nome); o Realtime só sobrepõe a posição
  // — e só quando for mais recente, pra um evento atrasado não fazer o marcador
  // "voltar no tempo".
  const marcadoresMotorista: MotoristaMapa[] = verMotoristas
    ? motoristas.map((m) => {
        const ao = aoVivo[m.motorista_id];
        const usarAoVivo =
          ao && Date.parse(ao.atualizado_em) > Date.parse(m.atualizado_em);
        const pos = usarAoVivo ? ao : m;
        return {
          id: m.motorista_id,
          lat: pos.lat,
          lng: pos.lng,
          nome: m.nome ?? "Motorista",
          minutosAtras: Math.max(
            0,
            Math.floor((agora - Date.parse(pos.atualizado_em)) / 60_000),
          ),
        };
      })
    : [];

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
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Sobreposta, não exclusiva: ver o motorista JUNTO dos destinos é o
              que responde "ele está perto do que falta entregar?". */}
          <button
            onClick={() => setVerMotoristas((v) => !v)}
            aria-pressed={verMotoristas}
            disabled={motoristas.length === 0}
            title={
              motoristas.length === 0
                ? "Nenhum motorista com romaneio ativo agora"
                : undefined
            }
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              verMotoristas && motoristas.length > 0
                ? "border-brand bg-brand text-white"
                : "border-line text-muted hover:text-ink"
            }`}
          >
            <IconSteeringWheel size={13} />
            Motoristas ({motoristas.length})
          </button>

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
        <MapaLeafletInner pontos={pontos} motoristas={marcadoresMotorista} />
      </div>

      {ultimoResultado && (
        <p className="border-t border-line px-3 py-2 text-xs text-muted">{ultimoResultado}</p>
      )}
    </Card>
  );
}
