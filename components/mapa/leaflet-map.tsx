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

// Marcador de motorista (A-006) — visualmente distinto dos pinos de NF: anel
// laranja da marca, maior, e translúcido quando a posição está velha (motorista
// sem sinal). Sem `status`, porque motorista não tem status de NF.
export type MotoristaMapa = {
  id: string;
  lat: number;
  lng: number;
  nome: string;
  /** Minutos desde a última posição recebida — alimenta o "visto há X min". */
  minutosAtras: number;
};

// Acima disso a posição deixa de ser tratada como "ao vivo": o motorista pode
// estar sem sinal (Serra gaúcha) e o pino congelado passaria a impressão errada
// de que ele está parado naquele ponto agora.
const MINUTOS_POSICAO_VELHA = 5;

function textoVistoHa(min: number): string {
  if (min < 1) return "agora mesmo";
  if (min === 1) return "há 1 min";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return h === 1 ? "há 1 h" : `há ${h} h`;
}

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

// Componente só é montado no browser (dynamic import com ssr:false nos dois
// pontos de uso), então document/getComputedStyle sempre existem aqui.
function corDoStatus(status: NotaStatus): string {
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(TONE_VAR[status])
    .trim();
  return valor || "currentColor";
}

function corVar(nome: string): string {
  const valor = getComputedStyle(document.documentElement)
    .getPropertyValue(nome)
    .trim();
  return valor || "currentColor";
}

export function MapaLeafletInner({
  pontos,
  motoristas = [],
}: {
  pontos: PontoMapa[];
  motoristas?: MotoristaMapa[];
}) {
  // Centraliza considerando tudo que está no mapa — se só há motorista em tela
  // (nenhuma NF geocodificada ainda), o mapa precisa abrir onde ele está.
  const todos = [...pontos, ...motoristas];
  const centro: [number, number] =
    todos.length > 0
      ? [
          todos.reduce((s, p) => s + p.lat, 0) / todos.length,
          todos.reduce((s, p) => s + p.lng, 0) / todos.length,
        ]
      : CENTRO_PADRAO;

  return (
    <MapContainer
      center={centro}
      zoom={todos.length > 0 ? 12 : 11}
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

      {/* Motoristas por último: ficam desenhados por cima dos pinos de NF, que
          é o que a gerência quer olhar primeiro ("onde meu motorista está?"). */}
      {motoristas.map((m) => {
        const velha = m.minutosAtras >= MINUTOS_POSICAO_VELHA;
        const cor = corVar(velha ? "--color-gray-500" : "--color-brand");
        return (
          <CircleMarker
            key={`mot-${m.id}`}
            center={[m.lat, m.lng]}
            radius={11}
            pathOptions={{
              color: cor,
              fillColor: cor,
              // Posição velha fica oca/apagada — sinaliza "não é ao vivo" sem
              // precisar abrir o popup pra descobrir.
              fillOpacity: velha ? 0.2 : 0.9,
              weight: 3,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{m.nome}</p>
                <p className={velha ? "text-danger" : "text-muted"}>
                  Visto {textoVistoHa(m.minutosAtras)}
                  {velha ? " · pode estar sem sinal" : ""}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
