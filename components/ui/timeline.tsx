// Linha do tempo com dots + conector vertical (card do cliente e comprovante).
// Server-safe. Cada passo: rótulo + horário opcional + tom do marcador.
import { type ReactNode } from "react";

export type TimelineTone = "done" | "pending" | "danger";

export type TimelineStep = {
  label: ReactNode;
  time?: string;
  tone?: TimelineTone;
};

const DOT: Record<TimelineTone, string> = {
  done: "bg-brand border-brand",
  pending: "bg-gray-300 border-gray-200",
  danger: "bg-danger border-danger",
};

const LABEL: Record<TimelineTone, string> = {
  done: "text-ink",
  pending: "text-muted",
  danger: "font-bold text-danger",
};

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol>
      {steps.map((s, i) => {
        const tone = s.tone ?? "done";
        const last = i === steps.length - 1;
        return (
          <li key={i} className="flex gap-3">
            <div className="flex w-3 flex-col items-center">
              <span
                className={`h-3 w-3 shrink-0 rounded-full border-2 ${DOT[tone]}`}
              />
              {!last && <span className="my-1 w-0.5 flex-1 bg-gray-200" />}
            </div>
            <div className={last ? "" : "pb-3"}>
              <div className={`text-sm ${LABEL[tone]}`}>{s.label}</div>
              {s.time && (
                <div className="mt-0.5 text-xs text-muted">{s.time}</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
