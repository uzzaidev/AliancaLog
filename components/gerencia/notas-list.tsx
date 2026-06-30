// Lista de NFs do dia (apresentacional).
import { Card, StatusBadge } from "@/components/ui";
import type { NotaRow } from "@/lib/data/gerencia";

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotasList({ notas }: { notas: NotaRow[] }) {
  if (notas.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted">
        Nenhuma NF encontrada para o filtro atual.
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-line">
      {notas.map((nf) => (
        <div
          key={nf.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">NF {nf.numero_nf}</span>
              {nf.empresa_nome && (
                <span className="text-sm text-muted">· {nf.empresa_nome}</span>
              )}
              {nf.motorista_nome && (
                <span className="text-sm text-muted">
                  · {nf.motorista_nome}
                </span>
              )}
            </div>
            <div className="truncate text-sm text-muted">
              {nf.destinatario_nome} — {nf.destinatario_endereco}
              {nf.cidade ? `, ${nf.cidade}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={nf.status} />
            <span className="w-12 text-right text-xs text-muted">
              {hora(nf.updated_at)}
            </span>
          </div>
        </div>
      ))}
    </Card>
  );
}
