// Header escuro do app do motorista (mobile-first): logo + identidade + stats
// do dia (Total / Feitas / Pendentes). Server-safe.
import { Logo } from "@/components/brand/logo";
import { LogoutButton } from "@/components/logout-button";

function Stat({
  val,
  lab,
  orange = false,
}: {
  val: number;
  lab: string;
  orange?: boolean;
}) {
  return (
    <div className="rounded-md bg-white/10 px-2.5 py-2 text-center">
      <div
        className={`text-xl font-bold tabular-nums ${
          orange ? "text-[#f37312]" : "text-white"
        }`}
      >
        {val}
      </div>
      <div className="mt-0.5 text-[10px] text-gray-500">{lab}</div>
    </div>
  );
}

export function MotoristaHeader({
  nome,
  empresa,
  stats,
}: {
  nome: string;
  empresa?: string | null;
  stats: { total: number; feitas: number; pendentes: number };
}) {
  return (
    <div className="bg-[#1e1e1e] px-4 pb-4 pt-3">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <Logo variant="light" size={22} />
        <div className="flex items-center gap-1.5">
          <span className="truncate text-right text-xs text-gray-400">
            {nome}
            {empresa ? ` · ${empresa}` : ""}
          </span>
          <LogoutButton className="!min-h-0 px-2 py-1 text-xs text-gray-300 hover:bg-[#2d2d2d] hover:text-white" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat val={stats.total} lab="Total" />
        <Stat val={stats.feitas} lab="Feitas" orange />
        <Stat val={stats.pendentes} lab="Pendentes" />
      </div>
    </div>
  );
}
