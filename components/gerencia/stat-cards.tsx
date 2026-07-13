// Cartões de contadores do dia no topo do dashboard.
import { Card } from "@/components/ui";
import type { ResumoDia } from "@/lib/data/gerencia";

const ITEMS: {
  key: keyof ResumoDia;
  label: string;
  cls: string;
  dot: string;
}[] = [
  { key: "total", label: "Total", cls: "text-ink", dot: "bg-ink" },
  { key: "aceita", label: "Aceitas", cls: "text-success", dot: "bg-success" },
  { key: "recusada", label: "Recusadas", cls: "text-danger", dot: "bg-danger" },
  {
    key: "ocorrencia",
    label: "Ocorrência",
    cls: "text-warning",
    dot: "bg-warning",
  },
  { key: "em_rota", label: "Em rota", cls: "text-info", dot: "bg-info" },
  { key: "pendente", label: "Em aberto", cls: "text-muted", dot: "bg-muted" },
];

export function StatCards({ resumo }: { resumo: ResumoDia }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ITEMS.map((it) => (
        <Card key={it.key} className="p-4">
          <div className="mb-1 flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${it.dot}`}
              aria-hidden
            />
            <span className="text-xs font-medium text-muted">{it.label}</span>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${it.cls}`}>
            {resumo[it.key]}
          </div>
        </Card>
      ))}
    </div>
  );
}
