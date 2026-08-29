// Sincronização da fila offline com o servidor (/api/sync).
// Idempotente via client_id. Erro de um item não bloqueia os seguintes; falha
// de rede/autenticação interrompe o lote e é tentada novamente depois.
import * as Sentry from "@sentry/nextjs";
import {
  listarPendentes,
  registrarFalhaNaFila,
  removerDaFila,
} from "./queue";
import { reconciliarNotaAposSync } from "./cache";
import {
  classificarRespostaSync,
  mensagemRespostaSync,
} from "./sync-result";

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

export type ResultadoFlush = {
  enviados: number;
  restantes: number;
  falhas: { client_id: string; mensagem: string; permanente: boolean }[];
};

const TIMEOUT_ENVIO_MS = 45_000;

async function detalheResposta(res: Response): Promise<string> {
  try {
    return ((await res.json()) as { error?: string }).error ?? "";
  } catch {
    return "";
  }
}

/** Agenda Background Sync quando o navegador oferece a API (Chrome/Android).
 * iOS e navegadores sem suporte continuam cobertos pelos gatilhos do SyncBanner. */
export async function agendarSyncBackground(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registro = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      sync?: { register(tag: string): Promise<void> };
    };
    await registro.sync?.register("alianca-sync-canhotos");
  } catch {
    // Best-effort: a sincronização em primeiro plano continua ativa.
  }
}

export async function flushFila(): Promise<ResultadoFlush> {
  if (rodando)
    return {
      enviados: 0,
      restantes: (await listarPendentes()).length,
      falhas: [],
    };
  rodando = true;
  let enviados = 0;
  const falhas: ResultadoFlush["falhas"] = [];
  try {
    const pendentes = await listarPendentes();
    for (const c of pendentes) {
      if (c.bloqueado_por_validacao) {
        ultimoErro = c.bloqueado_por_validacao;
        falhas.push({
          client_id: c.client_id,
          mensagem: c.bloqueado_por_validacao,
          permanente: true,
        });
        continue;
      }
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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_ENVIO_MS);
        let res: Response;
        try {
          res = await fetch("/api/sync", {
            method: "POST",
            body: fd,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        const disposicao = classificarRespostaSync(res.status);
        if (disposicao === "sucesso") {
          ultimoErro = null;
          await removerDaFila(c.client_id);
          await reconciliarNotaAposSync(c.nf_id, c.status);
          enviados++;
        } else if (disposicao === "validacao") {
          const detalhe = await detalheResposta(res);
          ultimoErro = mensagemRespostaSync(c.numero_nf, res.status, detalhe);
          await registrarFalhaNaFila(c, ultimoErro, true);
          falhas.push({ client_id: c.client_id, mensagem: ultimoErro, permanente: true });
          Sentry.captureMessage(`Falha de validação no sync da NF ${c.numero_nf}: ${detalhe || "dados inválidos"}`, {
            level: "warning",
            tags: { area: "offline-sync", nf_id: c.nf_id, status: c.status },
            extra: { client_id: c.client_id, detalhe },
          });
        } else {
          const detalhe = await detalheResposta(res);
          ultimoErro = mensagemRespostaSync(c.numero_nf, res.status, detalhe);
          await registrarFalhaNaFila(c, ultimoErro);
          falhas.push({ client_id: c.client_id, mensagem: ultimoErro, permanente: false });
          if (res.status >= 500) {
            Sentry.captureMessage(`Erro de servidor (${res.status}) no sync da NF ${c.numero_nf}`, {
              level: "error",
              tags: { area: "offline-sync", http_status: String(res.status) },
              extra: { client_id: c.client_id, nf_id: c.nf_id, detalhe },
            });
          }
          // Um item com erro de servidor não impede as entregas seguintes.
          if (disposicao === "autenticacao") break;
        }
      } catch (err) {
        const timeout = err instanceof DOMException && err.name === "AbortError";
        ultimoErro = `NF ${c.numero_nf}: ${timeout ? "tempo esgotado" : "falha de rede"} ao enviar`;
        await registrarFalhaNaFila(c, ultimoErro);
        falhas.push({ client_id: c.client_id, mensagem: ultimoErro, permanente: false });
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
  return { enviados, restantes, falhas };
}
