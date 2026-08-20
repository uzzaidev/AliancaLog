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
import type { ImportRow } from "@/app/gerencia/importar/types";

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

/** Traduz o erro cru do Postgres para o caso de a duplicata escapar da checagem prévia. */
export function traduzErroSupabase(mensagem: string): string {
  if (/notas_fiscais_chave_acesso_key/.test(mensagem))
    return (
      "Uma das NFs já existe no sistema (mesma chave de acesso) — pode ter sido " +
      "enviada antes pela transportadora, e por isso não aparece na sua lista. " +
      "Remova a nota marcada e envie novamente."
    );
  return mensagem;
}

/**
 * Descobre QUAL linha causou a violação de chave única, a partir do erro do
 * Postgres — para a tela conseguir marcar a linha em vez de só mostrar um texto
 * genérico ("uma das NFs...", sem dizer qual).
 *
 * Por que é necessário além do `encontrarDuplicatas`: aquele roda com a sessão
 * do usuário, então o RLS limita o que ele enxerga. No portal do cliente
 * (`cli_nf_select`), uma NF já cadastrada por OUTRA empresa é invisível — a
 * checagem prévia passa limpa e só o banco barra, no insert. Aqui não há
 * vazamento: a chave vem do próprio arquivo que o usuário acabou de enviar,
 * e devolvemos apenas a posição da linha dele.
 *
 * O Postgres informa o valor conflitante em `details`:
 *   `Key (chave_acesso)=(3524...) already exists.`
 */
export function duplicatasDoErro(
  erro: { message: string; details?: string | null },
  rows: ImportRow[],
): DuplicataInfo[] {
  if (!/notas_fiscais_chave_acesso_key/.test(erro.message)) return [];
  const m = /\(chave_acesso\)=\(([^)]+)\)/.exec(erro.details ?? "");
  if (!m) return [];
  const chave = m[1].trim();

  const encontradas: DuplicataInfo[] = [];
  rows.forEach((r, index) => {
    if (r.chave_acesso?.trim() === chave)
      encontradas.push({ index, numero_nf: r.numero_nf, motivo: "ja_importada" });
  });
  return encontradas;
}
