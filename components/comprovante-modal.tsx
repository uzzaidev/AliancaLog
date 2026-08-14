"use client";

// Modal de comprovante — compartilhado entre gerência e portal do cliente.
// Recebe a Server Action de busca como prop (cada área aplica seu próprio
// requireRole antes de chamar lib/data/comprovante.ts).
import { useEffect, useState } from "react";
import { IconMapPin } from "@tabler/icons-react";
import { Modal } from "@/components/ui/modal";
import { Spinner, StatusBadge } from "@/components/ui";
import { NOTA_STATUS_META, OCORRENCIA_LABEL, type ComprovanteDetalhe } from "@/lib/types";

function dataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ComprovanteModal({
  nfId,
  onClose,
  fetcher,
}: {
  nfId: string | null;
  onClose: () => void;
  fetcher: (nfId: string) => Promise<ComprovanteDetalhe | null>;
}) {
  const [dados, setDados] = useState<ComprovanteDetalhe | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function carregar() {
      if (!nfId) {
        setDados(null);
        return;
      }
      setCarregando(true);
      setErro(null);
      try {
        const res = await fetcher(nfId);
        if (!vivo) return;
        if (!res) setErro("Comprovante não encontrado.");
        else setDados(res);
      } catch {
        if (vivo) setErro("Não consegui carregar o comprovante.");
      } finally {
        if (vivo) setCarregando(false);
      }
    }

    carregar();
    return () => {
      vivo = false;
    };
  }, [nfId, fetcher]);

  // Timeline: criação, ocorrências e cada tentativa de entrega, intercaladas por
  // horário. Desde A-007 uma NF pode ter mais de uma tentativa (recusada/
  // ocorrência volta pro painel), então cada canhoto vira uma linha própria em
  // vez de assumir só um "Canhoto registrado" no fim.
  const eventos = dados
    ? [
        { quando: dados.criado_em, texto: "NF criada" },
        ...dados.ocorrencias.map((o) => ({
          quando: o.criado_em,
          texto: `${OCORRENCIA_LABEL[o.tipo]}${o.descricao ? ` — ${o.descricao}` : ""}`,
        })),
        ...dados.tentativas.map((t, i) => ({
          quando: t.registrado_em,
          texto:
            `Tentativa ${i + 1}${t.motorista_nome ? ` (${t.motorista_nome})` : ""} — ${NOTA_STATUS_META[t.status].label}` +
            (t.observacao ? ` — ${t.observacao}` : ""),
        })),
      ].sort((a, b) => a.quando.localeCompare(b.quando))
    : [];

  return (
    <Modal
      open={nfId !== null}
      onClose={onClose}
      title={dados ? `NF ${dados.numero_nf}` : "Comprovante"}
    >
      {carregando && (
        <div className="flex items-center justify-center gap-2 py-10 text-muted">
          <Spinner /> Carregando…
        </div>
      )}
      {erro && <p className="py-6 text-center text-sm text-danger">{erro}</p>}

      {dados && !carregando && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <StatusBadge status={dados.status} />
            {dados.empresa_nome && (
              <span className="text-sm text-muted">{dados.empresa_nome}</span>
            )}
          </div>

          <div className="text-sm">
            <div className="font-medium text-ink">{dados.destinatario_nome}</div>
            <div className="text-muted">
              {dados.destinatario_endereco}
              {dados.cidade ? `, ${dados.cidade}` : ""}
            </div>
            {dados.motorista_nome && (
              <div className="mt-1 text-muted">
                Motorista: {dados.motorista_nome}
              </div>
            )}
            {dados.gps && (
              <a
                href={`https://www.google.com/maps?q=${dados.gps.lat},${dados.gps.lng}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-brand hover:underline"
              >
                <IconMapPin size={14} aria-hidden />
                Ver local do registro
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-[11px] font-medium text-muted">Chegada</div>
              {dados.foto_chegada_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dados.foto_chegada_url}
                  alt={`Chegada na NF ${dados.numero_nf}`}
                  className="h-40 w-full rounded-lg bg-black object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg bg-canvas text-xs text-muted">
                  Sem foto ainda
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-[11px] font-medium text-muted">Canhoto</div>
              {dados.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dados.foto_url}
                  alt={`Canhoto da NF ${dados.numero_nf}`}
                  className="h-40 w-full rounded-lg bg-black object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg bg-canvas text-xs text-muted">
                  Sem foto ainda
                </div>
              )}
            </div>
          </div>

          {dados.observacao && (
            <div className="rounded-lg bg-canvas p-3 text-sm">
              <span className="font-semibold text-ink">Observação: </span>
              <span className="text-muted">{dados.observacao}</span>
            </div>
          )}

          {eventos.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Linha do tempo</h3>
              <ul className="space-y-2 border-l-2 border-line pl-3">
                {eventos.map((e, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-muted">{dataHora(e.quando)}</span> —{" "}
                    <span className="text-ink">{e.texto}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
