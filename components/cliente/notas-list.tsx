"use client";

// Lista do portal do cliente (Spoke Connect): cada card expande inline com a
// linha do tempo e a faixa de foto do canhoto (carregadas sob demanda).
import { useState } from "react";
import Link from "next/link";
import {
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconDownload,
  IconClock,
  IconPhoto,
  IconEye,
  IconChevronDown,
} from "@tabler/icons-react";
import { Card } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Timeline, type TimelineStep } from "@/components/ui/timeline";
import { getComprovanteCliente } from "@/app/cliente/notas/actions";
import { EncerrarNota } from "@/components/cliente/encerrar-nota";
import {
  NF_STATUS_ENCERRADAS,
  NF_STATUS_FINAIS,
  OCORRENCIA_LABEL,
  type ComprovanteDetalhe,
  type NotaStatus,
} from "@/lib/types";
import type { NotaCliente } from "@/lib/data/cliente";
import { dataHoraSP } from "@/lib/date";

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
  // Entregue com pendência administrativa aberta (0030): visual de atenção,
  // não de erro — a entrega aconteceu, falta resolver o documento.
  pendencia: {
    icon: IconAlertTriangle,
    box: "bg-warning-50",
    fg: "text-warning",
  },
  em_rota: { icon: IconClock, box: "bg-info-50", fg: "text-info" },
  pendente: { icon: IconClock, box: "bg-gray-100", fg: "text-gray-400" },
  // Encerradas sem entrega (0031): cinza apagado, como a operação pediu —
  // ficam visíveis no histórico sem competir com as entregas ativas.
  substituida: { icon: IconCircleX, box: "bg-gray-100", fg: "text-gray-400" },
  cancelada: { icon: IconCircleX, box: "bg-gray-100", fg: "text-gray-400" },
};

// Fuso fixo da operação — ver o porquê em lib/date.ts (hidratação + hora correta).
const dataHora = dataHoraSP;

const TENTATIVA_META: Record<string, { label: string; tone: TimelineStep["tone"] }> = {
  aceita: { label: "Canhoto aceito", tone: "done" },
  recusada: { label: "Entrega recusada pelo destinatário", tone: "danger" },
  ocorrencia: { label: "Entrega com ocorrência", tone: "danger" },
};

// Constrói os passos da timeline a partir do comprovante. Usa c.tentativas (uma
// por tentativa de entrega) em vez de c.status/c.entregue_em: desde A-007 uma NF
// recusada/com ocorrência volta pro painel como "pendente" para nova tentativa,
// então o status/entregue_em da NF sozinhos não dizem mais o que aconteceu em
// cada tentativa — só o histórico em canhotos tem essa informação.
function montarTimeline(c: ComprovanteDetalhe): TimelineStep[] {
  const eventos = [
    { quando: c.criado_em, label: "NF registrada", tone: "done" as const },
    ...c.ocorrencias.map((o) => ({
      quando: o.criado_em,
      label: `${OCORRENCIA_LABEL[o.tipo]}${o.descricao ? ` — ${o.descricao}` : ""}`,
      tone: "danger" as const,
    })),
    ...c.ocorrencias.flatMap((o) =>
      o.resolvida_em
        ? [
            {
              quando: o.resolvida_em,
              label: `${OCORRENCIA_LABEL[o.tipo]} resolvida${o.resolucao ? ` — ${o.resolucao}` : ""}`,
              tone: "done" as const,
            },
          ]
        : [],
    ),
    ...c.tentativas.map((t) => {
      const meta = TENTATIVA_META[t.status] ?? { label: "Canhoto registrado", tone: "done" as const };
      return { quando: t.registrado_em, label: meta.label, tone: meta.tone };
    }),
  ].sort((a, b) => a.quando.localeCompare(b.quando));

  const steps: TimelineStep[] = eventos.map((e) => ({
    label: e.label,
    time: dataHora(e.quando),
    tone: e.tone,
  }));
  if (c.tentativas.length === 0) steps.push({ label: "Aguardando entrega", tone: "pending" });
  return steps;
}

