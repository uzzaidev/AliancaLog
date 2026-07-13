"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Input, StatusBadge } from "@/components/ui";
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
  const pct = notas.length ? Math.round((concluidas / notas.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">
            {concluidas} de {notas.length} concluídas
          </span>
          <span className="text-muted">{pct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </Card>

      <Input
        placeholder="🔍 Buscar NF ou destinatário…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <Card className="divide-y divide-line">
        {filtradas.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Nenhuma NF encontrada.
          </p>
        )}
        {filtradas.map((n) => {
          const feito = FINAIS.includes(n.status);
          return (
            <Link
              key={n.id}
              href={`/motorista/canhoto/${n.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 active:bg-canvas"
            >
              <div className="min-w-0">
                <div className="font-semibold text-ink">NF {n.numero_nf}</div>
                <div className="truncate text-sm text-muted">
                  {n.destinatario_nome} — {n.destinatario_endereco}
                  {n.cidade ? `, ${n.cidade}` : ""}
                </div>
              </div>
              <div className="shrink-0">
                {feito ? (
                  <StatusBadge status={n.status} />
                ) : (
                  <span className="text-brand">›</span>
                )}
              </div>
            </Link>
          );
        })}
      </Card>
    </div>
  );
}
