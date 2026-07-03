"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { ComprovanteModal } from "@/components/comprovante-modal";
import { getComprovanteCliente } from "@/app/cliente/notas/actions";
import type { NotaCliente } from "@/lib/data/cliente";

function dataCurta(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export function NotasListCliente({ notas }: { notas: NotaCliente[] }) {
  const [aberta, setAberta] = useState<string | null>(null);

  if (notas.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Nenhuma NF encontrada para o filtro atual.
      </Card>
    );
  }

  return (
    <>
      <Card className="divide-y divide-line">
        {notas.map((nf) => (
          <button
            key={nf.id}
            onClick={() => setAberta(nf.id)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-canvas"
          >
            <div className="min-w-0">
              <div className="font-semibold text-ink">NF {nf.numero_nf}</div>
              <div className="truncate text-sm text-muted">
                {nf.destinatario_nome}
                {nf.cidade ? ` — ${nf.cidade}` : ""}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <StatusBadge status={nf.status} />
              <span className="text-xs text-muted">
                {dataCurta(nf.data_entrega)}
              </span>
            </div>
          </button>
        ))}
      </Card>

      <ComprovanteModal
        nfId={aberta}
        onClose={() => setAberta(null)}
        fetcher={getComprovanteCliente}
      />
    </>
  );
}
