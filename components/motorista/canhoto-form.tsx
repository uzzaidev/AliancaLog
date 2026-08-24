"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCamera,
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconMapPin,
  IconNavigation,
  IconRefresh,
} from "@tabler/icons-react";
import { Button, Card } from "@/components/ui";
import { comprimirImagem } from "@/lib/offline/image";
import { enderecoMapsUrl } from "@/lib/maps";
import {
  atualizarStatusNotaCache,
  obterNotaCache,
  salvarNotaCache,
} from "@/lib/offline/cache";
import { enfileirar, listarPendentes } from "@/lib/offline/queue";
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
  icon: typeof IconCircleCheck;
  cls: string;
}[] = [
  {
    key: "aceita",
    label: "Nota aceita",
    icon: IconCircleCheck,
    cls: "bg-success text-white border-success",
  },
  {
    key: "recusada",
    label: "Nota recusada",
    icon: IconCircleX,
    cls: "bg-danger text-white border-danger",
  },
  {
    key: "ocorrencia",
    label: "Ocorrência",
    icon: IconAlertTriangle,
    cls: "bg-warning text-white border-warning",
  },
];

const TIPOS = Object.keys(OCORRENCIA_LABEL) as OcorrenciaTipo[];

export function CanhotoForm({
  nf: initialNf,
  nfId,
}: {
  nf?: NotaMotorista | null;
  nfId?: string;
}) {
  const router = useRouter();
  const [nf, setNf] = useState<NotaMotorista | null>(initialNf ?? null);
  // Foto de chegada (A-010): separada da foto do canhoto, prova que o motorista
  // esteve no local mesmo quando a entrega não se conclui (ex.: cliente ausente).
  const [fotoChegada, setFotoChegada] = useState<Blob | null>(null);
  const [previewChegada, setPreviewChegada] = useState<string | null>(null);
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

  useEffect(() => {
    let ativo = true;
    async function sincronizarNota() {
      if (initialNf) {
        await salvarNotaCache(initialNf);
        if (ativo) setNf(initialNf);
      } else if (nfId) {
        const doCache = await obterNotaCache(nfId);
        if (ativo && doCache) {
          setNf(doCache);
        }
      }
    }
    sincronizarNota();
    return () => {
      ativo = false;
    };
  }, [initialNf, nfId]);

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

  async function onFotoChegada(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    const blob = await comprimirImagem(file);
    setFotoChegada(blob);
    setPreviewChegada(URL.createObjectURL(blob));
  }

  async function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    const blob = await comprimirImagem(file);
    setFoto(blob);
    setPreview(URL.createObjectURL(blob));
  }

  async function confirmar() {
    if (!nf) return setErro("Dados da NF não disponíveis.");
    setErro(null);
    if (!fotoChegada)
      return setErro("Foto de chegada é obrigatória para registrar.");
    if (!status) return setErro("Selecione o status da entrega.");
    // Foto obrigatória em TODOS os status — é a prova da entrega/ocorrência.
    if (!foto) return setErro("Foto do canhoto é obrigatória para registrar.");
    if (status === "ocorrencia" && !desc.trim())
      return setErro("Descreva a ocorrência.");

    setEnviando(true);
    try {
      const clientId = crypto.randomUUID();
      await enfileirar({
        client_id: clientId,
        nf_id: nf.id,
        numero_nf: nf.numero_nf,
        status,
        ocorrencia_tipo: status === "ocorrencia" ? tipo : undefined,
        ocorrencia_desc: status === "ocorrencia" ? desc.trim() : undefined,
        observacao:
          status !== "ocorrencia" && obs.trim() ? obs.trim() : undefined,
        foto: foto ?? undefined,
        foto_chegada: fotoChegada ?? undefined,
        lat: gpsRef.current?.lat,
        lng: gpsRef.current?.lng,
        gps_precisao: gpsRef.current?.prec,
        criado_em: Date.now(),
      });
      // Atualiza o cache local imediatamente para refletir na lista offline
      await atualizarStatusNotaCache(nf.id, status);
      notificarFila();
      await flushFila();
      // Só diz "Registrado" se ESTE item saiu mesmo da fila (o servidor confirmou).
      // Se continua na fila, foi salvo mas ainda não sincronizou.
      const aindaNaFila = (await listarPendentes()).some(
        (p) => p.client_id === clientId,
      );
      setResultado(
        aindaNaFila
          ? "Salvo — pendente de sincronização. Envia sozinho quando tiver sinal."
          : "Registrado!",
      );
    } catch {
      setErro("Não consegui salvar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }


  // Mensagem do que ainda falta para poder enviar (as duas fotos são sempre obrigatórias).
  const faltando = !fotoChegada
    ? "Tire a foto de chegada para continuar."
    : !status
      ? "Selecione o status da entrega."
      : !foto
        ? "Tire a foto do canhoto para confirmar."
        : status === "ocorrencia" && !desc.trim()
          ? "Descreva a ocorrência."
          : null;

  if (!nf) {
    return (
      <Card className="p-6 text-center text-sm text-muted">
        Carregando informações da NF…
      </Card>
    );
  }

  if (resultado) {
    return (
      <Card className="space-y-4 p-6 text-center">
        <IconCircleCheck size={44} className="mx-auto text-success" />
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
        <div className="text-[11px] font-medium text-gray-400">
          NF {nf.numero_nf}
        </div>
        <div className="font-semibold text-dark">{nf.destinatario_nome}</div>
        <div className="mt-1 flex items-start gap-1 text-sm text-muted">
          <IconMapPin size={13} className="mt-0.5 shrink-0 text-brand" />
          <span>
            {nf.destinatario_endereco}
            {nf.cidade ? `, ${nf.cidade}` : ""}
          </span>
        </div>
        <a
          href={enderecoMapsUrl(nf)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex touch-target w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium text-brand active:bg-canvas"
        >
          <IconNavigation size={16} /> Abrir no Maps
        </a>
      </Card>

      <Card className="space-y-3 p-4">
        <label className="block">
          <span className="mb-2 flex items-center gap-1.5 text-sm font-medium">
            1. Foto de chegada
            <span className="rounded-full bg-danger-50 px-1.5 py-0.5 text-xs font-semibold text-danger">
              obrigatória
            </span>
          </span>
          <span className="mb-2 block text-xs text-muted">
            Comprova que você esteve no local — tire antes de bater na porta.
          </span>
          {previewChegada ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewChegada}
                alt="Chegada no local"
                className="max-h-64 w-full rounded-lg object-contain bg-black"
              />
              <Button
                variant="secondary"
                onClick={() => {
                  setFotoChegada(null);
                  setPreviewChegada(null);
                }}
              >
                <IconRefresh size={17} /> Refazer foto
              </Button>
            </div>
          ) : (
            <span className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand bg-brand-50 text-sm font-medium text-brand">
              <IconCamera size={26} /> Toque para abrir a câmera
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFotoChegada}
          />
        </label>
      </Card>

      {fotoChegada && (
        <>
          <Card className="space-y-3 p-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                2. Foto do canhoto
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
                    <IconRefresh size={17} /> Refazer foto
                  </Button>
                </div>
              ) : (
                <span className="flex h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand bg-brand-50 text-sm font-medium text-brand">
                  <IconCamera size={26} /> Toque para abrir a câmera
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
            {STATUS_BTNS.map((b) => {
              const Icon = b.icon;
              return (
                <button
                  key={b.key}
                  onClick={() => setStatus(b.key)}
                  className={`touch-target flex items-center justify-center gap-2 rounded-xl border px-4 text-base font-semibold transition ${
                    status === b.key
                      ? b.cls
                      : "border-line bg-surface text-ink"
                  }`}
                >
                  <Icon size={20} /> {b.label}
                </button>
              );
            })}
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
        </>
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
