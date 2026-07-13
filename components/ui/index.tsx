// Primitivos de UI compartilhados (server-safe). Mantidos pequenos e sem estado.
import { type ComponentProps, type ReactNode } from "react";
import {
  NOTA_STATUS_META,
  type NotaStatus,
} from "@/lib/types";

type Tone = "neutral" | "info" | "success" | "danger" | "warning";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-canvas text-muted ring-line",
  info: "bg-info-50 text-info ring-info/20",
  success: "bg-success-50 text-success ring-success/20",
  danger: "bg-danger-50 text-danger ring-danger/20",
  warning: "bg-warning-50 text-warning ring-warning/20",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: NotaStatus }) {
  const meta = NOTA_STATUS_META[status];
  return (
    <Badge tone={meta.tone}>
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
        aria-hidden
      />
      {meta.label}
    </Badge>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-brand text-white hover:bg-brand-700 disabled:opacity-60",
    secondary:
      "bg-surface text-ink ring-1 ring-inset ring-line hover:bg-canvas disabled:opacity-60",
    ghost: "text-muted hover:text-ink hover:bg-canvas",
    danger: "bg-danger text-white hover:opacity-90 disabled:opacity-60",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold touch-target transition-colors ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none ring-brand/30 focus:border-brand focus:ring-2"
      {...props}
    />
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}
