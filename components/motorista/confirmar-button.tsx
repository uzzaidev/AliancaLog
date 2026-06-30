"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { confirmarRomaneio } from "@/app/motorista/actions";

export function ConfirmarButton({ romaneioId }: { romaneioId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() => start(() => confirmarRomaneio(romaneioId))}
    >
      {pending ? "Confirmando…" : "Confirmar recebimento e iniciar rota"}
    </Button>
  );
}
