"use client";

// Faixa de clientes (empresas embarcadoras) no dashboard. Clicar num card abre
// a lista das NFs daquele cliente AGRUPADAS POR CIDADE (número da NF, cliente
// final e cidade) — pedido do cliente para priorizar a roteirização.
import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import type { EmpresaPainel } from "@/lib/data/gerencia";

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// Cor determinística pela razão social — dá identidade sem precisar de logo.
function hue(nome: string) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % 360;
  return h;
}

export function EmpresasPainel({ empresas }: { empresas: EmpresaPainel[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  if (empresas.length === 0) return null;
  const sel = empresas.find((e) => e.id === aberta) ?? null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted">
        Clientes de hoje ({empresas.length})
      </h2>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {empresas.map((e) => {
          const active = e.id === aberta;
          return (
            <button
              key={e.id}
              onClick={() => setAberta(active ? null : e.id)}
              aria-pressed={active}
              className={`flex min-w-[200px] items-center gap-3 rounded-xl border p-3 text-left transition ${
                active
                  ? "border-brand bg-brand-50"
                  : "border-line bg-surface hover:bg-canvas"
              }`}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: `hsl(${hue(e.nome)} 52% 45%)` }}
              >
                {iniciais(e.nome)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">
                  {e.nome}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  {e.total} NF{e.total !== 1 ? "s" : ""}
                  {e.aguardando > 0 && (
                    <span className="rounded-full bg-warning-50 px-1.5 py-0.5 font-medium text-warning">
                      {e.aguardando} aguardando
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {sel && (
        <Card className="divide-y divide-line">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="font-semibold text-ink">{sel.nome}</span>
            <span className="text-xs text-muted">
              {sel.total} NF(s) · {sel.aguardando} aguardando bipagem
            </span>
          </div>
          {sel.cidades.map((c) => (
            <div key={c.cidade}>
              <div className="flex items-center gap-2 bg-canvas px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <span aria-hidden>📍</span> {c.cidade}
                <span className="font-normal normal-case opacity-70">
                  ({c.notas.length})
                </span>
              </div>
              {c.notas.map((n, idx) => (
                <div
                  key={`${n.numero_nf}-${idx}`}
                  className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-ink">
                      NF {n.numero_nf}
                    </span>
                    <span className="text-muted"> · {n.destinatario_nome}</span>
                  </div>
                  <StatusBadge status={n.status} />
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
