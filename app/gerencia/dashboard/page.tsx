import { EmpresasPainel } from "@/components/gerencia/empresas-painel";
import { Filtros } from "@/components/gerencia/filtros";
import { NotasList } from "@/components/gerencia/notas-list";
import { SidePanel } from "@/components/gerencia/side-panel";
import { StatCards } from "@/components/gerencia/stat-cards";
import {
  getNotasDoDia,
  getPainelClientes,
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
  const [resumo, notas, empresas, motoristas, painelClientes] =
    await Promise.all([
      getResumoHoje(),
      getNotasDoDia(sp),
      listEmpresas(),
      listMotoristas(),
      getPainelClientes(),
    ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-dark">
          Plan &amp; Track
        </h1>
        <p className="text-sm text-muted">Entregas de hoje em tempo real.</p>
      </div>

      <StatCards resumo={resumo} />

      <EmpresasPainel
        empresas={painelClientes}
        motoristas={motoristas.filter((m) => m.ativo)}
      />

      <Filtros empresas={empresas} motoristas={motoristas} />

      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <NotasList notas={notas} />
        </div>
        <SidePanel notas={notas} clientes={painelClientes} />
      </div>
    </div>
  );
}
