import { Suspense } from "react";
import { RealtimeRefresher } from "@/components/gerencia/realtime-refresher";
import { Filtros } from "@/components/cliente/filtros";
import { NotasListCliente } from "@/components/cliente/notas-list";
import { getNotasCliente } from "@/lib/data/cliente";
import type { ClienteFiltro } from "@/lib/data/cliente";

export default async function ClienteNotas({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; periodo?: string; busca?: string }>;
}) {
  const sp = await searchParams;

  const filtro: ClienteFiltro = {
    status: sp.status,
    periodo: (sp.periodo as ClienteFiltro["periodo"]) ?? "hoje",
    busca: sp.busca,
  };

  const notas = await getNotasCliente(filtro);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Minhas entregas
          </h1>
          <p className="text-sm text-muted">
            Status e comprovantes das suas notas fiscais.
          </p>
        </div>
        <RealtimeRefresher channel="cliente-notas" />
      </div>

      <Suspense>
        <Filtros />
      </Suspense>

      <NotasListCliente notas={notas} />
    </div>
  );
}
