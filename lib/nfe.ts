// Utilitários da NF-e. O código de barras do DANFE contém a CHAVE DE ACESSO
// (44 dígitos) — não o número da NF. O número são os dígitos 26–34 da chave.
// Estrutura: cUF(2) AAMM(4) CNPJ(14) modelo(2) série(3) nNF(9) tpEmis(1) cNF(8) DV(1).

/** Valida uma chave de acesso de NF-e: 44 dígitos + dígito verificador (módulo 11). */
export function validarChave(chave: string): boolean {
  if (!/^\d{44}$/.test(chave)) return false;
  const d = chave.split("").map(Number);
  let peso = 2;
  let soma = 0;
  for (let i = 42; i >= 0; i--) {
    soma += d[i] * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = resto < 2 ? 0 : 11 - resto;
  return dv === d[43];
}

/** Extrai o número da NF (nNF, posições 26–34) de uma chave de acesso válida. */
export function extrairNumeroNf(chave: string): string {
  return chave.slice(25, 34).replace(/^0+/, "") || "0";
}

/**
 * Interpreta o texto lido pelo scanner (ou digitado):
 * - chave de acesso válida (44 dígitos) → retorna a chave + o número extraído dela;
 * - qualquer outra coisa → trata como número de NF digitado.
 */
export function interpretarCodigoBipado(texto: string): {
  numero: string;
  chave?: string;
} {
  const limpo = texto.replace(/\s+/g, "");
  if (validarChave(limpo)) {
    return { numero: extrairNumeroNf(limpo), chave: limpo };
  }
  return { numero: texto.trim() };
}
