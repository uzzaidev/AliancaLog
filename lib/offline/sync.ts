// Sincronização da fila offline com o servidor (/api/sync).
// Idempotente via client_id. Para o loop assim que uma requisição falha (offline).
import { listarPendentes, removerDaFila } from "./queue";

export const EVENTO_FILA = "alianca-fila-mudou";

export function notificarFila() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(EVENTO_FILA));
}

let rodando = false;

export async function flushFila(): Promise<{ enviados: number; restantes: number }> {
  if (rodando) return { enviados: 0, restantes: (await listarPendentes()).length };
  rodando = true;
  let enviados = 0;
  try {
    const pendentes = await listarPendentes();
    for (const c of pendentes) {
      const fd = new FormData();
      fd.set("client_id", c.client_id);
      fd.set("nf_id", c.nf_id);
      fd.set("status", c.status);
      if (c.ocorrencia_tipo) fd.set("ocorrencia_tipo", c.ocorrencia_tipo);
      if (c.ocorrencia_desc) fd.set("ocorrencia_desc", c.ocorrencia_desc);
      if (c.foto) fd.set("foto", c.foto, "canhoto.jpg");

      try {
        const res = await fetch("/api/sync", { method: "POST", body: fd });
        if (res.ok) {
          await removerDaFila(c.client_id);
          enviados++;
        } else if (res.status === 409) {
          // já existia no servidor (idempotência) — pode remover da fila.
          await removerDaFila(c.client_id);
          enviados++;
        } else {
          break; // erro de servidor — tenta de novo depois.
        }
      } catch {
        break; // sem rede — interrompe e tenta no próximo gatilho.
      }
    }
  } finally {
    rodando = false;
  }
  const restantes = (await listarPendentes()).length;
  if (enviados > 0) notificarFila();
  return { enviados, restantes };
}
