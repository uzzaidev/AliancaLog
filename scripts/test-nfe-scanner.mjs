// Testa a interpretação do código bipado do DANFE contra os modos de falha que
// apareceram em campo. Rode com: npm run test:scanner
//
// O caso central é o de 09/09 no iPhone: o leitor decodificou o CODE-128 Set C
// como Set B e a chave chegou como texto ilegível, fazendo a bipagem dizer
// "nota não encontrada" numa NF que existia no sistema.
import {
  extrairNumeroNf,
  interpretarCodigoBipado,
  validarChave,
} from "../lib/nfe.ts";

// NF 24685 — chave real do XML que o Vítor enviou em 09/09.
const CHAVE = "43260921302723000115550010000246851647841366";
const NUMERO = "24685";

/** Como o leitor entrega quando confunde Set C com Set B. */
function comoSetB(chave) {
  let s = "";
  for (let i = 0; i < chave.length; i += 2) {
    s += String.fromCharCode(parseInt(chave.slice(i, i + 2), 10) + 32);
  }
  return s;
}

const SETB = comoSetB(CHAVE);


/** @type {{nome:string,entrada:string,chave:string|null,numero:string}[]} */
const casos = [
  { nome: "chave limpa (44 dígitos)", entrada: CHAVE, chave: CHAVE, numero: NUMERO },
  { nome: "chave com espaços", entrada: "4326 0921 3027 2300 0115 5500 1000 0246 8516 4784 1366", chave: CHAVE, numero: NUMERO },
  { nome: "Set C lido como Set B (bug de 09/09)", entrada: SETB, chave: CHAVE, numero: NUMERO },
  { nome: "Set B + identificador AIM", entrada: "]C1" + SETB, chave: CHAVE, numero: NUMERO },
  { nome: "Set B + quebra de linha", entrada: SETB + "\r\n", chave: CHAVE, numero: NUMERO },
  { nome: "chave com ruído em volta", entrada: "]C1" + CHAVE + "\r", chave: CHAVE, numero: NUMERO },
  { nome: "número digitado à mão", entrada: NUMERO, chave: null, numero: NUMERO },
  { nome: "número com espaço em volta", entrada: "  24685 ", chave: null, numero: NUMERO },
  { nome: "texto sem nada aproveitável", entrada: "abc xyz", chave: null, numero: "abc xyz" },
];

let falhas = 0;
console.log("chave de referência:", CHAVE);
console.log("como o leitor entregou:", JSON.stringify(SETB), "\n");

for (const c of casos) {
  const r = interpretarCodigoBipado(c.entrada);
  const ok = (r.chave ?? null) === c.chave && r.numero === c.numero;
  if (!ok) falhas++;
  console.log(
    (ok ? "  ✓ " : "  ✗ ") +
      c.nome.padEnd(38) +
      "numero=" + String(r.numero).slice(0, 14).padEnd(15) +
      "chave=" + (r.chave ? (r.chave === CHAVE ? "ok" : "ERRADA") : "—"),
  );
  if (!ok) {
    console.log("      esperava numero=" + c.numero + " chave=" + (c.chave ?? "—"));
  }
}

// Trava de segurança: a reconstrução do Set B não pode inventar chave a partir
// de texto arbitrário. O dígito verificador é o que garante isso.
let inventadas = 0;
for (let i = 0; i < 5000; i++) {
  let lixo = "";
  for (let k = 0; k < 22; k++) lixo += String.fromCharCode(32 + Math.floor(Math.random() * 95));
  if (interpretarCodigoBipado(lixo).chave) inventadas++;
}
const taxa = (inventadas / 5000) * 100;
console.log(
  `\n  ${inventadas === 0 ? "✓" : "•"} 5000 textos aleatórios de 22 chars → ` +
    `${inventadas} viraram "chave válida" (${taxa.toFixed(2)}%)`,
);
console.log("      (o DV deixa passar ~1/11; a NF ainda precisa existir no banco)");

// Sanidade das funções base.
if (!validarChave(CHAVE)) { falhas++; console.log("  ✗ validarChave rejeitou a chave real"); }
if (extrairNumeroNf(CHAVE) !== NUMERO) { falhas++; console.log("  ✗ extrairNumeroNf não devolveu " + NUMERO); }

console.log("\n" + (falhas ? `✗ ${falhas} FALHA(S)` : "✓ scanner: todos os casos passaram"));
process.exit(falhas ? 1 : 0);
