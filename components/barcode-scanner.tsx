"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { IconCamera, IconRefresh } from "@tabler/icons-react";
import { extrairChaveDaCamera } from "@/lib/nfe";
import { prepareScannerReader, readScannerImage } from "@/lib/scanner-reader";
import { SCANNER_BAND_HEIGHT, scannerRegion } from "@/lib/scanner-config";

type CameraCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  focusMode?: string[];
  zoom?: { min: number; max: number; step: number };
};

export function BarcodeScanner({ onResult, onError }: {
  onResult: (text: string) => void;
  onError?: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const mountedRef = useRef(false);
  const photoRef = useRef(false);
  const [session, setSession] = useState(0);
  const [cameraId, setCameraId] = useState("");
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [caps, setCaps] = useState<CameraCapabilities>({});
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(16 / 9);
  const [status, setStatus] = useState("Preparando leitor e câmera…");
  const [failure, setFailure] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState("Iniciando");

  // Callbacks inline dos pais não podem reiniciar a câmera a cada render.
  const emitResult = useEffectEvent((text: string) => onResult(text));
  const emitError = useEffectEvent((message: string) => onError?.(message));

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const video = videoRef.current;
    if (!video) return;

    const stop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (trackRef.current === stream?.getVideoTracks()[0]) trackRef.current = null;
    };
    const resume = () => {
      if (!stopped && !document.hidden && video.srcObject) {
        void video.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", resume);

    async function start() {
      let stage = "camera";
      // Download e permissão em paralelo; tratar rejeição mesmo se câmera falhar.
      const readerReady = prepareScannerReader().then(() => null, (error: unknown) => ({ error }));
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(cameraId ? { deviceId: { exact: cameraId } } : { facingMode: { ideal: "environment" } }),
            width: { ideal: 1920 }, height: { ideal: 1080 },
          },
        });
        if (stopped) { stop(); return; }
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const capabilities = (track.getCapabilities?.() ?? {}) as CameraCapabilities;
        setCaps(capabilities);
        setTorch(false);
        setZoom((track.getSettings() as MediaTrackSettings & { zoom?: number }).zoom ?? 1);
        if (capabilities.focusMode?.includes("continuous")) {
          try {
            await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] });
          } catch { /* permanece o foco automático padrão */ }
        }
        if (stopped) { stop(); return; }
        void navigator.mediaDevices.enumerateDevices().then((devices) => {
          if (!stopped) setCameras(devices.filter((device) => device.kind === "videoinput"));
        }).catch(() => {});
        video!.srcObject = stream;
        await video!.play();
        stage = "reader";
        const initialized = await readerReady;
        if (stopped) { stop(); return; }
        if (initialized) throw initialized.error;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas 2D indisponível");
        let attempt = 0;
        let lastVideoTime = -1;
        let lastDiagnostic = 0;
        let lastSize = "";
        let lastCode = "";
        let lastResultAt = 0;
        setStatus("Enquadre o código inteiro, com espaço nas duas pontas.");

        const tick = async () => {
          if (stopped) return;
          if (!photoRef.current && !document.hidden && video!.readyState >= 2 && video!.currentTime !== lastVideoTime) {
            lastVideoTime = video!.currentTime;
            try {
              const width = video!.videoWidth;
              const height = video!.videoHeight;
              const size = width + "×" + height;
              if (size !== lastSize) { setAspect(width / height); lastSize = size; }
              const region = scannerRegion(width, height, attempt++);
              if (canvas.width !== region.width || canvas.height !== region.height) {
                canvas.width = region.width; canvas.height = region.height;
              }
              context.drawImage(video!, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
              const started = performance.now();
              const results = await readScannerImage(context.getImageData(0, 0, canvas.width, canvas.height));
              if (stopped) return;
              if (photoRef.current) { timer = setTimeout(tick, 80); return; }
              const key = results.map((result) => extrairChaveDaCamera(result.text)).find(Boolean);
              const now = performance.now();
              if (now - lastDiagnostic > 1000) {
                setDiagnostic("Leitor 2 · ZXing WASM pronto · " + size + " · " + Math.round(now - started) + " ms · " + attempt + " quadros");
                lastDiagnostic = now;
              }
              if (key) {
                setPhotoMessage(null);
                setStatus("Código completo lido.");
                if (key !== lastCode || now - lastResultAt > 2500) {
                  lastCode = key; lastResultAt = now;
                  emitResult(key);
                }
              } else if (results.length) {
                setStatus("Leitura incompleta. Mantenha as duas pontas do código visíveis.");
              }
            } catch (error) {
              if (!stopped) {
                console.error("[scanner] Falha na decodificação", error);
                const message = "O leitor parou. Toque em Tentar novamente ou digite o número da NF.";
                setFailure(message); emitError(message); stop();
              }
              return;
            }
          }
          if (!stopped) timer = setTimeout(tick, 80);
        };
        void tick();
      } catch (error) {
        stop();
        if (stopped) return;
        console.error("[scanner] Falha ao iniciar " + stage, error);
        const message = stage === "reader"
          ? "Não foi possível carregar o leitor. Verifique a conexão e tente novamente."
          : "Não foi possível abrir a câmera. Verifique a permissão ou use uma foto do código.";
        setFailure(message); emitError(message);
      }
    }
    void start();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      stop();
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [session, cameraId]);

  async function readPhoto(file: File) {
    if (photoRef.current) return;
    photoRef.current = true;
    setPhotoBusy(true);
    setPhotoMessage(null);
    try {
      // File preserva resolução; não passa pela compressão de canhotos.
      const results = await readScannerImage(file);
      if (!mountedRef.current) return;
      const key = results.map((result) => extrairChaveDaCamera(result.text)).find(Boolean);
      if (key) { setPhotoMessage("Código completo lido."); onResult(key); }
      else setPhotoMessage("Não consegui ler a foto. Fotografe o código inteiro, nítido e sem reflexo.");
    } catch (error) {
      console.error("[scanner] Falha ao ler foto", error);
      if (mountedRef.current) setPhotoMessage("Não consegui abrir essa foto. Tente uma nova foto ou digite a NF.");
    } finally {
      photoRef.current = false;
      if (mountedRef.current) {
        setPhotoBusy(false);
        void videoRef.current?.play().catch(() => {});
      }
    }
  }

  function restart() {
    setFailure(null); setPhotoMessage(null); setStatus("Preparando leitor e câmera…"); setSession((value) => value + 1);
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg bg-dark">
        <video ref={videoRef} className="block w-full object-contain" style={{ aspectRatio: aspect }} muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-full border-y-2 border-brand/90" style={{ height: SCANNER_BAND_HEIGHT * 100 + "%" }} />
        </div>
        {caps.torch && !failure && (
          <button type="button" className="touch-target absolute right-2 top-2 rounded-lg bg-dark/80 px-3 text-sm text-surface"
            onClick={async () => {
              const track = trackRef.current;
              if (!track) return;
              try {
                await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
                setTorch(!torch);
              } catch { setStatus("Não foi possível ligar a luz nesta câmera."); }
            }}>
            {torch ? "Desligar luz" : "Ligar luz"}
          </button>
        )}
      </div>
      <p role="status" className="text-xs text-muted">{photoBusy ? "Lendo foto…" : photoMessage ?? failure ?? status}</p>
      {failure && (
        <button type="button" onClick={restart} className="touch-target flex items-center gap-2 rounded-lg border border-line px-3 text-sm text-ink">
          <IconRefresh size={18} /> Tentar novamente
        </button>
      )}
      <label className="touch-target flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm text-ink">
        <IconCamera size={18} /> Ler foto do código
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={photoBusy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void readPhoto(file);
          }} />
      </label>
      <details className="text-xs text-muted">
        <summary className="touch-target flex cursor-pointer items-center">Ajustar câmera / diagnóstico</summary>
        <p className="mb-2">{diagnostic}</p>
        {cameras.length > 1 && (
          <label className="block">Câmera
            <select className="touch-target mt-1 w-full rounded-lg border border-line bg-surface px-2 text-ink" value={cameraId}
              onChange={(event) => { setCameraId(event.target.value); restart(); }}>
              <option value="">Traseira automática</option>
              {cameras.map((camera, index) => <option key={camera.deviceId} value={camera.deviceId}>{camera.label || "Câmera " + (index + 1)}</option>)}
            </select>
          </label>
        )}
        {caps.zoom && caps.zoom.max > caps.zoom.min && (
          <label className="mt-2 block">Zoom: {zoom.toFixed(1)}×
            <input aria-label="Zoom da câmera" type="range" className="touch-target w-full" min={caps.zoom.min} max={Math.max(caps.zoom.min, Math.min(caps.zoom.max, 3))} step={caps.zoom.step || 0.1} value={zoom}
              onChange={async (event) => {
                const track = trackRef.current;
                const value = Number(event.target.value);
                if (!track) return;
                try {
                  await track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] }); setZoom(value);
                } catch { setStatus("Zoom indisponível nesta câmera."); }
              }} />
          </label>
        )}
      </details>
    </div>
  );
}
