// Fila offline de canhotos. Cada registro tem um client_id idempotente para o
// sync não duplicar no servidor. A foto vai como Blob (sobrevive ao IndexedDB).
import { idbClear, idbDelete, idbGetAll, idbPut, STORE_CACHE, STORE_FILA } from "./db";
import type { CanhotoStatus, OcorrenciaTipo } from "@/lib/types";

export type CanhotoPendente = {
  client_id: string;
  nf_id: string;
  numero_nf: string;
  status: CanhotoStatus;
  ocorrencia_tipo?: OcorrenciaTipo;
  ocorrencia_desc?: string;
  // Observação livre do motorista (aceita/recusada) → notas_fiscais.observacao.
  observacao?: string;
  foto?: Blob;
  // Carimbo de localização no momento do registro (best-effort).
  lat?: number;
  lng?: number;
  gps_precisao?: number;
  criado_em: number;
};

export async function enfileirar(c: CanhotoPendente): Promise<void> {
  await idbPut(STORE_FILA, c);
}

export async function listarPendentes(): Promise<CanhotoPendente[]> {
  const all = await idbGetAll<CanhotoPendente>(STORE_FILA);
  return all.sort((a, b) => a.criado_em - b.criado_em);
}

export async function contarPendentes(): Promise<number> {
  return (await idbGetAll<CanhotoPendente>(STORE_FILA)).length;
}

export async function removerDaFila(clientId: string): Promise<void> {
  await idbDelete(STORE_FILA, clientId);
}

// Limpa fila + cache local do dispositivo. Chamado no logout para não vazar
// dados/canhotos de um motorista para o próximo login no mesmo aparelho.
export async function limparDadosLocais(): Promise<void> {
  await idbClear(STORE_FILA);
  await idbClear(STORE_CACHE);
}
