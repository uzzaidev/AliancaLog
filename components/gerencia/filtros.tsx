"use client";

// Barra de filtros do dashboard. Escreve os filtros na URL (searchParams) e o
// Server Component relê os dados filtrados.
import { useRouter, useSearchParams } from "next/navigation";
import { NOTA_STATUS_META, type NotaStatus } from "@/lib/types";
import type { EmpresaItem, MotoristaItem } from "@/lib/data/gerencia";

export function Filtros({
  empresas,
  motoristas,
}: {
  empresas: EmpresaItem[];
  motoristas: MotoristaItem[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/gerencia/dashboard?${next.toString()}`);
  }

  // Chip de filtro: borda cinza; quando um valor está selecionado, fica laranja.
  function selectCls(ativo: boolean) {
    return `cursor-pointer rounded-md border bg-surface px-2.5 py-2 text-sm outline-none transition-colors focus:border-brand ${
      ativo
        ? "border-brand bg-brand-50 text-brand"
        : "border-line text-gray-700"
    }`;
  }

  const temFiltro =
    !!params.get("status") ||
    !!params.get("motorista") ||
    !!params.get("empresa");

  return (
    <div className="flex flex-wrap items-center gap-2">
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
        className={selectCls(!!params.get("motorista"))}
        value={params.get("motorista") ?? ""}
        onChange={(e) => setParam("motorista", e.target.value)}
      >
        <option value="">Todos os motoristas</option>
        {motoristas.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome ?? m.email}
          </option>
        ))}
      </select>

      <select
        className={selectCls(!!params.get("empresa"))}
        value={params.get("empresa") ?? ""}
        onChange={(e) => setParam("empresa", e.target.value)}
      >
        <option value="">Todas as empresas</option>
        {empresas.map((em) => (
          <option key={em.id} value={em.id}>
            {em.nome}
          </option>
        ))}
      </select>

      {temFiltro && (
        <button
          onClick={() => router.push("/gerencia/dashboard")}
          className="text-sm font-medium text-brand hover:underline"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
