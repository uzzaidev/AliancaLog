"use client";

// Lista de ocorrências da gerência com o fluxo de resolução (migration 0029).
import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconAlertTriangle,
  IconCamera,
  IconCheck,
  IconCircleCheck,
  IconClockExclamation,
  IconMapPin,
  IconRefresh,
} from "@tabler/icons-react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { resolverOcorrencia } from "@/app/gerencia/ocorrencias/actions";
import { OCORRENCIA_LABEL, OCORRENCIA_PENDENCIA, type OcorrenciaTipo } from "@/lib/types";
import { dataHoraSP, hojeSP } from "@/lib/date";
import type { OcorrenciaRow } from "@/lib/data/ocorrencias";

// Dias em aberto a partir dos quais a pendência ganha destaque. Mesmo espírito
// do alerta de NF parada (A-008): o que envelhece precisa saltar aos olhos.
const DIAS_ALERTA = 7;

const SITUACOES = [
  { chave: "abertas", label: "Abertas" },
  { chave: "resolvidas", label: "Resolvidas" },
  { chave: "todas", label: "Todas" },
] as const;

export function OcorrenciasList({
  ocorrencias,
  situacao,
  tipo,
}: {
  ocorrencias: OcorrenciaRow[];
  situacao: string;
  tipo: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [resolvendo, setResolvendo] = useState<OcorrenciaRow | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function irPara(chave: string, valor: string) {
    const p = new URLSearchParams(params.toString());
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    router.push(`/gerencia/ocorrencias?${p.toString()}`);
  }

  function fechar() {
    setResolvendo(null);
    setFoto(null);
    setPreview(null);
    setErro(null);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resolvendo) return;
    const form = new FormData(e.currentTarget);
    form.set("id", resolvendo.id);
    form.set("tipo", resolvendo.tipo);
    if (foto) form.set("foto", foto);
    start(async () => {
      setErro(null);
      const r = await resolverOcorrencia(form);
      if (r.error) return setErro(r.error);
      fechar();
      router.refresh();
    });
  }

  const abertas = ocorrencias.filter((o) => !o.resolvida_em).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {SITUACOES.map((s) => (
          <button
            key={s.chave}
            onClick={() => irPara("situacao", s.chave)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              situacao === s.chave
                ? "bg-brand text-white"
                : "bg-surface text-muted ring-1 ring-inset ring-line hover:text-ink"
            }`}
          >
            {s.label}
            {s.chave === "abertas" && abertas > 0 && situacao === "abertas" && (
              <span className="ml-1.5 opacity-80">({abertas})</span>
            )}
          </button>
        ))}

        <select
          value={tipo}
          onChange={(e) => irPara("tipo", e.target.value)}
          className="ml-auto rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">Todos os motivos</option>
          {(Object.keys(OCORRENCIA_LABEL) as OcorrenciaTipo[]).map((t) => (
            <option key={t} value={t}>
              {OCORRENCIA_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      {ocorrencias.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <IconCircleCheck size={30} className="text-success" />
          <p className="text-sm text-muted">
            {situacao === "abertas"
              ? "Nenhuma ocorrência em aberto."
              : "Nada por aqui com esses filtros."}
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {ocorrencias.map((o) => {
          const parada = !o.resolvida_em && o.dias_aberta >= DIAS_ALERTA;
          const pendencia = OCORRENCIA_PENDENCIA.includes(o.tipo);
          return (
            <Card
              key={o.id}
              className={`p-4 ${parada ? "border-2 border-danger" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-dark">
                      NF {o.numero_nf}
                    </span>
                    <Badge tone={o.resolvida_em ? "success" : "danger"}>
                      {OCORRENCIA_LABEL[o.tipo]}
                    </Badge>
                    {pendencia && !o.resolvida_em && (
                      <Badge tone="info">Não volta para a fila</Badge>
                    )}
                    {parada && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-danger">
                        <IconClockExclamation size={13} />
                        {o.dias_aberta} dias em aberto
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-sm text-ink">
                    {o.empresa_nome && (
                      <span className="text-brand">{o.empresa_nome} → </span>
                    )}
                    {o.destinatario_nome}
                  </div>
                  {o.cidade && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <IconMapPin size={12} />
                      {o.cidade}
                    </div>
                  )}

                  {o.descricao && (
                    <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-sm text-ink">
                      {o.descricao}
                    </p>
                  )}

                  <div className="mt-2 text-xs text-muted">
                    Registrada em {dataHoraSP(o.criado_em)}
                  </div>

                  {o.resolvida_em && (
                    <div className="mt-3 rounded-lg border-l-4 border-success bg-success-50 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-success">
                        <IconCheck size={15} />
                        Resolvida
                      </div>
                      <p className="mt-1 text-sm text-ink">{o.resolucao}</p>
                      <p className="mt-1 text-xs text-muted">
                        {dataHoraSP(o.resolvida_em)}
                        {o.resolvida_por_nome ? ` · ${o.resolvida_por_nome}` : ""}
                      </p>
                      {o.foto_resolucao_url && (
                        <a
                          href={o.foto_resolucao_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        >
                          <IconCamera size={13} /> Ver canhoto assinado
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {!o.resolvida_em && (
                  <Button onClick={() => setResolvendo(o)}>
                    <IconCheck size={17} /> Resolver
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {resolvendo && (() => {
        // Canhoto retido é o único que exige a prova: o documento assinado
        // é o que estava faltando. Nota de devolução se resolve por fora.
        const exigeFoto = resolvendo.tipo === "canhoto_retido";
        return (
        <Modal open onClose={fechar} title={`Resolver — NF ${resolvendo.numero_nf}`}>
          <form ref={formRef} onSubmit={enviar} className="space-y-4">
            <div className="rounded-lg bg-canvas px-3 py-2 text-sm">
              <span className="font-semibold text-ink">
                {OCORRENCIA_LABEL[resolvendo.tipo]}
              </span>
              {resolvendo.descricao && (
                <span className="text-muted"> — {resolvendo.descricao}</span>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                O que foi feito *
              </span>
              <textarea
                name="resolucao"
                rows={2}
                required
                placeholder="Ex.: canhoto assinado retirado no cliente"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                {exigeFoto ? "Data em que a mercadoria foi entregue *" : "Data da resolução"}
              </span>
              <Input
                type="date"
                name="data_entrega"
                required={exigeFoto}
                defaultValue={hojeSP()}
                max={hojeSP()}
              />
            </label>

            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-ink">
                {exigeFoto ? "Foto do canhoto assinado" : "Anexo (opcional)"}
                {exigeFoto && (
                  <span className="rounded-full bg-danger-50 px-1.5 py-0.5 text-xs font-semibold text-danger">
                    obrigatória
                  </span>
                )}
              </span>
              <span className="mb-2 block text-xs text-muted">
                {exigeFoto
                  ? "É a prova que faltou na entrega — sem ela a NF seria encerrada sem comprovante."
                  : "Se tiver algum documento da tratativa, anexe. Não é obrigatório."}
              </span>
              {preview ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Canhoto assinado"
                    className="max-h-56 w-full rounded-lg bg-black object-contain"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setFoto(null);
                      setPreview(null);
                    }}
                  >
                    <IconRefresh size={16} /> Trocar foto
                  </Button>
                </div>
              ) : (
                <span className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-brand bg-brand-50 text-sm font-medium text-brand">
                  <IconCamera size={24} /> Escolher ou fotografar
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setFoto(f);
                  setPreview(URL.createObjectURL(f));
                  setErro(null);
                }}
              />
            </label>

            {erro && (
              <p className="flex items-start gap-1.5 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
                <IconAlertTriangle size={15} className="mt-0.5 shrink-0" />
                {erro}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={fechar}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || (exigeFoto && !foto)}>
                {pending ? "Resolvendo…" : "Confirmar resolução"}
              </Button>
            </div>
          </form>
        </Modal>
        );
      })()}
    </>
  );
}
