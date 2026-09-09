import type { ReaderOptions } from "zxing-wasm/reader";

// Não reduzir a imagem: as barras estreitas do DANFE precisam dos pixels originais.
export const SCANNER_OPTIONS: ReaderOptions = {
  formats: ["Code128"],
  tryHarder: true,
  tryRotate: true,
  tryInvert: false,
  tryDownscale: false,
  minLineCount: 2,
  maxNumberOfSymbols: 4,
  returnErrors: false,
};

export const SCANNER_BAND_HEIGHT = 0.5;

// A prévia usa a proporção original do vídeo. A faixa corresponde ao recorte;
// preservamos TODA a largura, incluindo as margens claras do código.
// Um quadro completo a cada três tentativas também procura fora da mira.
export function scannerRegion(width: number, height: number, attempt: number) {
  const h = attempt % 3 === 0 ? height : Math.round(height * SCANNER_BAND_HEIGHT);
  return { x: 0, y: Math.floor((height - h) / 2), width, height: h };
}
