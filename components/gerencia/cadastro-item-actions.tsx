"use client";

// Botões de "desativar/reativar" e "excluir" para um item de cadastro
// (motorista, empresa ou veículo). Reaproveitado nas 3 listas.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/gerencia/cadastros/actions";

export function CadastroItemActions({
  ativo,
  itemLabel,
  onToggle,
  onExcluir,
}: {
  ativo: boolean;
  itemLabel: string;
  onToggle: () => Promise<ActionResult>;
  onExcluir: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    setErro(null);
    start(async () => {
      const res = await onToggle();
      if (res.error) setErro(res.error);
      else router.refresh();
    });
  }

  function excluir() {
    setErro(null);
    if (!confirm(`Excluir ${itemLabel}? Essa ação não pode ser desfeita.`)) return;
    start(async () => {
      const res = await onExcluir();
      if (res.error) setErro(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={toggle}
          disabled={pending}
          className="font-medium text-muted hover:text-ink disabled:opacity-50"
        >
          {ativo ? "Desativar" : "Reativar"}
        </button>
        <button
          onClick={excluir}
          disabled={pending}
          className="font-medium text-danger hover:underline disabled:opacity-50"
        >
          Excluir
        </button>
      </div>
      {erro && <p className="mt-1 text-xs text-danger">{erro}</p>}
    </div>
  );
}
