"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  IconWifiOff,
  IconWifi,
  IconRefresh,
  IconChevronRight,
  IconChevronLeft,
} from "@tabler/icons-react";
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/logout-button";
import { Badge, Button, Card } from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import { SyncBanner } from "@/components/motorista/sync-banner";
import { RomaneioView } from "@/components/motorista/romaneio-view";
import type { RomaneioMotorista } from "@/lib/data/motorista";
import { obterRomaneiosCache } from "@/lib/offline/cache";
import { EVENTO_FILA, flushFila } from "@/lib/offline/sync";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineView() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  const [romaneios, setRomaneios] = useState<RomaneioMotorista[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [romaneioAtivoId, setRomaneioAtivoId] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarCache() {
      const cached = await obterRomaneiosCache();
      if (ativo) {
        setRomaneios(cached ?? []);
        // Se houver apenas um romaneio ativo, seleciona automaticamente
        if (cached && cached.length === 1 && cached[0].status === "ativo") {
          setRomaneioAtivoId(cached[0].id);
        }
        setCarregando(false);
      }
    }

    carregarCache();

    window.addEventListener(EVENTO_FILA, carregarCache);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_FILA, carregarCache);
    };
  }, []);

  const total = romaneios?.reduce((s, r) => s + r.total, 0) ?? 0;
  const feitas = romaneios?.reduce((s, r) => s + r.concluidas, 0) ?? 0;
  const pendentes = total - feitas;

  const romaneioAtivo = romaneios?.find((r) => r.id === romaneioAtivoId) ?? null;

  return (
    <div className="min-h-full bg-canvas">
      {/* Header estático offline */}
      <div className="bg-dark px-4 pb-4 pt-3">
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Logo variant="light" size={22} />
            <Badge tone="warning">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning animate-pulse mr-1" />
              Offline
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <LogoutButton className="!min-h-0 px-2 py-1 text-xs text-gray-300 hover:bg-dark-2 hover:text-white" />
          </div>
        </div>

        {/* Stats de entregas do cache */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-white/10 px-2.5 py-2 text-center">
            <div className="text-xl font-bold tabular-nums text-white">{total}</div>
            <div className="mt-0.5 text-[10px] text-gray-500">Total</div>
          </div>
          <div className="rounded-md bg-white/10 px-2.5 py-2 text-center">
            <div className="text-xl font-bold tabular-nums text-brand">{feitas}</div>
            <div className="mt-0.5 text-[10px] text-gray-500">Feitas</div>
          </div>
          <div className="rounded-md bg-white/10 px-2.5 py-2 text-center">
            <div className="text-xl font-bold tabular-nums text-white">{pendentes}</div>
            <div className="mt-0.5 text-[10px] text-gray-500">Pendentes</div>
          </div>
        </div>
      </div>

      {/* Alerta quando a conexão retornar */}
      {isOnline && (
        <div className="bg-success text-white px-4 py-2.5 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <IconWifi size={18} />
            Conexão restabelecida!
          </div>
          <button
            type="button"
            onClick={async () => {
              await flushFila();
              window.location.href = "/motorista/entregas";
            }}
            className="rounded bg-white/20 px-2.5 py-1 text-xs font-bold hover:bg-white/30 transition-colors"
          >
            Voltar ao modo online
          </button>
        </div>
      )}

      {/* Banner de sincronização da fila offline */}
      <SyncBanner />

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        {carregando ? (
          <Card className="p-8 text-center text-sm text-muted">
            Carregando entregas salvas no aparelho...
          </Card>
        ) : romaneioAtivo ? (
          <div className="space-y-4">
            {romaneios && romaneios.length > 1 && (
              <button
                type="button"
                onClick={() => setRomaneioAtivoId(null)}
                className="inline-flex items-center gap-0.5 text-sm font-medium text-brand hover:underline"
              >
                <IconChevronLeft size={16} /> Ver todos os romaneios
              </button>
            )}
            <RomaneioView notas={[]} romaneioId={romaneioAtivo.id} />
          </div>
        ) : romaneios && romaneios.length > 0 ? (
          <div className="space-y-3">
            <h1 className="text-lg font-bold tracking-tight text-dark">
              Minhas entregas (Offline)
            </h1>

            {romaneios.map((r) => {
              const fechado = r.status === "fechado";
              return (
                <Card
                  key={r.id}
                  className={`space-y-3 p-4 ${
                    fechado
                      ? "border-2 border-success"
                      : r.confirmado_em
                        ? "border-2 border-brand"
                        : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-dark">{r.total} NFs</span>
                    <Badge
                      tone={fechado ? "success" : r.confirmado_em ? "info" : "neutral"}
                    >
                      {fechado
                        ? "Fechado"
                        : r.confirmado_em
                          ? "Em andamento"
                          : "Aguardando confirmação"}
                    </Badge>
                  </div>

                  <Progress done={r.concluidas} total={r.total} />

                  <Button
                    variant={fechado ? "secondary" : "primary"}
                    className="w-full"
                    onClick={() => setRomaneioAtivoId(r.id)}
                  >
                    {fechado ? "Ver entregas concluídas" : "Abrir entregas"}
                    <IconChevronRight size={18} />
                  </Button>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <IconWifiOff size={40} className="text-muted" />
            <div>
              <h2 className="text-base font-bold text-dark">Você está offline</h2>
              <p className="mt-1 text-sm text-muted leading-relaxed">
                Não há romaneios salvos neste aparelho. Conecte-se à internet ao menos uma vez para carregar suas entregas do dia.
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="mt-2 w-full"
            >
              <IconRefresh size={18} /> Tentar reconectar
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
