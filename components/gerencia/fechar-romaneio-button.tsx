"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { fecharRomaneio } from "@/app/gerencia/romaneios/actions";

export function FecharRomaneioButton({
  romaneioId,
  disabled,
}: {
  romaneioId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function fechar() {
    setErro(null);
    start(async () => {
      const res = await fecharRomaneio(romaneioId);
      if (res.error) setErro(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button onClick={fechar} disabled={disabled || pending}>
        {pending ? "Fechando…" : "Fechar romaneio"}
      </Button>
      {erro && <p className="text-sm text-danger">{erro}</p>}
    </div>
  );
}
