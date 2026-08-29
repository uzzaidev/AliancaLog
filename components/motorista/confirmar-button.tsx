"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { confirmarRomaneio } from "@/app/motorista/actions";

export function ConfirmarButton({ romaneioId }: { romaneioId: string }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErro(null);
            const resultado = await confirmarRomaneio(romaneioId);
            if (resultado.error) setErro(resultado.error);
          })
        }
      >
        {pending ? "Confirmando…" : "Confirmar recebimento e iniciar rota"}
      </Button>
      {erro && <p className="text-sm text-danger">{erro}</p>}
    </div>
  );
}
