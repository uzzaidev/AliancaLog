"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconSearch,
  IconMapPin,
  IconCamera,
  IconChevronRight,
} from "@tabler/icons-react";
import { Card, StatusBadge } from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import type { NotaMotorista } from "@/lib/types";

const FINAIS = ["aceita", "recusada", "ocorrencia"];

export function RomaneioView({ notas }: { notas: NotaMotorista[] }) {
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return notas;
    return notas.filter(
      (n) =>
        n.numero_nf.toLowerCase().includes(t) ||
        n.destinatario_nome.toLowerCase().includes(t),
    );
  }, [q, notas]);

  const concluidas = notas.filter((n) => FINAIS.includes(n.status)).length;
  // Primeira NF pendente (na ordem) = a "próxima entrega" (card ativo).
  const proximaId = notas.find((n) => !FINAIS.includes(n.status))?.id ?? null;

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <Progress done={concluidas} total={notas.length} />
      </Card>

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
        const feito = FINAIS.includes(n.status);
        const ativo = n.id === proximaId;
        return (
          <Link
            key={n.id}
            href={`/motorista/canhoto/${n.id}`}
            className={`block rounded-xl border bg-surface shadow-sm transition active:bg-canvas ${
              ativo ? "border-2 border-brand" : "border-line"
            }`}
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
                {feito ? (
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
        );
      })}
    </div>
  );
}
