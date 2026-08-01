// Hero do portal do cliente (Spoke Connect). Mobile: empilhado. Web: 2 colunas
// (data + título à esquerda; progresso + pills à direita). Server-safe.
import { type ReactNode } from "react";
import {
  IconPackages,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconClock,
} from "@tabler/icons-react";

export type ClienteResumo = {
  total: number;
  entregue: number;
  recusada: number;
  ocorrencia: number;
  pendente: number;
  finalizadas: number;
};

function Pill({
  icon,
  children,
  cls,
}: {
  icon: ReactNode;
  children: ReactNode;
  cls: string;
}) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${cls}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function ClienteHero({
  titulo,
  data,
  resumo,
  live,
}: {
  titulo: string;
  data: string;
  resumo: ClienteResumo;
  live?: ReactNode;
}) {
  const pct =
    resumo.total > 0
      ? Math.round((resumo.finalizadas / resumo.total) * 100)
      : 0;

  return (
    <div className="rounded-xl bg-dark p-5 lg:p-7">
      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:items-center lg:gap-12">
        {/* Coluna esquerda: data + título */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 lg:justify-start lg:gap-4">
            <span className="text-[11px] uppercase tracking-wider text-gray-500">
              {data}
            </span>
            <span className="lg:hidden">{live}</span>
          </div>
          <h1 className="text-2xl font-bold text-white lg:text-4xl">
            {titulo}
          </h1>
        </div>

        {/* Coluna direita: live (desktop) + progresso + pills */}
        <div className="mt-5 lg:mt-0">
          <div className="mb-2 hidden justify-end lg:flex">{live}</div>

          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-dark-3">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mb-3.5 flex justify-between text-[11px] text-gray-500">
            <span>
              {resumo.finalizadas} de {resumo.total} finalizadas
            </span>
            <span className="font-semibold text-brand">{pct}%</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Pill icon={<IconPackages size={12} />} cls="bg-white/10 text-white">
              {resumo.total} total
            </Pill>
            <Pill
              icon={<IconCheck size={12} />}
              cls="bg-success-bright/20 text-success-border"
            >
              {resumo.entregue} entregue
            </Pill>
            <Pill
              icon={<IconX size={12} />}
              cls="bg-danger-bright/20 text-danger-border"
            >
              {resumo.recusada} recusada
            </Pill>
            <Pill
              icon={<IconAlertTriangle size={12} />}
              cls="bg-brand/20 text-warning-border"
            >
              {resumo.ocorrencia} ocorrência
            </Pill>
            <Pill
              icon={<IconClock size={12} />}
              cls="bg-white/[0.05] text-gray-400"
            >
              {resumo.pendente} pendentes
            </Pill>
          </div>
        </div>
      </div>
    </div>
  );
}
