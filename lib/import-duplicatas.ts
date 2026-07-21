import "server-only";

// Detecta NFs duplicadas ANTES de tentar inserir — assim a gerência/cliente
// recebe uma mensagem específica ("NF X está repetida") em vez do erro cru do
// Postgres (`duplicate key value violates unique constraint...`), e a tela
// consegue marcar exatamente a linha problemática.
//
// chave_acesso é única globalmente no banco (migration 0005). Duas situações
// disparam a constraint:
//   - "repetida_no_arquivo": a mesma chave aparece 2x no lote que está sendo importado.
//   - "ja_importada": a chave já existe no banco (de uma importação anterior).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportRow } from "@/app/gerencia/importar/actions";

export type DuplicataInfo = {
  index: number; // índice em `rows`, para a UI marcar a linha certa
  numero_nf: string;
  motivo: "repetida_no_arquivo" | "ja_importada";
};

export async function encontrarDuplicatas(
  supabase: SupabaseClient,
  rows: ImportRow[],
): Promise<DuplicataInfo[]> {
  const duplicadas: DuplicataInfo[] = [];
  const primeiraOcorrencia = new Map<string, number>();

  rows.forEach((r, index) => {
    const chave = r.chave_acesso?.trim();
    if (!chave) return;
    if (primeiraOcorrencia.has(chave)) {
      duplicadas.push({ index, numero_nf: r.numero_nf, motivo: "repetida_no_arquivo" });
    } else {
      primeiraOcorrencia.set(chave, index);
    }
  });

  const chavesNoLote = Array.from(primeiraOcorrencia.keys());
  if (chavesNoLote.length > 0) {
    const { data } = await supabase
      .from("notas_fiscais")
      .select("chave_acesso")
      .in("chave_acesso", chavesNoLote);
    const jaExistentes = new Set((data ?? []).map((d) => d.chave_acesso as string));
    for (const [chave, index] of primeiraOcorrencia) {
      if (jaExistentes.has(chave)) {
        duplicadas.push({ index, numero_nf: rows[index].numero_nf, motivo: "ja_importada" });
      }
    }
  }

  return duplicadas.sort((a, b) => a.index - b.index);
}

const MOTIVO_LABEL: Record<DuplicataInfo["motivo"], string> = {
  repetida_no_arquivo: "repetida no arquivo importado (mesma chave de acesso aparece mais de uma vez)",
  ja_importada: "já foi importada antes (a chave de acesso já existe no sistema)",
};

/** Mensagem única, em português, listando cada NF duplicada e o motivo específico. */
export function mensagemDuplicatas(duplicadas: DuplicataInfo[]): string {
  const linhas = duplicadas.map((d) => `NF ${d.numero_nf}: ${MOTIVO_LABEL[d.motivo]}.`);
  const plural = duplicadas.length > 1 ? "s" : "";
  return `${duplicadas.length} nota${plural} duplicada${plural} — remova ou corrija antes de importar:\n${linhas.join("\n")}`;
}

/** Traduz o erro cru do Postgres para o caso de a duplicata escapar da checagem prévia (corrida rara). */
export function traduzErroSupabase(mensagem: string): string {
  if (/notas_fiscais_chave_acesso_key/.test(mensagem))
    return "Uma das NFs tem a mesma chave de acesso de uma nota já existente. Remova a duplicada e tente novamente.";
  return mensagem;
}
