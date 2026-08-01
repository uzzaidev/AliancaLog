// Lista de romaneios passados do motorista (read-only) — migration 0015 libera
// a RLS de notas_fiscais para além do dia de hoje, o que esta tela depende.
import Link from "next/link";
import { IconChevronRight, IconRoute } from "@tabler/icons-react";
import { Badge, Card } from "@/components/ui";
import type { RomaneioHistorico } from "@/lib/data/motorista";

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function HistoricoView({ romaneios }: { romaneios: RomaneioHistorico[] }) {
  if (romaneios.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted">
        <IconRoute size={28} className="text-gray-300" />
        Nenhum romaneio anterior encontrado.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {romaneios.map((r) => (
        <Link key={r.id} href={`/motorista/romaneio/${r.id}`} className="block">
          <Card className="flex items-center justify-between gap-3 p-4 transition active:bg-canvas">
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-gray-400">
                {formatarData(r.data)}
              </div>
              <div className="font-semibold text-dark">
                {r.concluidas}/{r.total} entregues
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={r.status === "fechado" ? "success" : "neutral"}>
                {r.status === "fechado" ? "Fechado" : "Ativo"}
              </Badge>
              <IconChevronRight size={20} className="text-gray-400" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
