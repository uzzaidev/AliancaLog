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
  getPosicoesMotoristas,
} from "@/lib/data/mapa";

export default async function GerenciaDashboard({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    motorista?: string;
    empresa?: string;
    periodo?: "hoje" | "semana" | "mes" | "todos";
    emissao?: string;
  }>;
}) {
  const sp = await searchParams;
  const [
    resumo,
    notas,
    empresas,
    motoristas,
    painelClientes,
    destinos,
    entregues,
    pendentesDeGeocode,
    posicoesMotoristas,
  ] = await Promise.all([
    getResumoHoje(),
    getNotasDoDia(sp),
    listEmpresas(),
    listMotoristas(),
    getPainelClientes(),
    getDestinosGeocodificados(),
    getEntreguesComGps(),
    contarDestinosPendentesDeGeocode(),
    getPosicoesMotoristas(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-dark">
          <span className="sm:hidden">Painel de entregas</span>
          <span className="hidden sm:inline">Plan &amp; Track</span>
        </h1>
        <p className="text-sm text-muted">Entregas de hoje em tempo real.</p>
      </div>

      <StatCards resumo={resumo} />

      <div className="flex flex-col gap-5">
        <div className="order-3 sm:order-1">
          <EmpresasPainel
            empresas={painelClientes}
            motoristas={motoristas.filter((m) => m.ativo)}
          />
        </div>
        <div className="order-1 sm:order-2">
          <Filtros empresas={empresas} motoristas={motoristas} />
        </div>
        <div className="order-4 sm:order-3">
          <MapaEntregas
            destinos={destinos}
            entregues={entregues}
            pendentesDeGeocode={pendentesDeGeocode}
            motoristas={posicoesMotoristas}
          />
        </div>
        <div className="order-2 flex min-w-0 flex-col gap-5 sm:order-4 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-3">
            <NotasList notas={notas} motoristas={motoristas.filter((m) => m.ativo)} />
          </div>
          <div className="hidden sm:block">
            <SidePanel notas={notas} clientes={painelClientes} />
          </div>
        </div>
      </div>
    </div>
  );
}
