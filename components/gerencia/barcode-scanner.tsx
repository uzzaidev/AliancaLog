"use client";

// Scanner de código de barras. Usa a API nativa BarcodeDetector quando disponível
// (Chrome/Android — o caso do celular) e cai para @zxing/library nos demais.
// Requer HTTPS e permissão de câmera. Dispara onResult com o texto lido.
import { useEffect, useRef } from "react";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};

export function BarcodeScanner({
  onResult,
  onError,
}: {
  onResult: (text: string) => void;
  onError?: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxingReset: (() => void) | null = null;

    async function start() {
      const video = videoRef.current;
      if (!video) return;

      const BD = (
        window as unknown as { BarcodeDetector?: new (o?: unknown) => BarcodeDetectorLike }
      ).BarcodeDetector;

      try {
        if (BD) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          if (stopped) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          video.srcObject = stream;
          await video.play();

          const detector = new BD({
            formats: ["code_128", "code_39", "ean_13", "ean_8", "qr_code"],
          });
          const tick = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(video);
              if (codes[0]?.rawValue) onResult(codes[0].rawValue);
            } catch {
              /* frame sem código */
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/library");
          const reader = new BrowserMultiFormatReader();
          zxingReset = () => reader.reset();
          await reader.decodeFromVideoDevice(null, video, (result) => {
            if (!stopped && result) onResult(result.getText());
          });
        }
      } catch {
        onError?.(
          "Não foi possível acessar a câmera. Verifique a permissão e use HTTPS.",
        );
      }
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      try {
        zxingReset?.();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult, onError]);

  return (
    <video
      ref={videoRef}
      className="aspect-video w-full rounded-lg bg-black object-cover"
      muted
      playsInline
    />
  );
}
