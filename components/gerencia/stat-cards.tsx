// Faixa de KPIs do dia no topo do dashboard (padrão Track-POD).
//
// Os rótulos marcam de propósito a diferença entre EVENTO e ESTADO (ver
// ResumoDia em lib/data/gerencia.ts): "Entregues hoje" conta o que o motorista
// registrou hoje — inclusive NF atrasada de outro dia entregue agora —, enquanto
// "Em rota" e "Em aberto" descrevem a situação neste momento. Sem o "hoje" no
// rótulo, os dois tipos de número pareceriam a mesma coisa.
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
  hint?: (r: ResumoDia) => string | undefined;
}[] = [
  { key: "total", label: "Total hoje", icon: IconPackages, tone: "neutral" },
  {
    key: "aceita",
    label: "Entregues hoje",
    icon: IconCircleCheck,
    tone: "success",
  },
  {
    key: "recusada",
    label: "Recusadas hoje",
    icon: IconCircleX,
    tone: "danger",
  },
  {
    key: "ocorrencia",
    label: "Ocorrências hoje",
    icon: IconAlertTriangle,
    tone: "warning",
  },
  { key: "em_rota", label: "Em rota", icon: IconTruck, tone: "info" },
  {
    // Mostra o passivo REAL (inclui atraso de dias anteriores) — é o número que
    // bate com a tabela logo abaixo. O quanto disso é atrasado vai no hint, que
    // é justamente o que a gerência precisa atacar.
    key: "pendenteTotal",
    label: "Em aberto",
    icon: IconClock,
    tone: "brand",
    hint: (r) => {
      const atrasadas = r.pendenteTotal - r.pendente;
      return atrasadas > 0 ? `${atrasadas} de dias anteriores` : undefined;
    },
  },
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
            hint={it.hint?.(resumo)}
          />
        </div>
      ))}
    </div>
  );
}
