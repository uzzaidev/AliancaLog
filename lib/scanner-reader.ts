import { SCANNER_OPTIONS } from "./scanner-config";

let readerPromise: Promise<typeof import("zxing-wasm/reader")> | undefined;

/** Inicializa uma vez, com timeout, erro observável e binário ligado à versão JS. */
export function prepareScannerReader() {
  if (!readerPromise) {
    readerPromise = (async () => {
      const reader = await import("zxing-wasm/reader");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      try {
        const response = await fetch(`/wasm/zxing_reader.wasm?v=${reader.ZXING_WASM_SHA256}`, {
          signal: controller.signal,
          redirect: "error",
        });
        if (!response.ok) throw new Error(`Leitor indisponível (HTTP ${response.status})`);
        const wasmBinary = await response.arrayBuffer();
        const magic = new Uint8Array(wasmBinary, 0, Math.min(4, wasmBinary.byteLength));
        if (magic.join(",") !== "0,97,115,109") throw new Error("Resposta não contém WebAssembly");
        await reader.prepareZXingModule({ overrides: { wasmBinary }, fireImmediately: true });
        return reader;
      } catch (error) {
        reader.purgeZXingModule();
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    })().catch((error) => {
      readerPromise = undefined;
      throw error;
    });
  }
  return readerPromise;
}

export async function readScannerImage(image: ImageData | File) {
  const reader = await prepareScannerReader();
  return reader.readBarcodes(image, SCANNER_OPTIONS);
}
