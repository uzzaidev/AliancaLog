// Card de KPI: ícone colorido (38px) + número grande + label.
// Usado na faixa de KPIs da gerência. Server-safe (recebe o ícone Tabler já
// resolvido como componente).
import { type ElementType } from "react";

export type KpiTone =
  | "neutral"
  | "brand"
  | "success"
  | "danger"
  | "warning"
  | "info";

const TONES: Record<KpiTone, { box: string; icon: string; val: string }> = {
  neutral: { box: "bg-gray-100", icon: "text-dark", val: "text-ink" },
  brand: { box: "bg-brand-50", icon: "text-brand", val: "text-brand" },
  success: { box: "bg-success-50", icon: "text-success", val: "text-success" },
  danger: { box: "bg-danger-50", icon: "text-danger", val: "text-danger" },
  warning: { box: "bg-warning-50", icon: "text-warning", val: "text-warning" },
  info: { box: "bg-info-50", icon: "text-info", val: "text-info" },
};

export function Kpi({
  icon: Icon,
  value,
  label,
  tone = "neutral",
}: {
  icon: ElementType;
  value: number | string;
  label: string;
  tone?: KpiTone;
}) {
  const t = TONES[tone];
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${t.box}`}
      >
        <Icon size={20} className={t.icon} stroke={2} />
      </span>
      <span className="min-w-0">
        <span
          className={`block text-2xl font-bold leading-none tabular-nums ${t.val}`}
        >
          {value}
        </span>
        <span className="mt-1 block truncate text-xs text-muted">{label}</span>
      </span>
    </div>
  );
}
