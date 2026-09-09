// A câmera só pode identificar uma NF-e por sua chave completa. O número
// digitado tem um caminho separado; DV incorreto nunca vira busca pelo nNF.

export function validarChave(chave: string): boolean {
  if (!/^\d{44}$/.test(chave)) return false;
  let peso = 2;
  let soma = 0;
  for (let i = 42; i >= 0; i--) {
    soma += Number(chave[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return (resto < 2 ? 0 : 11 - resto) === Number(chave[43]);
}

export function extrairNumeroNf(chave: string): string {
  return chave.slice(25, 34).replace(/^0+/, "") || "0";
}

const UFS_NFE = new Set(["11", "12", "13", "14", "15", "16", "17", "21", "22", "23", "24", "25", "26", "27", "28", "29", "31", "32", "33", "35", "41", "42", "43", "50", "51", "52", "53"]);

/** Aceita a chave exata de NF-e (modelo 55), opcionalmente com prefixo AIM.
 * Não transforma Set B em C nem procura janelas dentro de lixo: o DV sozinho
 * deixa passar cerca de 10% das sequências numéricas arbitrárias.
 */
export function extrairChaveDaCamera(texto: string): string | null {
  const chave = texto.trim().replace(/^\]C[01]/, "");
  if (!validarChave(chave)) return null;
  const mes = Number(chave.slice(4, 6));
  if (!UFS_NFE.has(chave.slice(0, 2)) || mes < 1 || mes > 12 ||
      chave.slice(20, 22) !== "55" || extrairNumeroNf(chave) === "0" ||
      !/^[1-9]$/.test(chave[34])) return null;
  return chave;
}

/** Entrada manual: número de até nove dígitos ou chave completa com espaços. */
export function interpretarCodigoBipado(texto: string): { numero: string; chave?: string } {
  const limpo = texto.replace(/\s+/g, "");
  const chave = extrairChaveDaCamera(limpo);
  if (chave) return { numero: extrairNumeroNf(chave), chave };
  if (/^\d{1,9}$/.test(limpo) && Number(limpo) > 0) {
    return { numero: limpo.replace(/^0+/, "") };
  }
  return { numero: "" };
}
