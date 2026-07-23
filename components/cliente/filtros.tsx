"use client";

// Barra de filtros do portal do cliente. Escreve na URL (searchParams); o
// Server Component relê os dados filtrados.
import { useRouter, useSearchParams } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";
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

  function selectCls(ativo: boolean) {
    return `cursor-pointer rounded-lg border bg-surface px-2.5 py-2 text-sm outline-none transition-colors focus:border-brand ${
      ativo ? "border-brand bg-brand-50 text-brand" : "border-line text-gray-700"
    }`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <IconSearch
          size={15}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          placeholder="Buscar NF ou cidade…"
          defaultValue={params.get("busca") ?? ""}
          onChange={(e) => setParam("busca", e.target.value)}
          className="w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-brand"
        />
      </div>

      <select
        className={selectCls(!!params.get("status"))}
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
        className={selectCls(
          !!params.get("periodo") && params.get("periodo") !== "hoje",
        )}
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
