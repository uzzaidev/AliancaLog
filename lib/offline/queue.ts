// Fila offline de canhotos. Cada registro tem um client_id idempotente para o
// sync não duplicar no servidor. A foto vai como Blob (sobrevive ao IndexedDB).
import { idbDelete, idbGetAll, idbPut, STORE_FILA } from "./db";
import type { CanhotoStatus, OcorrenciaTipo } from "@/lib/types";

export type CanhotoPendente = {
  client_id: string;
  nf_id: string;
  numero_nf: string;
  status: CanhotoStatus;
  ocorrencia_tipo?: OcorrenciaTipo;
  ocorrencia_desc?: string;
  foto?: Blob;
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
