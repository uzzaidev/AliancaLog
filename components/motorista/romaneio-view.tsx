"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconSearch,
  IconMapPin,
  IconCamera,
  IconChevronRight,
  IconNavigation,
} from "@tabler/icons-react";
import { Badge, Card, StatusBadge } from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import { MapaRomaneio } from "./mapa-romaneio";
import { enderecoMapsUrl } from "@/lib/maps";
import { NF_STATUS_FINAIS, type NotaMotorista } from "@/lib/types";
import {
  obterNotasRomaneioCache,
  salvarNotasRomaneioCache,
} from "@/lib/offline/cache";
import { EVENTO_FILA } from "@/lib/offline/sync";
import { listarPendentes, type CanhotoPendente } from "@/lib/offline/queue";

export function RomaneioView({
  notas: initialNotas,
  romaneioId,
}: {
  notas: NotaMotorista[];
  romaneioId?: string;
}) {
  const [notas, setNotas] = useState<NotaMotorista[]>(initialNotas);
  const [naFila, setNaFila] = useState<Map<string, CanhotoPendente>>(new Map());
  const [q, setQ] = useState("");

  useEffect(() => {
    let ativo = true;

    async function sincronizar() {
      const fila = await listarPendentes();
      if (ativo) setNaFila(new Map(fila.map((item) => [item.nf_id, item])));
      if (initialNotas && initialNotas.length > 0) {
        if (romaneioId) {
          await salvarNotasRomaneioCache(romaneioId, initialNotas);
        }
        if (ativo) setNotas(initialNotas);
      } else if (romaneioId) {
        const doCache = await obterNotasRomaneioCache(romaneioId);
        if (ativo && doCache && doCache.length > 0) {
          setNotas(doCache);
        }
      }
    }

    sincronizar();

    async function recarregarCache() {
      const fila = await listarPendentes();
      if (ativo) setNaFila(new Map(fila.map((item) => [item.nf_id, item])));
      if (romaneioId) {
        const doCache = await obterNotasRomaneioCache(romaneioId);
        if (ativo && doCache) {
          setNotas(doCache);
        }
      }
    }

    window.addEventListener(EVENTO_FILA, recarregarCache);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_FILA, recarregarCache);
    };
  }, [initialNotas, romaneioId]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return notas;
    return notas.filter(
      (n) =>
        n.numero_nf.toLowerCase().includes(t) ||
        n.destinatario_nome.toLowerCase().includes(t),
    );
  }, [q, notas]);

  const concluidas = notas.filter((n) => NF_STATUS_FINAIS.includes(n.status)).length;
  // Primeira NF pendente (na ordem) = a "próxima entrega" (card ativo).
  const proximaId =
    notas.find((n) => !NF_STATUS_FINAIS.includes(n.status) && !naFila.has(n.id))?.id ?? null;

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <Progress done={concluidas} total={notas.length} />
      </Card>

      <MapaRomaneio notas={notas} />

      <div className="relative">
        <IconSearch
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          placeholder="Buscar NF ou destinatário…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface py-3 pl-9 pr-3 text-ink outline-none focus:border-brand"
        />
      </div>

      {filtradas.length === 0 && (
        <Card className="px-4 py-6 text-center text-sm text-muted">
          Nenhuma NF encontrada.
        </Card>
      )}

      {filtradas.map((n) => {
        const feito = NF_STATUS_FINAIS.includes(n.status);
        const pendenteSync = naFila.get(n.id);
        const ativo = n.id === proximaId;
        return (
          <div
            key={n.id}
            className={`overflow-hidden rounded-xl border bg-surface shadow-sm ${
              ativo ? "border-2 border-brand" : "border-line"
            }`}
          >
            <Link
              href={pendenteSync ? "#" : `/motorista/canhoto/${n.id}`}
              onClick={(event) => {
                if (pendenteSync) event.preventDefault();
              }}
              aria-disabled={!!pendenteSync}
              className={`block transition ${pendenteSync ? "cursor-not-allowed opacity-75" : "active:bg-canvas"}`}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-gray-400">
                    NF {n.numero_nf}
                  </div>
                  <div className="font-semibold text-dark">
                    {n.destinatario_nome}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <IconMapPin
                      size={13}
                      className={ativo ? "text-brand" : "text-gray-400"}
                    />
                    <span className="truncate">
                      {n.destinatario_endereco}
                      {n.cidade ? `, ${n.cidade}` : ""}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 self-center">
                  {pendenteSync ? (
                    <Badge tone={pendenteSync.bloqueado_por_validacao ? "danger" : "info"}>
                      {pendenteSync.bloqueado_por_validacao ? "Erro no envio" : "Aguardando envio"}
                    </Badge>
                  ) : feito ? (
                    <StatusBadge status={n.status} />
                  ) : (
                    <IconChevronRight size={20} className="text-brand" />
                  )}
                </div>
              </div>

              {ativo && (
                <div className="border-t border-brand-100 px-4 py-2.5">
                  <span className="flex touch-target items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white">
                    <IconCamera size={18} /> Registrar canhoto
                  </span>
                </div>
              )}
            </Link>

            {!feito && (
              <a
                href={enderecoMapsUrl(n)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex touch-target items-center justify-center gap-2 border-t border-line text-sm font-medium text-brand active:bg-canvas"
              >
                <IconNavigation size={16} /> Abrir no Maps
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
