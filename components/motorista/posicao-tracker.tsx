"use client";

// Rastreamento ao vivo (A-006): liga/desliga via a prop `ativo` — o layout do
// motorista recalcula isso a cada navegação a partir de getRomaneiosDoDia
// (romaneio ativo E confirmado). Guarda só a última posição (sem trilha),
// decisão do PO — cada leitura sobrescreve a linha anterior via upsert.
//
// Posição é descartável: diferente da fila de canhotos (que não pode perder
// dado), aqui o que importa é "onde ele está agora" — sem rede, simplesmente
// não envia e tenta de novo na próxima leitura do watchPosition, sem fila no
// IndexedDB.
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Throttle: no máximo 1 envio a cada 30s, OU antes disso se andou 50m+ — o que
// vier primeiro. Evita estourar bateria/dados parado no trânsito ou no cliente.
const THROTTLE_MS = 30_000;
const THROTTLE_METROS = 50;

function distanciaMetros(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function PosicaoTracker({
  motoristaId,
  ativo,
}: {
  motoristaId: string;
  ativo: boolean;
}) {
  const ultima = useRef<{ lat: number; lng: number; quando: number } | null>(null);

  useEffect(() => {
    if (!ativo || !("geolocation" in navigator)) return;
    const supabase = createClient();
    ultima.current = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const agora = Date.now();
        const atual = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const anterior = ultima.current;
        const passouTempo = !anterior || agora - anterior.quando >= THROTTLE_MS;
        const passouDistancia =
          !anterior || distanciaMetros(anterior, atual) >= THROTTLE_METROS;
        if (!passouTempo && !passouDistancia) return;

        ultima.current = { ...atual, quando: agora };
        // atualizado_em não é enviado — um trigger no banco sempre grava a
        // hora do servidor (migration 0017), imune a relógio de device errado.
        supabase
          .from("motorista_posicao")
          .upsert(
            { motorista_id: motoristaId, lat: atual.lat, lng: atual.lng },
            { onConflict: "motorista_id" },
          )
          .then(() => {});
      },
      () => {
        // GPS negado/indisponível — segue sem rastrear, nunca bloqueia o app.
      },
      { enableHighAccuracy: true, maximumAge: 15_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [ativo, motoristaId]);

  return null;
}
