import { EmpresasPainel } from "@/components/gerencia/empresas-painel";
import { Filtros } from "@/components/gerencia/filtros";
import { MapaEntregas } from "@/components/gerencia/mapa-entregas";
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
import {
  contarDestinosPendentesDeGeocode,
  getDestinosGeocodificados,
  getEntreguesComGps,
} from "@/lib/data/mapa";

export default async function GerenciaDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    motorista?: string;
    empresa?: string;
    periodo?: "hoje" | "semana" | "mes" | "todos";
  }>;
}) {
  const sp = await searchParams;
  const [resumo, notas, empresas, motoristas, painelClientes, destinos, entregues, pendentesDeGeocode] =
    await Promise.all([
      getResumoHoje(),
      getNotasDoDia(sp),
      listEmpresas(),
      listMotoristas(),
      getPainelClientes(),
      getDestinosGeocodificados(),
      getEntreguesComGps(),
      contarDestinosPendentesDeGeocode(),
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

      <MapaEntregas
        destinos={destinos}
        entregues={entregues}
        pendentesDeGeocode={pendentesDeGeocode}
      />

      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <NotasList notas={notas} motoristas={motoristas.filter((m) => m.ativo)} />
        </div>
        <SidePanel notas={notas} clientes={painelClientes} />
      </div>
    </div>
  );
}
