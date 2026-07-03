"use client";

// Barra de filtros do portal do cliente. Escreve na URL (searchParams); o
// Server Component relê os dados filtrados.
import { useRouter, useSearchParams } from "next/navigation";
import { NOTA_STATUS_META, type NotaStatus } from "@/lib/types";

const PERIODOS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "mes", label: "Últimos 30 dias" },
  { value: "todos", label: "Tudo" },
];

export function Filtros() {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/cliente/notas?${next.toString()}`);
  }

  const selectCls =
    "rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        placeholder="🔍 Buscar NF ou cidade…"
        defaultValue={params.get("busca") ?? ""}
        onChange={(e) => setParam("busca", e.target.value)}
        className="min-w-[200px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
      />

      <select
        className={selectCls}
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">Todos os status</option>
        {(Object.keys(NOTA_STATUS_META) as NotaStatus[]).map((s) => (
          <option key={s} value={s}>
            {NOTA_STATUS_META[s].label}
          </option>
        ))}
      </select>

      <select
        className={selectCls}
        value={params.get("periodo") ?? "hoje"}
        onChange={(e) => setParam("periodo", e.target.value)}
      >
        {PERIODOS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
