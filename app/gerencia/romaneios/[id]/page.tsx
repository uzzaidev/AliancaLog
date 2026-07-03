import { notFound } from "next/navigation";
import { Badge, Card, StatusBadge } from "@/components/ui";
import { FecharRomaneioButton } from "@/components/gerencia/fechar-romaneio-button";
import { contarPendentes, getRomaneio } from "@/lib/data/romaneios";
import type { RomaneioStatus } from "@/lib/types";

const STATUS: Record<
  RomaneioStatus,
  { label: string; tone: "neutral" | "info" | "success" }
> = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  ativo: { label: "Ativo", tone: "info" },
  fechado: { label: "Fechado", tone: "success" },
};

export default async function RomaneioDetalhe({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const romaneio = await getRomaneio(id);
  if (!romaneio) notFound();

  const total = romaneio.notas.length;
  const pendentes = contarPendentes(romaneio.notas);
  const concluidas = total - pendentes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {romaneio.motorista_nome ?? "Sem motorista"}
          </h1>
          <p className="text-sm text-muted">
            {new Date(romaneio.data + "T00:00:00").toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Badge tone={STATUS[romaneio.status].tone}>
          {STATUS[romaneio.status].label}
        </Badge>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {concluidas} de {total} NFs resolvidas
          </span>
          {pendentes > 0 && (
            <span className="text-warning">{pendentes} pendente(s)</span>
          )}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${total ? (concluidas / total) * 100 : 0}%` }}
          />
        </div>
      </Card>

      <Card className="divide-y divide-line">
        {romaneio.notas.map((n) => (
          <div
            key={n.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium text-ink">NF {n.numero_nf}</span>{" "}
              <span className="text-muted">
                · {n.destinatario_nome}
                {n.empresa_nome ? ` · ${n.empresa_nome}` : ""}
              </span>
            </div>
            <StatusBadge status={n.status} />
          </div>
        ))}
      </Card>

      {romaneio.status !== "fechado" && (
        <FecharRomaneioButton
          romaneioId={romaneio.id}
          disabled={pendentes > 0 || total === 0}
        />
      )}
    </div>
  );
}
