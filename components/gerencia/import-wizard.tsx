"use client";

// Assistente de importação de NFs. Compartilhado entre a gerência e o cliente
// (prop `variant`): a gerência escolhe empresa/motorista; o cliente não vê esses
// campos (empresa vem do JWT no servidor).
// Aceita 4 formatos:
//   - .zip de XMLs → RECOMENDADO p/ carga fechada: o cliente manda um pacote só
//     em vez de nota a nota (A-003). Descompactado aqui no browser.
//   - XML de NF-e → já traz todos os dados + chave de acesso.
//   - Excel/CSV  → mapeamento de colunas (SheetJS, sob demanda).
//   - PDF (DANFE) → best-effort: extrai a chave/número; resto é preenchido à mão.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconTrash, IconX } from "@tabler/icons-react";
import { Button, Card, Field, Input } from "@/components/ui";
import { confirmarImportacao } from "@/app/gerencia/importar/actions";
import type {
  DuplicataInfo,
  ImportRow,
} from "@/app/gerencia/importar/types";
import { confirmarImportacaoCliente } from "@/app/cliente/importar/actions";
import {
  parseNfeXml,
  parsePdfChaves,
  parseZipXmls,
  tipoDoArquivo,
} from "@/lib/import-nf";
import type { EmpresaItem, MotoristaItem } from "@/lib/data/gerencia";

const MOTIVO_LABEL: Record<DuplicataInfo["motivo"], string> = {
  repetida_no_arquivo: "repetida no arquivo (mesma chave de acesso 2x)",
  ja_importada: "já importada antes (chave de acesso já existe)",
};

type Linha = Record<string, unknown>;

// Identidade estável de cada linha da grade de conferência.
//
// Por que existe: a marcação de duplicata vinda do servidor é por POSIÇÃO
// (`index`). Se guardássemos a marcação pela posição, remover uma linha
// deslocaria todas as seguintes e as marcações apontariam para as linhas
// erradas — era por isso que, ao remover uma duplicada, as outras "perdiam" o
// aviso. Com um id próprio, a marcação sobrevive a remoções e reordenações.
// O `__id` é só da tela: nunca vai para o servidor.
type LinhaEditavel = ImportRow & { __id: string };

let seqLinha = 0;
function comId(r: ImportRow): LinhaEditavel {
  seqLinha += 1;
  return { ...r, __id: `linha-${seqLinha}` };
}

/** Remove o campo de UI antes de mandar pro servidor. */
function semId(r: LinhaEditavel): ImportRow {
  const { __id: _ignorado, ...limpa } = r;
  void _ignorado;
  return limpa;
}

const CAMPOS = [
  { key: "numero_nf", label: "Número da NF", req: true },
  { key: "destinatario_nome", label: "Destinatário", req: true },
  { key: "destinatario_endereco", label: "Endereço", req: true },
  { key: "cidade", label: "Cidade", req: false },
  { key: "observacao", label: "Observação", req: false },
] as const;

