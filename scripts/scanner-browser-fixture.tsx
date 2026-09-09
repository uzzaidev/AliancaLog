import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BarcodeScanner } from "../components/barcode-scanner";

declare global {
  interface Window {
    cameraOpens: number;
    cameraTracks: MediaStreamTrack[];
    cameraPattern: "valid" | "partial";
    releaseCamera?: () => void;
  }
}

window.cameraOpens = 0;
window.cameraTracks = [];
window.cameraPattern = "partial";
// O WebKit distribuído para Windows não expõe getUserMedia. Nesse ambiente
// testamos apenas foto/WASM e permissão negada, não simulamos câmera iOS.
if (!navigator.mediaDevices) {
  Object.defineProperty(navigator, "mediaDevices", { value: {} });
}
const patterns: Record<string, HTMLImageElement> = {};
for (const name of ["valid", "partial"]) {
  const image = new Image();
  image.src = "/" + name + ".png";
  await image.decode();
  patterns[name] = image;
}

// Vídeo de verdade vindo de canvas, com código fora da faixa central.
// Não simulamos o retorno do decodificador: o WASM recebe os pixels.
Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
  value: async () => {
    window.cameraOpens++;
    if (location.search.includes("denied")) throw new DOMException("Denied", "NotAllowedError");
    const canvas = document.createElement("canvas");
    canvas.width = 1920; canvas.height = 1080;
    const context = canvas.getContext("2d")!;
    const paint = () => {
      context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(patterns[window.cameraPattern], 35, 35);
    };
    paint();
    const timer = setInterval(paint, 60);
    const stream = canvas.captureStream(15);
    const track = stream.getVideoTracks()[0];
    const originalStop = track.stop.bind(track);
    track.stop = () => { clearInterval(timer); originalStop(); };
    window.cameraTracks.push(track);
    if (location.search.includes("delayed")) await new Promise<void>((resolve) => { window.releaseCamera = resolve; });
    return stream;
  },
});

function Fixture() {
  const [open, setOpen] = useState(true);
  const [revision, setRevision] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState("");
  return <main>
    <button onClick={() => setRevision(revision + 1)}>Atualizar pai</button>
    <button onClick={() => setOpen(!open)}>{open ? "Fechar" : "Abrir"}</button>
    <button onClick={() => { window.cameraPattern = "valid"; }}>Código válido</button>
    <div data-testid="revision">{revision}</div>
    <div data-testid="results">{results.join(",")}</div>
    <div data-testid="error">{error}</div>
    {open && <BarcodeScanner
      onResult={(text) => setResults((old) => [...old, text])}
      onError={(message) => setError(message)} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
