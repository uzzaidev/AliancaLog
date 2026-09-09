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
 * Recupera a chave quando o leitor decodificou o código em CODE-128 **Set C**
 * (pares de dígitos) como se fosse **Set B** (ASCII).
 *
 * O DANFE codifica os 44 dígitos como 22 pares no Set C. Quando o decodificador
 * escolhe o subconjunto errado, cada par vira o caractere `par + 32` e a leitura
 * chega como texto ilegível. Aconteceu no iPhone em 09/09: a chave
 * `4326092130…1366` chegou como `K:)5>;7 !/W * "Nu0Ot-b`.
 *
 * Desfazer é `par = charCode - 32`. A reconstrução só é aceita se o resultado for
 * uma chave válida — o dígito verificador (módulo 11) impede recuperar lixo.
 *
 * ⚠️ Espaço aqui é DADO (`" "` = 32 = par `00`), não separador. Por isso esta
 * função recebe o texto original e remove apenas quebras de linha.
 */
function recuperarDeCode128SetB(texto: string): string | null {
  const chars = [...texto.replace(/[\r\n]/g, "")];
  const PARES = 22; // 22 pares = 44 dígitos

  // Janela deslizante: alguns leitores agregam prefixo (identificador AIM) ou
  // sufixo em volta dos 22 caracteres úteis.
  for (let ini = 0; ini + PARES <= chars.length; ini++) {
    let digitos = "";
    let ok = true;
    for (let k = ini; k < ini + PARES; k++) {
      const par = chars[k].charCodeAt(0) - 32;
      if (par < 0 || par > 99) {
        ok = false;
        break;
      }
      digitos += String(par).padStart(2, "0");
    }
    if (ok && validarChave(digitos)) return digitos;
  }
  return null;
}

/**
 * Interpreta o texto lido pelo scanner (ou digitado):
 * - chave de acesso válida (44 dígitos) → retorna a chave + o número extraído dela;
 * - chave válida escondida no meio de ruído do leitor → mesma coisa;
 * - chave decodificada no subconjunto errado do Code-128 → reconstrói;
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

  // Leitor nem sempre devolve só os 44 dígitos: vem junto o identificador AIM
  // do Code-128 (`]C1`), pontuação impressa no DANFE ou lixo de borda do quadro.
  // Antes de desistir, procura uma chave válida dentro do que foi lido.
  const digitos = texto.replace(/\D/g, "");
  for (let i = 0; i + 44 <= digitos.length; i++) {
    const candidata = digitos.slice(i, i + 44);
    if (validarChave(candidata)) {
      return { numero: extrairNumeroNf(candidata), chave: candidata };
    }
  }

  // Set C lido como Set B: o texto vem ilegível, mas os dígitos estão lá.
  // Usa o texto ORIGINAL — espaço é dado, não separador.
  const recuperada = recuperarDeCode128SetB(texto);
  if (recuperada) {
    return { numero: extrairNumeroNf(recuperada), chave: recuperada };
  }

  // 44 dígitos cujo DV não fecha = leitura provavelmente errada em algum dígito.
  // Ainda assim aproveita o trecho do número da NF (posições 26–34): a nota
  // continua tendo que existir no sistema para ser assumida, então isso não cria
  // match falso — só evita jogar fora uma leitura quase boa.
  if (digitos.length === 44) {
    const numero = extrairNumeroNf(digitos);
    if (numero !== "0") return { numero };
  }

  return { numero: texto.trim() };
}
