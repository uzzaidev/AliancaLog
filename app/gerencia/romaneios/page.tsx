import Link from "next/link";
import { Badge, Button, Card } from "@/components/ui";
import { listRomaneios } from "@/lib/data/romaneios";
import type { RomaneioStatus } from "@/lib/types";

const STATUS: Record<
  RomaneioStatus,
  { label: string; tone: "neutral" | "info" | "success" }
> = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  ativo: { label: "Ativo", tone: "info" },
  fechado: { label: "Fechado", tone: "success" },
};

export default async function RomaneiosPage() {
  const romaneios = await listRomaneios();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Romaneios</h1>
        <Link href="/gerencia/romaneios/novo">
          <Button>Novo romaneio</Button>
        </Link>
      </div>

      <Card className="divide-y divide-line">
        {romaneios.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Nenhum romaneio ainda. Crie um por câmera ou importando um Excel com
            motorista.
          </p>
        )}
        {romaneios.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <div>
              <div className="font-medium text-ink">
                {r.motorista_nome ?? "Sem motorista"} · {r.total_nfs} NF(s)
              </div>
              <div className="text-muted">
                {new Date(r.data + "T00:00:00").toLocaleDateString("pt-BR")}
              </div>
            </div>
            <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
