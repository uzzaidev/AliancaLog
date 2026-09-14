"use client";

// Barra de filtros do dashboard. Escreve os filtros na URL (searchParams) e o
// Server Component relê os dados filtrados.
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconAdjustmentsHorizontal, IconChevronDown } from "@tabler/icons-react";
import { NOTA_STATUS_META, type NotaStatus } from "@/lib/types";
import type { EmpresaItem, MotoristaItem } from "@/lib/data/gerencia";

// Períodos aceitos por getNotasDoDia (lib/data/gerencia.ts). O valor vazio é o
// default do dashboard — "hoje + tudo que ainda está em aberto" — e não um
// "sem filtro": é justamente o que impede uma NF de ontem ainda pendente de
// sumir do painel (A-001). Por isso ele aparece nomeado na lista, não como
// placeholder.
const PERIODOS = [
  { value: "", label: "Hoje + pendências" },
  { value: "hoje", label: "Só hoje" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "mes", label: "Últimos 30 dias" },
  { value: "todos", label: "Todo o período" },
];

export function Filtros({
  empresas,
  motoristas,
}: {
  empresas: EmpresaItem[];
  motoristas: MotoristaItem[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [aberto, setAberto] = useState(false);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/gerencia/dashboard?${next.toString()}`);
  }

  // Chip de filtro: borda cinza; quando um valor está selecionado, fica laranja.
  function selectCls(ativo: boolean) {
    return `min-h-12 w-full cursor-pointer rounded-md border bg-surface px-3 py-2 text-base outline-none transition-colors focus:border-brand sm:min-h-0 sm:w-auto sm:px-2.5 sm:text-sm ${
      ativo
        ? "border-brand bg-brand-50 text-brand"
        : "border-line text-gray-700"
    }`;
  }

  const totalFiltros = ["status", "motorista", "empresa", "periodo", "emissao"]
    .filter((key) => !!params.get(key)).length;
  const temFiltro = totalFiltros > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-expanded={aberto}
        aria-controls="filtros-gerencia"
        className="flex min-h-12 w-full items-center justify-between rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink shadow-sm sm:hidden"
      >
        <span className="flex items-center gap-2">
          <IconAdjustmentsHorizontal size={19} /> Filtrar notas
          {temFiltro && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand">
              {totalFiltros}
            </span>
          )}
        </span>
        <IconChevronDown size={18} className={aberto ? "rotate-180" : ""} />
      </button>
      <div
        id="filtros-gerencia"
        className={`${aberto ? "grid" : "hidden"} mt-2 grid-cols-1 gap-2 rounded-xl border border-line bg-surface p-3 sm:mt-0 sm:flex sm:flex-wrap sm:items-center sm:border-0 sm:bg-transparent sm:p-0`}
      >
      <select
        className={selectCls(!!params.get("periodo"))}
        value={params.get("periodo") ?? ""}
        onChange={(e) => setParam("periodo", e.target.value)}
        aria-label="Período"
      >
        {PERIODOS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <label className={selectCls(!!params.get("emissao"))}>
        <span className="mr-2 block text-xs font-medium sm:inline">Emissão no sistema</span>
        <input
          type="date"
          value={params.get("emissao") ?? ""}
          onChange={(e) => setParam("emissao", e.target.value)}
          aria-label="Filtrar pela data de emissão no sistema"
          className="w-full bg-transparent text-base outline-none sm:w-auto sm:text-sm"
        />
      </label>

      <select
        className={selectCls(!!params.get("status"))}
        value={params.get("status") ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
        aria-label="Status"
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
        aria-label="Motorista"
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
        aria-label="Empresa"
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
          className="min-h-11 text-sm font-medium text-brand hover:underline sm:min-h-0"
        >
          Limpar
        </button>
      )}
      </div>
    </div>
  );
}
