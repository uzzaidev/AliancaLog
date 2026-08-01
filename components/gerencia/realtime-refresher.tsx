"use client";

// Escuta mudanças no Supabase Realtime e atualiza os dados do servidor.
// Quando um motorista registra um canhoto, o dashboard reflete em < 3s sem refresh manual.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresher({
  channel: channelName = "gerencia-dashboard",
  dark = false,
}: {
  channel?: string;
  dark?: boolean;
}) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Debounce: várias mudanças em sequência => um único refresh.
    const refreshSoon = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };

    // Nome único por montagem: em dev (React Strict Mode) o efeito monta →
    // desmonta → monta, e o Supabase reaproveita canais pelo mesmo nome, o que
    // dispara "cannot add postgres_changes callbacks after subscribe()". Um
    // sufixo aleatório garante um canal novo a cada montagem.
    const topic = `${channelName}-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notas_fiscais" },
        refreshSoon,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "canhotos" },
        refreshSoon,
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router, channelName]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        dark ? "text-success-bright" : "text-muted"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          live
            ? `${dark ? "bg-success-bright" : "bg-success"} pulse-dot`
            : dark
              ? "bg-gray-500"
              : "bg-line"
        }`}
      />
      {live ? "Ao vivo" : "Conectando…"}
    </span>
  );
}
