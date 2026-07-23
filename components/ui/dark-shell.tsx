// Faixa escura reutilizável (topbar da gerência, header do motorista, hero do
// cliente): fundo #1E1E1E com um filete laranja embaixo. Server-safe.
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
      className={`bg-[#1e1e1e] text-white ${
        accent ? "border-b-[3px] border-[#f37312]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Ponto verde "Ao vivo" pulsante (indicador de Realtime).
export function LiveDot({ label = "Ao vivo" }: { label?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-[#4CAF50]">
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
      {label}
    </span>
  );
}
