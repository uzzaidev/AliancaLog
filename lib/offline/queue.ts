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
  // Foto de chegada (A-010) — separada da foto do canhoto, mesma tentativa.
  foto_chegada?: Blob;
  // Carimbo de localização no momento do registro (best-effort).
  lat?: number;
  lng?: number;
  gps_precisao?: number;
  criado_em: number;
  // Erros de validação preservam a prova no aparelho. Antes o item era apagado
  // e o formulário acabava mostrando "Registrado!" mesmo com rejeição do servidor.
  bloqueado_por_validacao?: string;
  tentativas_sync?: number;
  ultimo_erro_sync?: string;
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

export async function registrarFalhaNaFila(
  item: CanhotoPendente,
  mensagem: string,
  permanente = false,
): Promise<void> {
  await idbPut(STORE_FILA, {
    ...item,
    tentativas_sync: (item.tentativas_sync ?? 0) + 1,
    ultimo_erro_sync: mensagem,
    bloqueado_por_validacao: permanente ? mensagem : item.bloqueado_por_validacao,
  });
}

// Limpa fila + cache local do dispositivo. Chamado no logout para não vazar
// dados/canhotos de um motorista para o próximo login no mesmo aparelho.
export async function limparDadosLocais(): Promise<void> {
  await idbClear(STORE_FILA);
  await idbClear(STORE_CACHE);
}
