import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { HistoricoView } from "@/components/motorista/historico-view";
import { getHistoricoRomaneios } from "@/lib/data/motorista";

export default async function HistoricoPage() {
  const romaneios = await getHistoricoRomaneios();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight text-dark">Histórico</h1>
        <Link
          href="/motorista/entregas"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-brand"
        >
          <IconChevronLeft size={16} /> Hoje
        </Link>
      </div>
      <HistoricoView romaneios={romaneios} />
    </div>
  );
}
