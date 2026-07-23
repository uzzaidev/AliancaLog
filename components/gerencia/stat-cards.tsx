// Faixa de KPIs do dia no topo do dashboard (padrão Track-POD).
import {
  IconPackages,
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconTruck,
  IconClock,
} from "@tabler/icons-react";
import { Kpi, type KpiTone } from "@/components/ui/kpi";
import type { ResumoDia } from "@/lib/data/gerencia";

const ITEMS: {
  key: keyof ResumoDia;
  label: string;
  icon: typeof IconPackages;
  tone: KpiTone;
}[] = [
  { key: "total", label: "Total hoje", icon: IconPackages, tone: "neutral" },
  { key: "aceita", label: "Aceitas", icon: IconCircleCheck, tone: "success" },
  { key: "recusada", label: "Recusadas", icon: IconCircleX, tone: "danger" },
  {
    key: "ocorrencia",
    label: "Ocorrências",
    icon: IconAlertTriangle,
    tone: "warning",
  },
  { key: "em_rota", label: "Em rota", icon: IconTruck, tone: "info" },
  { key: "pendente", label: "Em aberto", icon: IconClock, tone: "brand" },
];

export function StatCards({ resumo }: { resumo: ResumoDia }) {
  return (
    <div className="flex divide-x divide-line overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      {ITEMS.map((it) => (
        <div key={it.key} className="min-w-[136px] flex-1">
          <Kpi
            icon={it.icon}
            value={resumo[it.key]}
            label={it.label}
            tone={it.tone}
          />
        </div>
      ))}
    </div>
  );
}
