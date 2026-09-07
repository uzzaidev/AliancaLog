"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { dispararErroServidorSentry } from "./actions";
import { Button } from "@/components/ui";

export function ClientTester({ dsnConfiguradaServer }: { dsnConfiguradaServer: boolean }) {
  const [loadingServer, setLoadingServer] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const [log, setLog] = useState<{ tipo: "ok" | "erro" | "aviso"; texto: string } | null>(null);

  const dsnConfiguradaClient = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

  async function testarServidor() {
    setLoadingServer(true);
    setLog(null);
    try {
      const res = await dispararErroServidorSentry();
      if (res.dsnConfigurada) {
        setLog({ tipo: "ok", texto: res.mensagem });
      } else {
        setLog({ tipo: "aviso", texto: res.mensagem });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLog({ tipo: "erro", texto: `Falha ao acionar teste: ${msg}` });
    } finally {
      setLoadingServer(false);
    }
  }

  function testarCliente() {
    setLoadingClient(true);
    setLog(null);
    try {
      if (!dsnConfiguradaClient) {
        setLog({
          tipo: "aviso",
          texto:
            "NEXT_PUBLIC_SENTRY_DSN não está configurada neste ambiente client-side. Adicione-a na Vercel e faça um novo deploy.",
        });
        setLoadingClient(false);
        return;
      }

      const eventId = Sentry.captureMessage(
        "Teste controlado do piloto: Aviso do cliente/PWA (Aliança Log)",
        {
          level: "warning",
          tags: {
            area: "offline-sync",
            origem: "diagnostico-client-pwa",
            navegador: typeof navigator !== "undefined" ? navigator.userAgent : "desconhecido",
            piloto: "true",
          },
          extra: {
            online: typeof navigator !== "undefined" ? navigator.onLine : true,
            timestamp: new Date().toISOString(),
          },
        },
      );

      setLog({
        tipo: "ok",
        texto: `Evento client-side enviado com sucesso! Event ID: ${eventId}. Confira no painel do Sentry.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLog({ tipo: "erro", texto: `Erro no disparo client-side: ${msg}` });
    } finally {
      setLoadingClient(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line p-4 bg-surface">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm text-ink">Teste no Servidor</h3>
            <span className="text-[10px] text-muted">
              {dsnConfiguradaServer ? "● DSN Ativa" : "○ DSN Ausente"}
            </span>
          </div>
          <p className="text-xs text-muted mb-3">
            Dispara uma exceção simulada via Server Action com as tags{" "}
            <code className="bg-canvas px-1 rounded text-ink">area: offline-sync</code> e{" "}
            <code className="bg-canvas px-1 rounded text-ink">piloto: true</code>.
          </p>
          <Button
            onClick={testarServidor}
            disabled={loadingServer}
            variant="secondary"
            className="w-full text-xs h-9"
          >
            {loadingServer ? "Enviando..." : "Disparar erro no Servidor"}
          </Button>
        </div>

        <div className="rounded-lg border border-line p-4 bg-surface">
          <h3 className="font-semibold text-sm text-ink mb-1">Teste no Navegador (Cliente / PWA)</h3>
          <p className="text-xs text-muted mb-3">
            Dispara um aviso direto do browser para validar captura de erros no celular do motorista
            com replay de sessão.
          </p>
          <Button
            onClick={testarCliente}
            disabled={loadingClient}
            variant="secondary"
            className="w-full text-xs h-9"
          >
            {loadingClient ? "Enviando..." : "Disparar evento no Cliente"}
          </Button>
        </div>
      </div>

      {log && (
        <div
          className={`p-3.5 rounded-lg text-xs leading-relaxed border ${
            log.tipo === "ok"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
              : log.tipo === "aviso"
                ? "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
                : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
          }`}
        >
          <span className="font-bold mr-1">
            {log.tipo === "ok" ? "✅ Sucesso:" : log.tipo === "aviso" ? "⚠️ Aviso:" : "❌ Erro:"}
          </span>
          {log.texto}
        </div>
      )}
    </div>
  );
}
