// Parsers de NF-e para importação estruturada (rodam no browser).
//   - XML: fonte RECOMENDADA. Traz todos os dados ricos + a chave de acesso.
//   - PDF (DANFE): best-effort. Extrai só a chave (44 díg., validada pelo DV) e
//     o número dela; destinatário/endereço variam por emissor e ficam pro
//     usuário completar. Por isso o XML é o caminho recomendado.
import { extrairNumeroNf, validarChave } from "@/lib/nfe";
import type { ImportRow } from "@/app/gerencia/importar/actions";

function txt(scope: Element | Document, tag: string): string {
  const n = scope.getElementsByTagName(tag)[0];
  return n?.textContent?.trim() ?? "";
}

/** Extrai uma ou mais NFs de um XML de NF-e (procNFe, NFe ou lote). */
export function parseNfeXml(xmlText: string): ImportRow[] {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return [];

  const infs = Array.from(doc.getElementsByTagName("infNFe"));
  const rows: ImportRow[] = [];
  for (const inf of infs) {
    const idAttr = inf.getAttribute("Id") ?? "";
    const chaveRaw = idAttr.replace(/^NFe/i, "").replace(/\D/g, "");
    const chave = validarChave(chaveRaw) ? chaveRaw : undefined;

    const ide = inf.getElementsByTagName("ide")[0];
    const emit = inf.getElementsByTagName("emit")[0];
    const dest = inf.getElementsByTagName("dest")[0];
    const ender = dest?.getElementsByTagName("enderDest")[0];

    const numero =
      (ide && txt(ide, "nNF")) || (chave ? extrairNumeroNf(chave) : "");
    if (!numero) continue;

    const endereco = [
      ender ? txt(ender, "xLgr") : "",
      ender ? txt(ender, "nro") : "",
      ender ? txt(ender, "xBairro") : "",
    ]
      .filter(Boolean)
      .join(", ");

    const emitNome = emit ? txt(emit, "xNome") : "";

    rows.push({
      numero_nf: numero,
      destinatario_nome: dest ? txt(dest, "xNome") : "",
      destinatario_endereco: endereco,
      cidade: ender ? txt(ender, "xMun") : "",
      chave_acesso: chave,
      observacao: emitNome ? `Emitente: ${emitNome}` : undefined,
    });
  }
  return rows;
}

/** Extrai as chaves de acesso de um DANFE em PDF (best-effort — prefira XML). */
export async function parsePdfChaves(file: File): Promise<ImportRow[]> {
  const pdfjs = await import("pdfjs-dist");
  // Worker servido na própria origem (public/), sem CDN.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  let texto = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    texto +=
      " " +
      content.items
        .map((i) => ("str" in i ? (i as { str: string }).str : ""))
        .join(" ");
  }

  // A chave são 44 dígitos, às vezes em grupos de 4 separados por espaço.
  // Pega sequências longas de dígitos e testa janelas de 44 pelo DV (mod 11).
  const chaves = new Set<string>();
  for (const bloco of texto.match(/(?:\d[\s.]?){44,}/g) ?? []) {
    const digitos = bloco.replace(/\D/g, "");
    for (let i = 0; i + 44 <= digitos.length; i++) {
      const cand = digitos.slice(i, i + 44);
      if (validarChave(cand)) chaves.add(cand);
    }
  }

  return Array.from(chaves).map((chave) => ({
    numero_nf: extrairNumeroNf(chave),
    destinatario_nome: "",
    destinatario_endereco: "",
    cidade: "",
    chave_acesso: chave,
  }));
}

export type TipoArquivo = "excel" | "xml" | "pdf" | "desconhecido";

export function tipoDoArquivo(file: File): TipoArquivo {
  const nome = file.name.toLowerCase();
  if (nome.endsWith(".xml")) return "xml";
  if (nome.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx?|csv)$/.test(nome)) return "excel";
  return "desconhecido";
}
