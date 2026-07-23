// Pílula clicável/estática (status do motorista, filtros da toolbar, pills do hero).
// Tons alinhados aos status do domínio + neutro. Server-safe.
import { type ComponentProps, type ReactNode } from "react";

export type PillTone =
  | "neutral"
  | "brand"
  | "success"
  | "danger"
  | "warning"
  | "info";

const TONES: Record<PillTone, { base: string; active: string }> = {
  neutral: {
    base: "bg-gray-100 text-gray-700 border-gray-300",
    active: "bg-gray-800 text-white border-gray-800",
  },
  brand: {
    base: "bg-brand-50 text-brand border-brand",
    active: "bg-brand text-white border-brand",
  },
  success: {
    base: "bg-success-50 text-success border-success-border",
    active: "bg-success text-white border-success",
  },
  danger: {
    base: "bg-danger-50 text-danger border-danger-border",
    active: "bg-danger text-white border-danger",
  },
  warning: {
    base: "bg-warning-50 text-warning border-warning-border",
    active: "bg-warning text-white border-warning",
  },
  info: {
    base: "bg-info-50 text-info border-info-border",
    active: "bg-info text-white border-info",
  },
};

export function Pill({
  tone = "neutral",
  active = false,
  children,
  className = "",
  ...props
}: ComponentProps<"button"> & {
  tone?: PillTone;
  active?: boolean;
  children: ReactNode;
}) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
        active ? t.active : t.base
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