type CampoKey = (typeof CAMPOS)[number]["key"];

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
  variant,
  empresas = [],
  motoristas = [],
}: {
  variant: "gerencia" | "cliente";
  empresas?: EmpresaItem[];
  motoristas?: MotoristaItem[];
}) {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState("");
  const [motoristaId, setMotoristaId] = useState("");
  // Fluxo Excel: cabeçalhos + linhas + mapeamento de colunas.
  const [headers, setHeaders] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [map, setMap] = useState<Record<CampoKey, string>>({
    numero_nf: "",
    destinatario_nome: "",
    destinatario_endereco: "",
    cidade: "",
    observacao: "",
  });
  // Fluxo XML/PDF: linhas já estruturadas e editáveis.
  const [rows, setRows] = useState<LinhaEditavel[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  // Duplicatas apontadas pelo servidor, guardadas pelo `__id` da linha (não pela
  // posição) — assim remover uma não bagunça a marcação das outras.
  const [duplicadas, setDuplicadas] = useState<Map<string, DuplicataInfo["motivo"]>>(new Map());
  const [pending, start] = useTransition();

  function resetTudo() {
    setHeaders([]);
    setLinhas([]);
    setRows(null);
    setAviso(null);
    setDuplicadas(new Map());
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErro(null);
    setResultado(null);
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    resetTudo();
    setLendo(true);
    try {
      const tipo = tipoDoArquivo(files[0]);

      if (tipo === "excel") {
        const buf = await files[0].arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Linha>(ws, { defval: "" });
        if (json.length === 0) return setErro("A planilha está vazia.");
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
        return;
      }

      if (tipo === "xml" || tipo === "pdf" || tipo === "zip") {
        const extraidas: ImportRow[] = [];
        let temPdf = false;
        let zipsVazios = 0;
        for (const f of files) {
          const t = tipoDoArquivo(f);
          if (t === "xml") extraidas.push(...parseNfeXml(await f.text()));
          else if (t === "zip") {
            const doZip = await parseZipXmls(f);
            if (doZip.length === 0) zipsVazios++;
            extraidas.push(...doZip);
          } else if (t === "pdf") {
            temPdf = true;
            extraidas.push(...(await parsePdfChaves(f)));
          }
        }
        if (extraidas.length === 0)
          return setErro(
            zipsVazios > 0
              ? "O .zip não tinha nenhum XML de NF-e válido dentro. Confira se o pacote é o de XMLs da carga."
              : "Não consegui extrair NFs. Confira se é um XML de NF-e, um .zip de XMLs ou um DANFE em PDF.",
          );
        setRows(extraidas.map(comId));
        if (temPdf)
          setAviso(
            "PDF é best-effort: extraí a chave e o número da NF; complete destinatário e endereço abaixo. Para importação completa e automática, prefira o XML da NF-e.",
          );
        else if (zipsVazios > 0)
          setAviso(
            `${zipsVazios} pacote(s) .zip não tinha(m) XML de NF-e dentro e foram ignorados.`,
          );
        return;
      }

      setErro("Formato não suportado. Use .zip de XMLs, XML, Excel (.xlsx/.csv) ou PDF.");
    } catch {
      setErro(
        "Falha ao ler o arquivo. Se for .zip, confira se não está protegido por senha; se for PDF, tente o XML da NF-e.",
      );
    } finally {
      setLendo(false);
    }
  }

  function montarRowsExcel(): ImportRow[] {
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

  function editarRow(id: string, campo: keyof ImportRow, valor: string) {
    setRows((prev) =>
      prev
        ? prev.map((r) => (r.__id === id ? { ...r, [campo]: valor } : r))
        : prev,
    );
    // A linha mudou — a marcação de duplicata (do envio anterior) ficou stale.
    limparMarcacao(id);
  }

  function limparMarcacao(id: string) {
    setDuplicadas((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }

  function removerRow(id: string) {
    setRows((prev) => (prev ? prev.filter((r) => r.__id !== id) : prev));
    // Só a marcação DESTA linha sai; as outras continuam marcadas, já que agora
    // são identificadas por id e não por posição.
    limparMarcacao(id);
  }

  function removerTodasDuplicadas() {
    setRows((prev) => (prev ? prev.filter((r) => !duplicadas.has(r.__id)) : prev));
    setDuplicadas(new Map());
    setErro(null);
  }

  function confirmar() {
    setErro(null);
    setDuplicadas(new Map());
    if (variant === "gerencia" && !empresaId)
      return setErro("Selecione a empresa embarcadora.");

    let payload: ImportRow[];
    // Guarda a lista exata que foi enviada: o servidor responde por posição, e é
    // por esta lista (não pela `rows` do momento da resposta) que a posição tem
    // que ser traduzida em `__id`.
    const enviadas = rows;
    if (enviadas) {
      payload = enviadas.map(semId);
    } else {
      if (!map.numero_nf || !map.destinatario_nome || !map.destinatario_endereco)
        return setErro("Mapeie NF, destinatário e endereço.");
      payload = montarRowsExcel();
    }

    start(async () => {
      const res =
        variant === "gerencia"
          ? await confirmarImportacao({
              empresaId,
              motoristaId: motoristaId || undefined,
              rows: payload,
            })
          : await confirmarImportacaoCliente({ rows: payload });
      if (res.error) {
        setErro(res.error);
        // Marca exatamente as linhas duplicadas — a grade fica como está, pra
        // dar pra corrigir/remover ali mesmo, sem perder o que já foi digitado.
        if (res.duplicadas?.length && enviadas) {
          setDuplicadas(
            new Map(
              res.duplicadas
                .map((d) => [enviadas[d.index]?.__id, d.motivo] as const)
                .filter((par): par is [string, DuplicataInfo["motivo"]] =>
                  Boolean(par[0]),
                ),
            ),
          );
        }
      } else {
        setResultado(res.ok ?? "Importado.");
        resetTudo();
        router.refresh();
      }
    });
  }

  const selectCls =
    "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand";
  const previewExcel = headers.length > 0 ? montarRowsExcel().slice(0, 5) : [];
  const total = rows ? rows.length : linhas.length;
  const submitLabel =
    variant === "cliente" ? `Enviar ${total} NF(s)` : `Importar ${total} NF(s)`;

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        {variant === "gerencia" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Empresa embarcadora (de quem são estas notas)">
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
        )}
        <Field label="Arquivo — .zip de XMLs (recomendado), XML, Excel/CSV ou PDF">
          <input
            type="file"
            accept=".zip,.xlsx,.xls,.csv,.xml,.pdf"
            multiple
            onChange={onFile}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
          />
        </Field>
        <p className="text-xs text-muted">
          Ao fechar a carga, mande o <strong>.zip com os XMLs</strong> de uma vez —
          o sistema abre o pacote e lê todas as notas. XML avulso funciona igual:
          os dois trazem a chave de acesso, então a nota casa exatamente na hora da
          bipagem. PDF e Excel funcionam, mas podem exigir ajuste manual.
        </p>
        {lendo && <p className="text-sm text-muted">Lendo arquivo(s)…</p>}
      </Card>

      {aviso && (
        <p className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning">
          {aviso}
        </p>
      )}

      {/* Fluxo Excel: mapeamento de colunas */}
      {rows === null && headers.length > 0 && (
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">
            Mapeie as colunas ({linhas.length} linhas)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS.map((c) => (
              <Field key={c.key} label={`${c.label}${c.req ? " *" : ""}`}>
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
                {previewExcel.map((r, i) => (
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
        </Card>
      )}

      {/* Fluxo XML/PDF: grade editável */}
      {rows !== null && rows.length > 0 && (
        <Card className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Confira as NFs ({rows.length})</h2>
            {duplicadas.size > 0 && (
              <Button
                variant="danger"
                onClick={removerTodasDuplicadas}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
              >
                <IconTrash size={14} aria-hidden />
                Remover {duplicadas.size} duplicada
                {duplicadas.size > 1 ? "s" : ""}
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {rows.map((r) => {
              const motivo = duplicadas.get(r.__id);
              return (
                <div
                  key={r.__id}
                  className={`rounded-lg border p-3 ${
                    motivo
                      ? "border-danger bg-danger-50"
                      : "border-line"
                  }`}
                >
                  {motivo && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-danger">
                      <IconX size={13} aria-hidden />
                      <span>Duplicada — {MOTIVO_LABEL[motivo]}</span>
                    </div>
                  )}
                  <div className="grid gap-2 sm:grid-cols-[7rem_1fr_1fr_9rem_auto]">
                    <Input
                      aria-label="Número da NF"
                      placeholder="NF"
                      value={r.numero_nf}
                      onChange={(e) => editarRow(r.__id, "numero_nf", e.target.value)}
                    />
                    <Input
                      aria-label="Destinatário"
                      placeholder="Destinatário"
                      value={r.destinatario_nome}
                      onChange={(e) =>
                        editarRow(r.__id, "destinatario_nome", e.target.value)
                      }
                    />
                    <Input
                      aria-label="Endereço"
                      placeholder="Endereço"
                      value={r.destinatario_endereco}
                      onChange={(e) =>
                        editarRow(r.__id, "destinatario_endereco", e.target.value)
                      }
                    />
                    <Input
                      aria-label="Cidade"
                      placeholder="Cidade"
                      value={r.cidade ?? ""}
                      onChange={(e) => editarRow(r.__id, "cidade", e.target.value)}
                    />
                    <button
                      onClick={() => removerRow(r.__id)}
                      className="text-xs text-danger hover:underline"
                    >
                      remover
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {(rows !== null ? rows.length > 0 : headers.length > 0) && (
        <Button onClick={confirmar} disabled={pending}>
          {pending ? "Enviando…" : submitLabel}
        </Button>
      )}

      {erro && (
        <p className="whitespace-pre-line rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
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