export function NotasListCliente({ notas }: { notas: NotaCliente[] }) {
  const [expandida, setExpandida] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, CacheVal>>({});
  // Guarda a URL e o nome do arquivo: a Carol arquiva os canhotos por NF, então
  // o download precisa sair nomeado, não como "download.jpg".
  const [lightbox, setLightbox] = useState<{ url: string; nome: string } | null>(null);

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
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-3 p-10 text-center">
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
    <>
      <div className="gap-4 lg:columns-2 xl:columns-3">
        {notas.map((nf) => {
          const meta = ICONE[nf.status] ?? ICONE.pendente;
          const Icon = meta.icon;
          const aberto = expandida === nf.id;
          const comp = cache[nf.id];
          return (
          <div
            key={nf.id}
            className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-line bg-surface transition hover:border-brand"
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
                {/* O que aconteceu, direto na lista. Antes só existia o selo de
                    status: o cliente via "ocorrência" e precisava abrir NF por NF
                    para descobrir o motivo. */}
                {nf.ocorrencia && (
                  <div
                    className={`mt-1 flex items-start gap-1 text-xs font-medium ${
                      nf.ocorrencia.resolvida_em ? "text-success" : "text-danger"
                    }`}
                  >
                    {nf.ocorrencia.resolvida_em ? (
                      <IconCircleCheck size={13} className="mt-0.5 shrink-0" />
                    ) : (
                      <IconAlertTriangle size={13} className="mt-0.5 shrink-0" />
                    )}
                    <span className="min-w-0">
                      {OCORRENCIA_LABEL[nf.ocorrencia.tipo]}
                      {nf.ocorrencia.descricao && (
                        <span className="font-normal text-gray-600">
                          {" "}
                          — {nf.ocorrencia.descricao}
                        </span>
                      )}
                      {nf.ocorrencia.resolvida_em && (
                        <span className="block">
                          {nf.status === "aceita"
                            ? "Resolvida e nota aceita em "
                            : "Resolvida em "}
                          {dataHora(nf.ocorrencia.resolvida_em)}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <IconChevronDown
                size={18}
                className={`mt-1 shrink-0 text-gray-400 transition-transform ${
                  aberto ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Refaturar/cancelar só faz sentido no que ainda não foi entregue —
                a mesma regra que `nf_pode_encerrar()` aplica no banco (0031).
                Aqui é só para não oferecer o botão que a RPC recusaria. */}
            {!NF_STATUS_FINAIS.includes(nf.status) &&
              !NF_STATUS_ENCERRADAS.includes(nf.status) &&
              nf.status !== "pendencia" && <EncerrarNota nf={nf} />}

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
                    {comp.foto_chegada_url && (
                      <div className="flex items-center gap-3 border-t border-gray-100 bg-surface px-4 py-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand bg-brand-50">
                          <IconPhoto size={19} className="text-brand" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-dark">
                            Foto de chegada
                          </div>
                        </div>
                        <button
                          onClick={() => setLightbox({ url: comp.foto_chegada_url!, nome: `NF-${nf.numero_nf}-chegada.jpg` })}
                          className="flex items-center gap-1 text-sm font-bold text-brand"
                        >
                          <IconEye size={15} /> Ver
                        </button>
                      </div>
                    )}
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
                          onClick={() => setLightbox({ url: comp.foto_url!, nome: `NF-${nf.numero_nf}-canhoto.jpg` })}
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
      </div>

      <Modal
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        title="Foto do canhoto"
      >
        {lightbox && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt="Canhoto"
              className="max-h-[70vh] w-full rounded-lg bg-black object-contain"
            />
            {/* O parâmetro `download` faz o Storage responder com
                Content-Disposition: attachment. Sem ele o navegador só abre a
                imagem numa aba, e quem arquiva canhoto teria que salvar no
                botão direito, arquivo por arquivo. */}
            <a
              href={`${lightbox.url}&download=${encodeURIComponent(lightbox.nome)}`}
              className="flex touch-target w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-white hover:bg-brand-700"
            >
              <IconDownload size={17} /> Baixar foto
            </a>
          </div>
        )}
      </Modal>
    </>
  );
}
