import { Suspense } from "react";
import { RealtimeRefresher } from "@/components/gerencia/realtime-refresher";
import { Filtros } from "@/components/cliente/filtros";
import { ClienteHero, type ClienteResumo } from "@/components/cliente/hero";
import { NotasListCliente } from "@/components/cliente/notas-list";
import { getNotasCliente } from "@/lib/data/cliente";
import type { ClienteFiltro } from "@/lib/data/cliente";

const PERIODO_LABEL: Record<
  NonNullable<ClienteFiltro["periodo"]>,
  { data: string; sufixo: string }
> = {
  hoje: { data: "Hoje", sufixo: "hoje" },
  semana: { data: "Últimos 7 dias", sufixo: "na semana" },
  mes: { data: "Últimos 30 dias", sufixo: "no mês" },
  todos: { data: "Todo o período", sufixo: "no total" },
};

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

  const resumo: ClienteResumo = {
    total: notas.length,
    entregue: notas.filter((n) => n.status === "aceita").length,
    recusada: notas.filter((n) => n.status === "recusada").length,
    ocorrencia: notas.filter((n) => n.status === "ocorrencia").length,
    pendente: notas.filter(
      (n) => n.status === "pendente" || n.status === "em_rota",
    ).length,
    finalizadas: notas.filter((n) =>
      ["aceita", "recusada", "ocorrencia"].includes(n.status),
    ).length,
  };

  const p = PERIODO_LABEL[filtro.periodo ?? "hoje"];
  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <ClienteHero
        data={filtro.periodo === "hoje" ? dataHoje : p.data}
        titulo={`${resumo.total} ${resumo.total === 1 ? "entrega" : "entregas"} ${p.sufixo}`}
        resumo={resumo}
        live={<RealtimeRefresher channel="cliente-notas" dark />}
      />

      <Suspense>
        <Filtros />
      </Suspense>

      <NotasListCliente notas={notas} />
    </div>
  );
}
