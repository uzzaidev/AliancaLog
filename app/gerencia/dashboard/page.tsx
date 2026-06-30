import { Filtros } from "@/components/gerencia/filtros";
import { NotasList } from "@/components/gerencia/notas-list";
import { RealtimeRefresher } from "@/components/gerencia/realtime-refresher";
import { StatCards } from "@/components/gerencia/stat-cards";
import {
  getNotasDoDia,
  getResumoHoje,
  listEmpresas,
  listMotoristas,
} from "@/lib/data/gerencia";

export default async function GerenciaDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    motorista?: string;
    empresa?: string;
  }>;
}) {
  const sp = await searchParams;
  const [resumo, notas, empresas, motoristas] = await Promise.all([
    getResumoHoje(),
    getNotasDoDia(sp),
    listEmpresas(),
    listMotoristas(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-sm text-muted">Entregas de hoje em tempo real.</p>
        </div>
        <RealtimeRefresher />
      </div>

      <StatCards resumo={resumo} />
      <Filtros empresas={empresas} motoristas={motoristas} />
      <NotasList notas={notas} />
    </div>
  );
}
