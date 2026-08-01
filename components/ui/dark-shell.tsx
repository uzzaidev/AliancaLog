// Faixa escura reutilizável (topbar da gerência, header do motorista, hero do
// cliente): fundo bg-dark com um filete bg-brand embaixo. Server-safe.
import { type ReactNode } from "react";

export function DarkBar({
  children,
  className = "",
  accent = true,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`bg-dark text-white ${
        accent ? "border-b-[3px] border-brand" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Ponto verde "Ao vivo" pulsante (indicador de Realtime).
export function LiveDot({ label = "Ao vivo" }: { label?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-success-bright">
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-success-bright" />
      {label}
    </span>
  );
}
