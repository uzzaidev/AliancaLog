"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconChevronRight, IconRoute } from "@tabler/icons-react";
import { Badge, Button, Card } from "@/components/ui";
import { Progress } from "@/components/ui/progress";
import { ConfirmarButton } from "@/components/motorista/confirmar-button";
import type { RomaneioMotorista } from "@/lib/data/motorista";
import { obterRomaneiosCache, salvarRomaneiosCache } from "@/lib/offline/cache";
import { EVENTO_FILA } from "@/lib/offline/sync";

export function EntregasView({
  initialRomaneios,
}: {
  initialRomaneios: RomaneioMotorista[];
}) {
  const [romaneios, setRomaneios] = useState<RomaneioMotorista[]>(initialRomaneios);

  useEffect(() => {
    let ativo = true;

    async function sincronizarCache() {
      // A resposta vazia do servidor é autoritativa: significa que não há mais
      // romaneio ativo. Antes ela era confundida com falha de rede e o cache
      // ressuscitava um romaneio já fechado como “Em andamento”.
      await salvarRomaneiosCache(initialRomaneios);
      if (ativo) setRomaneios(initialRomaneios);
    }

    sincronizarCache();

    async function recarregarCache() {
      const doCache = await obterRomaneiosCache();
      if (ativo && doCache) {
        setRomaneios(doCache);
      }
    }

    window.addEventListener(EVENTO_FILA, recarregarCache);
    return () => {
      ativo = false;
      window.removeEventListener(EVENTO_FILA, recarregarCache);
    };
  }, [initialRomaneios]);

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold tracking-tight text-dark">
        Minhas entregas
      </h1>

      {romaneios.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted">
          <IconRoute size={28} className="text-gray-300" />
          Nenhum romaneio em aberto.
        </Card>
      )}

      {romaneios.map((r) => (
        <Card
          key={r.id}
          className={`space-y-3 p-4 ${
            r.confirmado_em ? "border-2 border-brand" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-dark">{r.total} NFs</span>
            <Badge tone={r.confirmado_em ? "info" : "neutral"}>
              {r.confirmado_em ? "Em andamento" : "Aguardando confirmação"}
            </Badge>
          </div>

          {r.confirmado_em ? (
            <>
              <Progress done={r.concluidas} total={r.total} />
              <Link href={`/motorista/romaneio/${r.id}`} className="block">
                <Button className="w-full">
                  Abrir entregas
                  <IconChevronRight size={18} />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Confirme para iniciar as entregas deste romaneio.
              </p>
              <ConfirmarButton romaneioId={r.id} />
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

