"use client";

// Lista do portal do cliente (Spoke Connect): cada card expande inline com a
// linha do tempo e a faixa de foto do canhoto (carregadas sob demanda).
import { useState } from "react";
import Link from "next/link";
import {
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconClock,
  IconPhoto,
  IconEye,
  IconChevronDown,
} from "@tabler/icons-react";
import { Card } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Timeline, type TimelineStep } from "@/components/ui/timeline";
import { getComprovanteCliente } from "@/app/cliente/notas/actions";
import {
  OCORRENCIA_LABEL,
  type ComprovanteDetalhe,
  type NotaStatus,
} from "@/lib/types";
import type { NotaCliente } from "@/lib/data/cliente";

type CacheVal = ComprovanteDetalhe | null | "loading" | undefined;

const ICONE: Record<
  NotaStatus,
  { icon: typeof IconClock; box: string; fg: string }
> = {
  aceita: { icon: IconCircleCheck, box: "bg-success-50", fg: "text-success" },
  recusada: { icon: IconCircleX, box: "bg-danger-50", fg: "text-danger" },
  ocorrencia: {
    icon: IconAlertTriangle,
    box: "bg-warning-50",
    fg: "text-warning",
  },
  em_rota: { icon: IconClock, box: "bg-info-50", fg: "text-info" },
  pendente: { icon: IconClock, box: "bg-gray-100", fg: "text-gray-400" },
};

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Constrói os passos da timeline a partir do comprovante + status atual.
function montarTimeline(c: ComprovanteDetalhe): TimelineStep[] {
  const steps: TimelineStep[] = [
    { label: "NF registrada", time: dataHora(c.criado_em), tone: "done" },
    ...c.ocorrencias.map((o) => ({
      label: `${OCORRENCIA_LABEL[o.tipo]}${o.descricao ? ` — ${o.descricao}` : ""}`,
      time: dataHora(o.criado_em),
      tone: "danger" as const,
    })),
  ];
  if (c.entregue_em) {
    const finais: Record<string, { label: string; tone: TimelineStep["tone"] }> =
      {
        aceita: { label: "Canhoto aceito", tone: "done" },
        recusada: { label: "Entrega recusada pelo destinatário", tone: "danger" },
        ocorrencia: { label: "Entrega com ocorrência", tone: "danger" },
      };
    const f = finais[c.status] ?? { label: "Canhoto registrado", tone: "done" };
    steps.push({ label: f.label, time: dataHora(c.entregue_em), tone: f.tone });
  } else {
    steps.push({ label: "Aguardando entrega", tone: "pending" });
  }
  return steps;
}

export function NotasListCliente({ notas }: { notas: NotaCliente[] }) {
  const [expandida, setExpandida] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, CacheVal>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function toggle(id: string) {
    if (expandida === id) return setExpandida(null);
    setExpandida(id);
    if (cache[id] === undefined) {
      setCache((c) => ({ ...c, [id]: "loading" }));
      const d = await getComprovanteCliente(id);
      setCache((c) => ({ ...c, [id]: d }));
    }
  }

  if (notas.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <IconPhoto size={30} className="text-gray-300" />
        <p className="text-sm text-muted">Nenhuma entrega para o filtro atual.</p>
        <Link
          href="/cliente/importar"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Enviar minhas NFs
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {notas.map((nf) => {
        const meta = ICONE[nf.status] ?? ICONE.pendente;
        const Icon = meta.icon;
        const aberto = expandida === nf.id;
        const comp = cache[nf.id];
        return (
          <div
            key={nf.id}
            className="overflow-hidden rounded-xl border border-line bg-surface transition hover:border-brand"
          >
            <button
              onClick={() => toggle(nf.id)}
              className="flex w-full items-start gap-3 p-3.5 text-left"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.box}`}
              >
                <Icon size={18} className={meta.fg} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-dark">NF {nf.numero_nf}</div>
                <div className="truncate text-sm text-gray-600">
                  {nf.destinatario_nome}
                  {nf.cidade ? ` — ${nf.cidade}` : ""}
                </div>
              </div>
              <IconChevronDown
                size={18}
                className={`mt-1 shrink-0 text-gray-400 transition-transform ${
                  aberto ? "rotate-180" : ""
                }`}
              />
            </button>

            {aberto && (
              <div className="border-t border-gray-100 bg-gray-50">
                {comp === "loading" || comp === undefined ? (
                  <p className="px-4 py-5 text-center text-sm text-muted">
                    Carregando…
                  </p>
                ) : comp === null ? (
                  <p className="px-4 py-5 text-center text-sm text-muted">
                    Detalhes indisponíveis.
                  </p>
                ) : (
                  <>
                    <div className="px-4 py-3.5">
                      <Timeline steps={montarTimeline(comp)} />
                    </div>
                    {comp.foto_url && (
                      <div className="flex items-center gap-3 border-t border-gray-100 bg-surface px-4 py-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand bg-brand-50">
                          <IconPhoto size={19} className="text-brand" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-dark">
                            Foto do canhoto
                          </div>
                          {comp.entregue_em && (
                            <div className="text-[11px] text-gray-400">
                              Registrada em {dataHora(comp.entregue_em)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setLightbox(comp.foto_url)}
                          className="flex items-center gap-1 text-sm font-bold text-brand"
                        >
                          <IconEye size={15} /> Ver
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Modal
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        title="Foto do canhoto"
      >
        {lightbox && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lightbox}
            alt="Canhoto"
            className="max-h-[70vh] w-full rounded-lg bg-black object-contain"
          />
        )}
      </Modal>
    </div>
  );
}
