"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input } from "@/components/ui";
import { BarcodeScanner } from "@/components/gerencia/barcode-scanner";
import { interpretarCodigoBipado } from "@/lib/nfe";
import {
  buscarNf,
  criarRomaneio,
  type ItemRomaneio,
} from "@/app/gerencia/romaneios/actions";
import type {
  EmpresaItem,
  MotoristaItem,
  VeiculoItem,
} from "@/lib/data/gerencia";

type Item = ItemRomaneio & { origem: "bipada" | "manual" };

export function RomaneioBuilder({
  empresas,
  motoristas,
  veiculos,
}: {
  empresas: EmpresaItem[];
  motoristas: MotoristaItem[];
  veiculos: VeiculoItem[];
}) {
  const router = useRouter();
  const [motoristaId, setMotoristaId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [itens, setItens] = useState<Item[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Campos da entrada manual.
  const [mNum, setMNum] = useState("");
  const [mEmp, setMEmp] = useState("");
  const [mNome, setMNome] = useState("");
  const [mEnd, setMEnd] = useState("");
  const [mCidade, setMCidade] = useState("");

  const itensRef = useRef<Item[]>([]);
  useEffect(() => {
    itensRef.current = itens;
  }, [itens]);
  const busyRef = useRef(false);
  const lastRef = useRef<{ n: string; t: number }>({ n: "", t: 0 });
  // Chave de acesso lida para NFs que caíram na entrada manual (numero → chave).
  const chavesRef = useRef<Record<string, string>>({});

  const handleScan = useCallback(async (text: string) => {
    // O DANFE codifica a chave de acesso (44 dígitos), não o número da NF.
    const { numero, chave } = interpretarCodigoBipado(text);
    if (!numero) return;
    const now = Date.now();
    // Dedupe: ignora o mesmo número em sequência (janela de 2,5s).
    if (numero === lastRef.current.n && now - lastRef.current.t < 2500) return;
    if (busyRef.current) return;
    if (itensRef.current.some((i) => i.numero_nf === numero)) return;
    lastRef.current = { n: numero, t: now };
    busyRef.current = true;
    try {
      const nf = await buscarNf(text);
      if (nf) {
        setItens((prev) => [
          ...prev,
          {
            origem: "bipada",
            nfId: nf.id,
            numero_nf: nf.numero_nf,
            destinatario_nome: nf.destinatario_nome,
            destinatario_endereco: nf.destinatario_endereco,
            cidade: nf.cidade ?? undefined,
          },
        ]);
        setMsg(`NF ${nf.numero_nf} adicionada (${nf.destinatario_nome}).`);
      } else {
        if (chave) chavesRef.current[numero] = chave;
        setMNum(numero);
        setMsg(`NF ${numero} não está na importação — complete os dados abaixo.`);
      }
    } finally {
      busyRef.current = false;
    }
  }, []);

  function addManual() {
    setErro(null);
    if (!mNum || !mEmp || !mNome || !mEnd)
      return setErro("Preencha NF, empresa, destinatário e endereço.");
    if (itens.some((i) => i.numero_nf === mNum.trim()))
      return setErro("Essa NF já está na lista.");
    setItens((prev) => [
      ...prev,
      {
        origem: "manual",
        numero_nf: mNum.trim(),
        empresaId: mEmp,
        destinatario_nome: mNome.trim(),
        destinatario_endereco: mEnd.trim(),
        cidade: mCidade.trim() || undefined,
        // Se essa NF foi bipada antes de cair no manual, aproveita a chave lida.
        chave_acesso: chavesRef.current[mNum.trim()],
      },
    ]);
    setMNum("");
    setMNome("");
    setMEnd("");
    setMCidade("");
    setMsg("NF manual adicionada.");
  }

  function remover(numero: string) {
    setItens((prev) => prev.filter((i) => i.numero_nf !== numero));
  }

  function enviar() {
    setErro(null);
    if (!motoristaId) return setErro("Selecione o motorista.");
    if (itens.length === 0) return setErro("Adicione ao menos uma NF.");
    start(async () => {
      const res = await criarRomaneio({
        motoristaId,
        veiculoId: veiculoId || undefined,
        itens: itens.map((i) => ({
          nfId: i.nfId,
          numero_nf: i.numero_nf,
          destinatario_nome: i.destinatario_nome,
          destinatario_endereco: i.destinatario_endereco,
          cidade: i.cidade,
          empresaId: i.empresaId,
          chave_acesso: i.chave_acesso,
        })),
      });
      if (res.error) setErro(res.error);
      else router.push("/gerencia/romaneios");
    });
  }

  const selectCls =
    "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand";

  return (
    <div className="space-y-6">
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Motorista *">
          <select
            className={selectCls}
            value={motoristaId}
            onChange={(e) => setMotoristaId(e.target.value)}
          >
            <option value="">— selecione —</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome ?? m.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Veículo">
          <select
            className={selectCls}
            value={veiculoId}
            onChange={(e) => setVeiculoId(e.target.value)}
          >
            <option value="">— sem veículo —</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.placa}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Bipar NF</h2>
          <Button
            variant={scanning ? "secondary" : "primary"}
            onClick={() => setScanning((s) => !s)}
          >
            {scanning ? "Parar câmera" : "Abrir câmera"}
          </Button>
        </div>
        {scanning && (
          <BarcodeScanner onResult={handleScan} onError={(m) => setErro(m)} />
        )}
        <p className="text-xs text-muted">
          A câmera lê o código de barras da NF e casa com a importação. Sem
          câmera/HTTPS, use a entrada manual.
        </p>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-semibold">Adicionar manualmente</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Número da NF">
            <Input value={mNum} onChange={(e) => setMNum(e.target.value)} />
          </Field>
          <Field label="Empresa">
            <select
              className={selectCls}
              value={mEmp}
              onChange={(e) => setMEmp(e.target.value)}
            >
              <option value="">— selecione —</option>
              {empresas.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Destinatário">
            <Input value={mNome} onChange={(e) => setMNome(e.target.value)} />
          </Field>
          <Field label="Endereço">
            <Input value={mEnd} onChange={(e) => setMEnd(e.target.value)} />
          </Field>
          <Field label="Cidade">
            <Input value={mCidade} onChange={(e) => setMCidade(e.target.value)} />
          </Field>
        </div>
        <Button variant="secondary" onClick={addManual}>
          Adicionar NF
        </Button>
      </Card>

      {msg && <p className="text-sm text-success">{msg}</p>}
      {erro && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      <Card className="divide-y divide-line">
        <div className="px-4 py-2 text-sm font-semibold">
          NFs no romaneio ({itens.length})
        </div>
        {itens.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted">
            Nenhuma NF adicionada ainda.
          </p>
        )}
        {itens.map((i) => (
          <div
            key={i.numero_nf}
            className="flex items-center justify-between px-4 py-2.5 text-sm"
          >
            <div>
              <span className="font-medium text-ink">NF {i.numero_nf}</span>{" "}
              <span className="text-muted">
                · {i.destinatario_nome}
                {i.origem === "manual" ? " (manual)" : ""}
              </span>
            </div>
            <button
              onClick={() => remover(i.numero_nf)}
              className="text-xs text-danger hover:underline"
            >
              remover
            </button>
          </div>
        ))}
      </Card>

      <div className="flex justify-end">
        <Button onClick={enviar} disabled={pending}>
          {pending ? "Enviando…" : "Fechar e enviar romaneio"}
        </Button>
      </div>
    </div>
  );
}
