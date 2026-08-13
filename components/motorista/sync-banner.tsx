"use client";

// Banner discreto do estado de sincronização. Tenta esvaziar a fila ao montar,
// ao voltar a conexão, ao reabrir o app e periodicamente.
import { useEffect, useState, useSyncExternalStore } from "react";
import { IconWifiOff, IconCloudUpload, IconAlertTriangle } from "@tabler/icons-react";
import { contarPendentes } from "@/lib/offline/queue";
import { EVENTO_FILA, flushFila, getUltimoErro } from "@/lib/offline/sync";

// Status online lido como external store (evita setState síncrono em efeito).
function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function SyncBanner() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [pendentes, setPendentes] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const atualizar = async () => {
      const n = await contarPendentes();
      if (vivo) setPendentes(n);
    };
    const tentar = async () => {
      await flushFila();
      if (vivo) setErro(getUltimoErro());
      await atualizar();
    };

    tentar();

    const onEvt = () => atualizar();
    const onVis = () => {
      if (document.visibilityState === "visible") tentar();
    };
    window.addEventListener("online", tentar);
    window.addEventListener(EVENTO_FILA, onEvt);
    document.addEventListener("visibilitychange", onVis);
    const iv = setInterval(tentar, 30000);

    return () => {
      vivo = false;
      clearInterval(iv);
      window.removeEventListener("online", tentar);
      window.removeEventListener(EVENTO_FILA, onEvt);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (online && pendentes === 0) return null;

  // Falha real (servidor/rede) enquanto online: cor de alerta + motivo, em vez
  // de "Enviando…" indefinidamente sem explicar por que não sai da fila.
  const falhando = online && pendentes > 0 && erro !== null;

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium text-white ${
        !online ? "bg-offline" : falhando ? "bg-danger-bright" : "bg-info"
      }`}
    >
      {!online ? (
        <IconWifiOff size={15} className="shrink-0" />
      ) : falhando ? (
        <IconAlertTriangle size={15} className="shrink-0" />
      ) : (
        <IconCloudUpload size={15} className="shrink-0" />
      )}
      {!online
        ? pendentes > 0
          ? `Sem conexão — ${pendentes} registro(s) salvo(s), enviando ao reconectar`
          : "Sem conexão — dados salvos, enviando ao reconectar"
        : falhando
          ? `Não consegui enviar — ${erro}`
          : `Enviando ${pendentes} registro(s)…`}
    </div>
  );
}
