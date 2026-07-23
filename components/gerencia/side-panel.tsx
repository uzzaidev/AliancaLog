// Painel lateral do dashboard (read-only): progresso de cada motorista no dia e
// os clientes (empresas) com NFs hoje. Derivado dos dados já carregados.
import { IconSteeringWheel, IconBuildingStore } from "@tabler/icons-react";
import type { NotaRow, EmpresaPainel } from "@/lib/data/gerencia";

const FINAIS = ["aceita", "recusada", "ocorrencia"];

export function SidePanel({
  notas,
  clientes,
}: {
  notas: NotaRow[];
  clientes: EmpresaPainel[];
}) {
  // Agrega progresso por motorista a partir das NFs atribuídas.
  const porMotorista = new Map<string, { total: number; feitas: number }>();
  for (const n of notas) {
    if (!n.motorista_nome) continue;
    const m = porMotorista.get(n.motorista_nome) ?? { total: 0, feitas: 0 };
    m.total++;
    if (FINAIS.includes(n.status)) m.feitas++;
    porMotorista.set(n.motorista_nome, m);
  }
  const motoristas = Array.from(porMotorista.entries()).sort(
    (a, b) => b[1].total - a[1].total,
  );

  return (
    <aside className="w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:w-60">
      <Secao icon={<IconSteeringWheel size={14} />} titulo="Motoristas">
        {motoristas.length === 0 && (
          <p className="px-4 py-3 text-xs text-muted">
            Nenhuma NF atribuída ainda.
          </p>
        )}
        {motoristas.map(([nome, m]) => {
          const pct = m.total ? Math.round((m.feitas / m.total) * 100) : 0;
          return (
            <div
              key={nome}
              className="flex items-center gap-2.5 border-t border-gray-50 px-4 py-2.5"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  m.feitas > 0 ? "bg-success" : "bg-gray-300"
                }`}
              />
              <span className="flex-1 truncate text-xs text-gray-700">
                {nome}
              </span>
              <span className="h-1 w-10 overflow-hidden rounded-full bg-gray-100">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-8 text-right text-[11px] font-medium text-muted tabular-nums">
                {m.feitas}/{m.total}
              </span>
            </div>
          );
        })}
      </Secao>

      <Secao icon={<IconBuildingStore size={14} />} titulo="Clientes hoje">
        {clientes.length === 0 && (
          <p className="px-4 py-3 text-xs text-muted">Nenhum cliente hoje.</p>
        )}
        {clientes.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2.5 border-t border-gray-50 px-4 py-2.5"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
            <span className="flex-1 truncate text-xs text-gray-700">
              {c.nome}
            </span>
            <span className="text-[11px] font-semibold text-brand">
              {c.total} NF{c.total !== 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </Secao>
    </aside>
  );
}

function Secao({
  icon,
  titulo,
  children,
}: {
  icon: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-brand">
        {icon} {titulo}
      </div>
      {children}
    </div>
  );
}
