"use client";

// Refaturamento e cancelamento pelo embarcador (migration 0031).
//
// O caso real: o motorista já está NO cliente quando o problema aparece. O
// faturamento cancela a nota e emite outra, e o motorista precisa dar baixa na
// hora. Por isso a nota nova herda romaneio e motorista da antiga — ela aparece
// sozinha no app dele, sem ninguém atribuir e sem ele bipar (ele está com o
// papel da nota ANTIGA na mão; a nova acabou de ser impressa no escritório).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertTriangle,
  IconBan,
  IconFileUpload,
  IconReplace,
} from "@tabler/icons-react";
import { Button, Input } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { cancelarNota, substituirNota } from "@/app/cliente/notas/actions";
import { parseNfeXml } from "@/lib/import-nf";
import type { NotaCliente } from "@/lib/data/cliente";

type Acao = "substituir" | "cancelar";

export function EncerrarNota({ nf }: { nf: NotaCliente }) {
  const router = useRouter();
  const [acao, setAcao] = useState<Acao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Campos da nota nova — preenchidos pelo XML ou digitados.
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [chave, setChave] = useState("");
  const [motivo, setMotivo] = useState("");
  const [veioDoXml, setVeioDoXml] = useState(false);

  function fechar() {
    setAcao(null);
    setErro(null);
    setAviso(null);
    setNumero("");
    setNome("");
    setEndereco("");
    setCidade("");
    setChave("");
    setMotivo("");
    setVeioDoXml(false);
  }

  async function lerXml(file: File) {
    setErro(null);
    try {
      const linhas = parseNfeXml(await file.text());
      if (linhas.length === 0) {
        setErro("Não encontrei uma NF-e nesse arquivo.");
        return;
      }
      const l = linhas[0];
      setNumero(l.numero_nf);
      setNome(l.destinatario_nome);
      setEndereco(l.destinatario_endereco);
      setCidade(l.cidade ?? "");
      setChave(l.chave_acesso ?? "");
      setVeioDoXml(true);
      if (linhas.length > 1)
        setAviso(
          `O arquivo tem ${linhas.length} notas — usei a primeira (NF ${l.numero_nf}).`,
        );
    } catch {
      setErro("Não consegui ler esse XML. Confira o arquivo.");
    }
  }

  function enviar() {
    start(async () => {
      setErro(null);
      if (acao === "cancelar") {
        const r = await cancelarNota(nf.id, motivo);
        if (r.error) return setErro(r.error);
      } else {
        const r = await substituirNota({
          nfAntigaId: nf.id,
          numero_nf: numero,
          destinatario_nome: nome,
          destinatario_endereco: endereco,
          chave_acesso: chave,
          cidade,
          motivo,
        });
        if (r.error) return setErro(r.error);
      }
      fechar();
      router.refresh();
    });
  }

  const podeSubstituir =
    numero.trim() !== "" && nome.trim() !== "" && endereco.trim() !== "";
  const podeEnviar =
    acao === "cancelar" ? motivo.trim() !== "" : podeSubstituir;

  return (
    <>
      <div className="flex gap-2 border-t border-gray-100 bg-surface px-4 py-2.5">
        <button
          onClick={() => setAcao("substituir")}
          className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
        >
          <IconReplace size={14} /> Substituir por nova nota
        </button>
        <button
          onClick={() => setAcao("cancelar")}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted hover:text-danger"
        >
          <IconBan size={14} /> Cancelar
        </button>
      </div>

      <Modal
        open={acao !== null}
        onClose={fechar}
        title={
          acao === "cancelar"
            ? `Cancelar NF ${nf.numero_nf}`
            : `Substituir NF ${nf.numero_nf}`
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-canvas px-3 py-2 text-sm">
            <span className="text-muted">Nota atual: </span>
            <span className="font-semibold text-ink">NF {nf.numero_nf}</span>
            <span className="text-muted"> · {nf.destinatario_nome}</span>
          </div>

          {acao === "substituir" ? (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">
                  XML da nota nova
                </span>
                <span className="flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand bg-brand-50 text-sm font-medium text-brand">
                  <IconFileUpload size={20} />
                  {veioDoXml ? `NF ${numero} carregada` : "Escolher arquivo XML"}
                </span>
                <input
                  type="file"
                  accept=".xml,text/xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void lerXml(f);
                  }}
                />
              </label>

              <p className="text-xs text-muted">
                Sem o arquivo à mão? Preencha abaixo — os campos também aceitam
                digitação.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink">
                    Número da nota nova *
                  </span>
                  <Input
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-ink">
                    Cidade
                  </span>
                  <Input
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Destinatário *
                </span>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-ink">
                  Endereço *
                </span>
                <Input
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                />
              </label>
            </>
          ) : (
            <p className="rounded-lg border-l-4 border-danger bg-danger-50 px-3 py-2 text-sm text-danger">
              O motorista deixa de ver esta nota e não entrega nada. Use
              &quot;Substituir&quot; se houver nota nova no lugar.
            </p>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              Motivo {acao === "cancelar" && "*"}
            </span>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                acao === "cancelar"
                  ? "Ex.: pedido cancelado pelo cliente"
                  : "Ex.: preço errado na nota"
              }
            />
          </label>

          {aviso && (
            <p className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning">
              {aviso}
            </p>
          )}
          {erro && (
            <p className="flex items-start gap-1.5 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              <IconAlertTriangle size={15} className="mt-0.5 shrink-0" />
              {erro}
            </p>
          )}

          {acao === "substituir" && nf.status === "em_rota" && (
            <p className="rounded-lg border-l-4 border-info bg-info-50 px-3 py-2 text-sm text-info">
              Esta nota já está com o motorista. A nova entra no lugar dela, no
              mesmo romaneio — ele vê a troca sem precisar fazer nada.
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={fechar}>
              Voltar
            </Button>
            <Button
              variant={acao === "cancelar" ? "danger" : "primary"}
              onClick={enviar}
              disabled={pending || !podeEnviar}
            >
              {pending
                ? "Enviando…"
                : acao === "cancelar"
                  ? "Cancelar nota"
                  : "Confirmar substituição"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
