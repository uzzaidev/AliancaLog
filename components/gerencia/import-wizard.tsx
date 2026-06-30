"use client";

// Assistente de importação de Excel/CSV: lê o arquivo no browser (SheetJS,
// carregado sob demanda), deixa mapear as colunas e confirma a criação das NFs.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field } from "@/components/ui";
import {
  confirmarImportacao,
  type ImportRow,
} from "@/app/gerencia/importar/actions";
import type { EmpresaItem, MotoristaItem } from "@/lib/data/gerencia";

type Linha = Record<string, unknown>;

const CAMPOS = [
  { key: "numero_nf", label: "Número da NF", req: true },
  { key: "destinatario_nome", label: "Destinatário", req: true },
  { key: "destinatario_endereco", label: "Endereço", req: true },
  { key: "cidade", label: "Cidade", req: false },
  { key: "observacao", label: "Observação", req: false },
] as const;

type CampoKey = (typeof CAMPOS)[number]["key"];

// Heurística simples para adivinhar a coluna por nome do cabeçalho.
function adivinhar(headers: string[], key: CampoKey): string {
  const h = (re: RegExp) => headers.find((c) => re.test(c.toLowerCase())) ?? "";
  switch (key) {
    case "numero_nf":
      return h(/\b(nf|nota|n[º°o]\.?\s*fiscal)\b/);
    case "destinatario_nome":
      return h(/destinat|cliente|nome|razao/);
    case "destinatario_endereco":
      return h(/ender|logradouro|rua/);
    case "cidade":
      return h(/cidade|munic/);
    case "observacao":
      return h(/obs|observ|nota/);
  }
}

export function ImportWizard({
  empresas,
  motoristas,
}: {
  empresas: EmpresaItem[];
  motoristas: MotoristaItem[];
}) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [map, setMap] = useState<Record<CampoKey, string>>({
    numero_nf: "",
    destinatario_nome: "",
    destinatario_endereco: "",
    cidade: "",
    observacao: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(null);
    setResultado(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Linha>(ws, { defval: "" });
      if (json.length === 0) {
        setErro("A planilha está vazia.");
        return;
      }
      const cols = Object.keys(json[0]);
      setHeaders(cols);
      setLinhas(json);
      setMap({
        numero_nf: adivinhar(cols, "numero_nf"),
        destinatario_nome: adivinhar(cols, "destinatario_nome"),
        destinatario_endereco: adivinhar(cols, "destinatario_endereco"),
        cidade: adivinhar(cols, "cidade"),
        observacao: adivinhar(cols, "observacao"),
      });
    } catch {
      setErro("Não consegui ler o arquivo. Use .xlsx ou .csv.");
    }
  }

  function montarRows(): ImportRow[] {
    const val = (l: Linha, col: string) =>
      col ? String(l[col] ?? "").trim() : "";
    return linhas.map((l) => ({
      numero_nf: val(l, map.numero_nf),
      destinatario_nome: val(l, map.destinatario_nome),
      destinatario_endereco: val(l, map.destinatario_endereco),
      cidade: val(l, map.cidade),
      observacao: val(l, map.observacao),
    }));
  }

  function confirmar() {
    setErro(null);
    if (!empresaId) return setErro("Selecione a empresa embarcadora.");
    if (!map.numero_nf || !map.destinatario_nome || !map.destinatario_endereco)
      return setErro("Mapeie NF, destinatário e endereço.");
    const rows = montarRows();
    start(async () => {
      const res = await confirmarImportacao({
        empresaId,
        motoristaId: motoristaId || undefined,
        rows,
      });
      if (res.error) setErro(res.error);
      else {
        setResultado(res.ok ?? "Importado.");
        setHeaders([]);
        setLinhas([]);
        router.refresh();
      }
    });
  }

  const selectCls =
    "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand";
  const preview = headers.length > 0 ? montarRows().slice(0, 5) : [];

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa embarcadora (de quem é esta planilha)">
            <select
              className={selectCls}
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
            >
              <option value="">— selecione —</option>
              {empresas.map((em) => (
                <option key={em.id} value={em.id}>
                  {em.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Atribuir a um motorista (opcional)">
            <select
              className={selectCls}
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
            >
              <option value="">— deixar sem motorista —</option>
              {motoristas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome ?? m.email}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Arquivo (.xlsx ou .csv)">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFile}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </Field>
      </Card>

      {headers.length > 0 && (
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Mapeie as colunas ({linhas.length} linhas)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS.map((c) => (
              <Field
                key={c.key}
                label={`${c.label}${c.req ? " *" : ""}`}
              >
                <select
                  className={selectCls}
                  value={map[c.key]}
                  onChange={(e) =>
                    setMap((m) => ({ ...m, [c.key]: e.target.value }))
                  }
                >
                  <option value="">— não usar —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 pr-3">NF</th>
                  <th className="py-1 pr-3">Destinatário</th>
                  <th className="py-1 pr-3">Endereço</th>
                  <th className="py-1">Cidade</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="py-1 pr-3">{r.numero_nf}</td>
                    <td className="py-1 pr-3">{r.destinatario_nome}</td>
                    <td className="py-1 pr-3">{r.destinatario_endereco}</td>
                    <td className="py-1">{r.cidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={confirmar} disabled={pending}>
            {pending ? "Importando…" : `Importar ${linhas.length} NF(s)`}
          </Button>
        </Card>
      )}

      {erro && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}
      {resultado && (
        <p className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success">
          {resultado}
        </p>
      )}
    </div>
  );
}
