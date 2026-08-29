import { idbClear, idbGet, idbGetAll, idbPut, STORE_CACHE } from "./db";
import {
  NF_STATUS_FINAIS,
  type NotaMotorista,
  type NotaStatus,
} from "@/lib/types";
import type { NotaComRomaneio, RomaneioMotorista } from "@/lib/data/motorista";

type CacheEntry<T> = {
  key: string;
  data: T;
  updated_at: number;
};

const KEY_ROMANEIOS = "romaneios_ativos";
const keyNotasRomaneio = (romaneioId: string) => `notas_romaneio_${romaneioId}`;
const keyNota = (nfId: string) => `nota_${nfId}`;

/** Salva a lista de romaneios do dia no cache local. */
export async function salvarRomaneiosCache(
  romaneios: RomaneioMotorista[],
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await idbPut<CacheEntry<RomaneioMotorista[]>>(STORE_CACHE, {
      key: KEY_ROMANEIOS,
      data: romaneios,
      updated_at: Date.now(),
    });
  } catch {
    // Best-effort
  }
}

/** Recupera os romaneios do cache local se offline ou em falha de rede. */
export async function obterRomaneiosCache(): Promise<RomaneioMotorista[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const entry = await idbGet<CacheEntry<RomaneioMotorista[]>>(
      STORE_CACHE,
      KEY_ROMANEIOS,
    );
    return entry?.data ?? null;
  } catch {
    return null;
  }
}

/** Salva as notas de um romaneio no cache local. */
export async function salvarNotasRomaneioCache(
  romaneioId: string,
  notas: NotaMotorista[],
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await idbPut<CacheEntry<NotaMotorista[]>>(STORE_CACHE, {
      key: keyNotasRomaneio(romaneioId),
      data: notas,
      updated_at: Date.now(),
    });
    // Também salva individualmente cada nota
    for (const n of notas) {
      await salvarNotaCache({ ...n, romaneio_id: romaneioId });
    }
  } catch {
    // Best-effort
  }
}

/** Recupera as notas de um romaneio do cache local. */
export async function obterNotasRomaneioCache(
  romaneioId: string,
): Promise<NotaMotorista[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const entry = await idbGet<CacheEntry<NotaMotorista[]>>(
      STORE_CACHE,
      keyNotasRomaneio(romaneioId),
    );
    return entry?.data ?? null;
  } catch {
    return null;
  }
}

/** Salva uma nota individual no cache local. */
export async function salvarNotaCache(
  nota: NotaMotorista & { romaneio_id?: string | null },
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const notaCompleta: NotaComRomaneio = {
      ...nota,
      romaneio_id: nota.romaneio_id ?? null,
    };
    await idbPut<CacheEntry<NotaComRomaneio>>(STORE_CACHE, {
      key: keyNota(nota.id),
      data: notaCompleta,
      updated_at: Date.now(),
    });
  } catch {
    // Best-effort
  }
}

/** Recupera uma nota individual do cache local. */
export async function obterNotaCache(
  nfId: string,
): Promise<NotaComRomaneio | null> {
  if (typeof window === "undefined") return null;
  try {
    const entry = await idbGet<CacheEntry<NotaComRomaneio>>(
      STORE_CACHE,
      keyNota(nfId),
    );
    return entry?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Atualiza o status de uma nota no cache local (individual e listas de romaneios).
 * Chamado depois que o servidor confirma o canhoto/ocorrência.
 */
export async function atualizarStatusNotaCache(
  nfId: string,
  status: NotaStatus,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    // 1. Atualiza a nota individual
    const nota = await obterNotaCache(nfId);
    if (nota) {
      nota.status = status;
      await salvarNotaCache(nota);
    }

    // 2. Atualiza em todas as listas de romaneios em cache
    const todasEntradas = await idbGetAll<CacheEntry<unknown>>(STORE_CACHE);
    for (const item of todasEntradas) {
      if (item.key.startsWith("notas_romaneio_")) {
        const notas = item.data as NotaMotorista[];
        if (Array.isArray(notas)) {
          let mudou = false;
          const atualizadas = notas.map((n) => {
            if (n.id === nfId) {
              mudou = true;
              return { ...n, status };
            }
            return n;
          });
          if (mudou) {
            await idbPut<CacheEntry<NotaMotorista[]>>(STORE_CACHE, {
              key: item.key,
              data: atualizadas,
              updated_at: Date.now(),
            });
          }
        }
      }
    }

    // 3. Atualiza contadores em romaneios_ativos
    const romaneios = await obterRomaneiosCache();
    if (romaneios && nota?.romaneio_id) {
      const romaneioId = nota.romaneio_id;
      const notasRomaneio = await obterNotasRomaneioCache(romaneioId);
      if (notasRomaneio) {
        const concluidas = notasRomaneio.filter((n) =>
          NF_STATUS_FINAIS.includes(n.status),
        ).length;
        const atualizados = romaneios.map((r) =>
          r.id === romaneioId
            ? {
                ...r,
                concluidas,
                // O servidor fecha o romaneio na mesma transação da última
                // aceita. Espelhar isso localmente evita mostrar 100% como
                // “Em andamento” antes do refresh/realtime.
                status:
                  r.total > 0 && concluidas === r.total
                    ? ("fechado" as const)
                    : r.status,
              }
            : r,
        );
        await salvarRomaneiosCache(atualizados);
      }
    }
  } catch {
    // Best-effort
  }
}

/**
 * Alinha o cache somente DEPOIS da confirmação do servidor.
 * Aceita permanece no romaneio; recusa/ocorrência voltam ao painel da gerência
 * e precisam sair da lista local do motorista para não permitir uma nova
 * tentativa sem reatribuição.
 */
export async function reconciliarNotaAposSync(
  nfId: string,
  status: NotaStatus,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (status === "aceita") {
      await atualizarStatusNotaCache(nfId, status);
      return;
    }

    const nota = await obterNotaCache(nfId);
    if (nota) {
      await salvarNotaCache({ ...nota, status, romaneio_id: null });
    }

    const entradas = await idbGetAll<CacheEntry<unknown>>(STORE_CACHE);
    const totais = new Map<string, { total: number; concluidas: number }>();
    for (const item of entradas) {
      if (!item.key.startsWith("notas_romaneio_")) continue;
      const romaneioId = item.key.slice("notas_romaneio_".length);
      const notas = Array.isArray(item.data)
        ? (item.data as NotaMotorista[]).filter((n) => n.id !== nfId)
        : [];
      await idbPut<CacheEntry<NotaMotorista[]>>(STORE_CACHE, {
        key: item.key,
        data: notas,
        updated_at: Date.now(),
      });
      totais.set(romaneioId, {
        total: notas.length,
        concluidas: notas.filter((n) => NF_STATUS_FINAIS.includes(n.status)).length,
      });
    }

    const romaneios = await obterRomaneiosCache();
    if (romaneios) {
      await salvarRomaneiosCache(
        romaneios.map((r) => {
          const contagem = totais.get(r.id);
          return contagem ? { ...r, ...contagem } : r;
        }),
      );
    }
  } catch {
    // Best-effort: Realtime/router.refresh ainda reconciliam com o servidor.
  }
}

/** Limpa todo o cache de notas/romaneios. */
export async function limparCacheNotas(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await idbClear(STORE_CACHE);
  } catch {
    // Best-effort
  }
}

