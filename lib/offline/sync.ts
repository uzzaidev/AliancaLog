// Sincronização da fila offline com o servidor (/api/sync).
// Idempotente via client_id. Para o loop assim que uma requisição falha (offline).
import * as Sentry from "@sentry/nextjs";
import { listarPendentes, removerDaFila } from "./queue";

export const EVENTO_FILA = "alianca-fila-mudou";

export function notificarFila() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(EVENTO_FILA));
}

let rodando = false;
// Motivo da última falha ao tentar sincronizar — sem isso o banner mostrava
// "Enviando…" para sempre quando na real estava travado (erro de servidor,
// rede bloqueada etc.), sem dar pista nenhuma do porquê.
let ultimoErro: string | null = null;
export function getUltimoErro(): string | null {
  return ultimoErro;
}

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
      if (c.observacao) fd.set("observacao", c.observacao);
      if (c.lat != null) fd.set("lat", String(c.lat));
      if (c.lng != null) fd.set("lng", String(c.lng));
      if (c.gps_precisao != null) fd.set("gps_precisao", String(c.gps_precisao));
      if (c.foto) fd.set("foto", c.foto, "canhoto.jpg");
      if (c.foto_chegada) fd.set("foto_chegada", c.foto_chegada, "chegada.jpg");

      try {
        const res = await fetch("/api/sync", { method: "POST", body: fd });
        if (res.ok) {
          ultimoErro = null;
          await removerDaFila(c.client_id);
          enviados++;
        } else if (res.status === 409) {
          // já existia no servidor (idempotência) — pode remover da fila.
          ultimoErro = null;
          await removerDaFila(c.client_id);
          enviados++;
        } else if (res.status === 400) {
          // Erro do CLIENTE (dados inválidos/incompletos) — reenviar o mesmo
          // payload nunca vai passar a funcionar (ex.: item salvo antes do
          // A-010 exigir foto de chegada, sem essa foto). Reter esse item
          // travaria a fila inteira atrás dele para sempre; melhor descartar
          // só este e seguir com os demais.
          let detalhe = "";
          try {
            detalhe = ((await res.json()) as { error?: string }).error ?? "";
          } catch {
            /* corpo não era JSON — segue sem detalhe */
          }
          ultimoErro = `NF ${c.numero_nf}: não foi possível enviar${detalhe ? ` (${detalhe})` : ""} — registre a entrega novamente.`;
          Sentry.captureMessage(`Falha de validação no sync da NF ${c.numero_nf}: ${detalhe || "dados inválidos"}`, {
            level: "warning",
            tags: { area: "offline-sync", nf_id: c.nf_id, status: c.status },
            extra: { client_id: c.client_id, detalhe },
          });
          await removerDaFila(c.client_id);
        } else {
          let detalhe = "";
          try {
            detalhe = ((await res.json()) as { error?: string }).error ?? "";
          } catch {
            /* corpo não era JSON — segue sem detalhe */
          }
          ultimoErro = `NF ${c.numero_nf}: erro ${res.status}${detalhe ? ` — ${detalhe}` : ""}`;
          if (res.status >= 500) {
            Sentry.captureMessage(`Erro de servidor (${res.status}) no sync da NF ${c.numero_nf}`, {
              level: "error",
              tags: { area: "offline-sync", http_status: String(res.status) },
              extra: { client_id: c.client_id, nf_id: c.nf_id, detalhe },
            });
          }
          break; // erro de servidor — tenta de novo depois.
        }
      } catch (err) {
        ultimoErro = `NF ${c.numero_nf}: falha de rede ao enviar`;
        // Só reporta ao Sentry se for erro inesperado de execução, não offline padrão
        if (typeof navigator !== "undefined" && navigator.onLine) {
          Sentry.captureException(err, {
            tags: { area: "offline-sync" },
            extra: { client_id: c.client_id, nf_id: c.nf_id },
          });
        }
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
