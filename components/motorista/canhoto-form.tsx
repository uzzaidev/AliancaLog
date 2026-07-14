"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { comprimirImagem } from "@/lib/offline/image";
import { enfileirar } from "@/lib/offline/queue";
import { flushFila, notificarFila } from "@/lib/offline/sync";
import {
  OCORRENCIA_LABEL,
  type CanhotoStatus,
  type NotaMotorista,
  type OcorrenciaTipo,
} from "@/lib/types";

const STATUS_BTNS: {
  key: CanhotoStatus;
  label: string;
  cls: string;
}[] = [
  { key: "aceita", label: "✅  Nota aceita", cls: "bg-success text-white" },
  { key: "recusada", label: "❌  Nota recusada", cls: "bg-danger text-white" },
  { key: "ocorrencia", label: "⚠️  Ocorrência", cls: "bg-warning text-white" },
];

const TIPOS = Object.keys(OCORRENCIA_LABEL) as OcorrenciaTipo[];

export function CanhotoForm({ nf }: { nf: NotaMotorista }) {
  const router = useRouter();
  const [foto, setFoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<CanhotoStatus | null>(null);
  const [tipo, setTipo] = useState<OcorrenciaTipo>("item_faltando");
  const [desc, setDesc] = useState("");
  // Observação livre (opcional) para aceita/recusada.
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  // Carimbo de localização do registro (best-effort — segue sem GPS se o
  // motorista negar ou não houver sinal; nunca bloqueia o registro).
  const gpsRef = useRef<{ lat: number; lng: number; prec: number } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        gpsRef.current = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          prec: p.coords.accuracy,
        };
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 },
    );
  }, []);

  async function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    const blob = await comprimirImagem(file);
    setFoto(blob);
    setPreview(URL.createObjectURL(blob));
  }

  async function confirmar() {
    setErro(null);
    if (!status) return setErro("Selecione o status da entrega.");
    // Foto obrigatória em TODOS os status — é a prova da entrega/ocorrência.
    if (!foto) return setErro("Foto é obrigatória para registrar.");
    if (status === "ocorrencia" && !desc.trim())
      return setErro("Descreva a ocorrência.");

    setEnviando(true);
    try {
      await enfileirar({
        client_id: crypto.randomUUID(),
        nf_id: nf.id,
        numero_nf: nf.numero_nf,
        status,
        ocorrencia_tipo: status === "ocorrencia" ? tipo : undefined,
        ocorrencia_desc: status === "ocorrencia" ? desc.trim() : undefined,
        observacao:
          status !== "ocorrencia" && obs.trim() ? obs.trim() : undefined,
        foto: foto ?? undefined,
        lat: gpsRef.current?.lat,
        lng: gpsRef.current?.lng,
        gps_precisao: gpsRef.current?.prec,
        criado_em: Date.now(),
      });
      notificarFila();
      await flushFila();
      setResultado(
        navigator.onLine
          ? "Registrado! ✅"
          : "Salvo offline — enviando quando tiver sinal.",
      );
    } catch {
      setErro("Não consegui salvar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  // Mensagem do que ainda falta para poder enviar (foto é sempre obrigatória).
  const faltando = !status
    ? "Selecione o status da entrega."
    : !foto
      ? "Tire a foto para confirmar."
      : status === "ocorrencia" && !desc.trim()
        ? "Descreva a ocorrência."
        : null;

  if (resultado) {
    return (
      <Card className="space-y-4 p-6 text-center">
        <p className="text-lg font-semibold text-success">{resultado}</p>
        <p className="text-sm text-muted">NF {nf.numero_nf}</p>
        <Button className="w-full" onClick={() => router.back()}>
          Voltar para a lista
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="font-semibold text-ink">NF {nf.numero_nf}</div>
        <div className="text-sm text-muted">
          {nf.destinatario_nome}
          <br />
          {nf.destinatario_endereco}
          {nf.cidade ? `, ${nf.cidade}` : ""}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <label className="block">
          <span className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            Foto do canhoto
            <span className="rounded-full bg-danger-50 px-1.5 py-0.5 text-xs font-semibold text-danger">
              obrigatória
            </span>
          </span>
          {preview ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Canhoto"
                className="max-h-64 w-full rounded-lg object-contain bg-black"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  setFoto(null);
                  setPreview(null);
                }}
              >
                Refazer foto
              </Button>
            </div>
          ) : (
            <span className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-line text-sm text-muted">
              📷 Toque para tirar a foto
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFoto}
          />
        </label>
      </Card>

      <div className="grid grid-cols-1 gap-2">
        {STATUS_BTNS.map((b) => (
          <button
            key={b.key}
            onClick={() => setStatus(b.key)}
            className={`touch-target rounded-xl px-4 text-base font-semibold transition ${
              status === b.key
                ? b.cls
                : "bg-surface text-ink ring-1 ring-inset ring-line"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {(status === "aceita" || status === "recusada") && (
        <Card className="p-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Observação (opcional)
            </span>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={2}
              placeholder="Ex.: entregue ao porteiro; recebedor João"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
            />
          </label>
        </Card>
      )}

      {status === "ocorrencia" && (
        <Card className="space-y-3 p-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Tipo de ocorrência
            </span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as OcorrenciaTipo)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {OCORRENCIA_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Descrição (obrigatória)
            </span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Ex.: faltou 2 caixas do produto X"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
            />
          </label>
        </Card>
      )}

      {erro && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      {!erro && faltando && (
        <p className="text-center text-sm text-muted">{faltando}</p>
      )}

      <Button
        className="w-full"
        onClick={confirmar}
        disabled={enviando || !!faltando}
      >
        {enviando ? "Salvando…" : "Confirmar e enviar"}
      </Button>
    </div>
  );
}
