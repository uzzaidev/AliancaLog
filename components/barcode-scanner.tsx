"use client";

// Scanner de código de barras do DANFE.
//
// POR QUE ESTE ARQUIVO É ASSIM (rodada de 09/09, em campo, no iPhone)
//
// O `@zxing/library` (JS puro, em modo de manutenção) decodificava o CODE-128
// **Set C** como **Set B**: a chave `4326092130…1366` chegava como
// `K:)5>;7 !/W * "Nu0Ot-b` e a bipagem dizia "nota não encontrada" numa NF que
// existia. Quando acertava o subconjunto, entregava quadro parcial ("505584",
// 6 dígitos de 44). E era lento: o motorista tinha que aproximar e afastar.
//
// O iOS não tem `BarcodeDetector` — nenhum navegador de iPhone tem, porque
// todos usam WebKit. Então o caminho de quem faz isso a sério é decodificador
// nativo compilado em WebAssembly. Aqui: ZXing-C++ via `zxing-wasm`.
//
// AS QUATRO COISAS QUE FAZEM SER RÁPIDO
//   1. Decodificador WASM (ZXing-C++), não o port JS.
//   2. Câmera em ALTA resolução — a chave tem 44 dígitos em Code-128, é um
//      código denso; a 640×480 as barras não chegam a um pixel.
//   3. Recorte da faixa central (ROI) antes de decodificar, em vez do quadro
//      inteiro: menos pixels para varrer e sem distração das bordas.
//   4. Só o formato Code-128. Procurar 15 formatos por quadro é o que faz o
//      leitor "pensar" com o código já na frente dele.
import { useCallback, useEffect, useRef, useState } from "react";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

// A faixa útil: um código de barras é largo e baixo. Recortar nessa proporção
// tira o que não interessa e é o que a mira na tela promete ao motorista.
const ROI_LARGURA = 0.92;
const ROI_ALTURA = 0.34;
// ~12 leituras/s. Mais que isso só esquenta o aparelho: o gargalo é o foco da
// câmera, não o decodificador.
const INTERVALO_MS = 80;

export function BarcodeScanner({
  onResult,
  onError,
}: {
  onResult: (text: string) => void;
  onError?: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [temLanterna, setTemLanterna] = useState(false);
  const [lanterna, setLanterna] = useState(false);

  const alternarLanterna = useCallback(async () => {
    const track = trackRef.current;
    if (!track) return;
    const novo = !lanterna;
    try {
      // `torch` ainda não está no lib.dom padrão.
      await track.applyConstraints({
        advanced: [{ torch: novo } as MediaTrackConstraintSet],
      });
      setLanterna(novo);
    } catch {
      /* aparelho sem lanterna controlável */
    }
  }, [lanterna]);

  useEffect(() => {
    let parado = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function iniciar() {
      const video = videoRef.current;
      if (!video) return;

      try {
        // Traseira, alta resolução e foco contínuo. `ideal` (não `exact`) para
        // o aparelho entregar o que conseguir em vez de recusar a câmera.
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            // Só o Chrome Android respeita; nos outros é ignorado sem erro.
            focusMode: "continuous",
          } as MediaTrackConstraints,
        });
        if (parado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = track.getCapabilities?.() as
          | (MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number } })
          | undefined;
        if (caps?.torch) setTemLanterna(true);
        // Zoom leve ajuda a "encher" o quadro com o código sem o motorista ter
        // de chegar perto. Só onde o hardware expõe (Chromium).
        if (caps?.zoom && caps.zoom.max >= 2) {
          try {
            await track.applyConstraints({
              advanced: [{ zoom: Math.min(1.6, caps.zoom.max) } as MediaTrackConstraintSet],
            });
          } catch {
            /* sem zoom controlável */
          }
        }

        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();

        // Canvas do recorte: alocado uma vez, redimensionado ao primeiro quadro.
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("sem canvas 2d");

        const BD = (
          window as unknown as {
            BarcodeDetector?: new (o?: unknown) => BarcodeDetectorLike;
          }
        ).BarcodeDetector;

        // Chromium (Android) tem detector nativo — é o mais rápido de todos.
        // Fora dele (todo iPhone), ZXing-C++ em WASM.
        const detector = BD ? new BD({ formats: ["code_128"] }) : null;
        let lerWasm:
          | ((img: ImageData) => Promise<{ text: string }[]>)
          | null = null;

        if (!detector) {
          const { readBarcodes, prepareZXingModule } = await import("zxing-wasm/reader");
          // Servido do nosso domínio, não do CDN: o Service Worker consegue
          // cachear e o motorista não depende de rede para bipar.
          prepareZXingModule({
            overrides: { locateFile: () => "/wasm/zxing_reader.wasm" },
          });
          lerWasm = (img) =>
            readBarcodes(img, {
              formats: ["Code128"],
              tryHarder: true,
              maxNumberOfSymbols: 1,
            }) as Promise<{ text: string }[]>;
        }

        const tick = async () => {
          if (parado) return;
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw && vh) {
            const rw = Math.round(vw * ROI_LARGURA);
            const rh = Math.round(vh * ROI_ALTURA);
            const rx = Math.round((vw - rw) / 2);
            const ry = Math.round((vh - rh) / 2);
            if (canvas.width !== rw || canvas.height !== rh) {
              canvas.width = rw;
              canvas.height = rh;
            }
            ctx.drawImage(video, rx, ry, rw, rh, 0, 0, rw, rh);
            try {
              if (detector) {
                const codigos = await detector.detect(canvas);
                if (codigos[0]?.rawValue) onResult(codigos[0].rawValue);
              } else if (lerWasm) {
                const achados = await lerWasm(ctx.getImageData(0, 0, rw, rh));
                if (achados[0]?.text) onResult(achados[0].text);
              }
            } catch {
              /* quadro sem código legível — segue */
            }
          }
          timer = setTimeout(tick, INTERVALO_MS);
        };
        tick();
      } catch {
        onError?.(
          "Não foi possível acessar a câmera. Verifique a permissão e use HTTPS.",
        );
      }
    }

    iniciar();
    return () => {
      parado = true;
      if (timer) clearTimeout(timer);
      trackRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult, onError]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        className="aspect-[4/3] w-full object-cover"
        muted
        playsInline
      />

      {/* Mira: mostra ONDE encostar o código. Sem isso o motorista aproxima e
          afasta tentando adivinhar o que a câmera está lendo. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="rounded-md border-2 border-brand/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          style={{ width: `${ROI_LARGURA * 100}%`, height: `${ROI_ALTURA * 100}%` }}
        />
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs font-medium text-white/90">
        Encoste o código de barras dentro da faixa
      </p>

      {temLanterna && (
        <button
          type="button"
          onClick={alternarLanterna}
          className={`absolute right-2 top-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
            lanterna ? "bg-brand text-white" : "bg-black/60 text-white"
          }`}
        >
          {lanterna ? "Luz ligada" : "Luz"}
        </button>
      )}
    </div>
  );
}
