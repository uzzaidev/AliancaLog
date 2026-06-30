// Cartões de contadores do dia no topo do dashboard.
import { Card } from "@/components/ui";
import type { ResumoDia } from "@/lib/data/gerencia";

const ITEMS: {
  key: keyof ResumoDia;
  label: string;
  cls: string;
}[] = [
  { key: "total", label: "Total", cls: "text-ink" },
  { key: "aceita", label: "Aceitas", cls: "text-success" },
  { key: "recusada", label: "Recusadas", cls: "text-danger" },
  { key: "retida", label: "Retidas", cls: "text-warning" },
  { key: "ocorrencia", label: "Ocorrência", cls: "text-warning" },
  { key: "em_rota", label: "Em rota", cls: "text-info" },
  { key: "pendente", label: "Em aberto", cls: "text-muted" },
];

export function StatCards({ resumo }: { resumo: ResumoDia }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {ITEMS.map((it) => (
        <Card key={it.key} className="p-4">
          <div className={`text-2xl font-bold ${it.cls}`}>{resumo[it.key]}</div>
          <div className="text-xs text-muted">{it.label}</div>
        </Card>
      ))}
    </div>
  );
}
