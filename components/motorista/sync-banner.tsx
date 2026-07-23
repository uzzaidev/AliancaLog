"use client";

// Banner discreto do estado de sincronização. Tenta esvaziar a fila ao montar,
// ao voltar a conexão, ao reabrir o app e periodicamente.
import { useEffect, useState, useSyncExternalStore } from "react";
import { IconWifiOff, IconCloudUpload } from "@tabler/icons-react";
import { contarPendentes } from "@/lib/offline/queue";
import { EVENTO_FILA, flushFila } from "@/lib/offline/sync";

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

  useEffect(() => {
    let vivo = true;
    const atualizar = async () => {
      const n = await contarPendentes();
      if (vivo) setPendentes(n);
    };
    const tentar = async () => {
      await flushFila();
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

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white ${
        !online ? "bg-[#856404]" : "bg-info"
      }`}
    >
      {!online ? <IconWifiOff size={15} /> : <IconCloudUpload size={15} />}
      {!online
        ? pendentes > 0
          ? `Sem conexão — ${pendentes} registro(s) salvo(s), enviando ao reconectar`
          : "Sem conexão — dados salvos, enviando ao reconectar"
        : `Enviando ${pendentes} registro(s)…`}
    </div>
  );
}
