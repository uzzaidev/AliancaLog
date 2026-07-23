// Hero escuro do portal do cliente (Spoke Connect): data + total + barra de
// progresso laranja + pills de resumo. Server-safe.
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
    <div className="rounded-xl bg-[#1e1e1e] p-5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-gray-500">
          {data}
        </span>
        {live}
      </div>
      <h1 className="mb-3.5 text-2xl font-bold text-white">{titulo}</h1>

      <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#3d3d3d]">
        <div
          className="h-full rounded-full bg-[#f37312] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mb-3.5 flex justify-between text-[11px] text-gray-500">
        <span>
          {resumo.finalizadas} de {resumo.total} finalizadas
        </span>
        <span className="font-semibold text-[#f37312]">{pct}%</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Pill
          icon={<IconPackages size={12} />}
          cls="bg-white/10 text-white"
        >
          {resumo.total} total
        </Pill>
        <Pill
          icon={<IconCheck size={12} />}
          cls="bg-[rgba(76,175,80,0.2)] text-[#A5D6A7]"
        >
          {resumo.entregue} entregue
        </Pill>
        <Pill
          icon={<IconX size={12} />}
          cls="bg-[rgba(244,67,54,0.2)] text-[#EF9A9A]"
        >
          {resumo.recusada} recusada
        </Pill>
        <Pill
          icon={<IconAlertTriangle size={12} />}
          cls="bg-[rgba(243,115,18,0.2)] text-[#FFCC80]"
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
  );
}
