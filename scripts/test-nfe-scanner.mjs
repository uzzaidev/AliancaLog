import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extrairChaveDaCamera, extrairNumeroNf, interpretarCodigoBipado, validarChave } from "../lib/nfe.ts";
import { SCANNER_OPTIONS, scannerRegion } from "../lib/scanner-config.ts";
import { prepareZXingModule, readBarcodes, ZXING_WASM_SHA256 } from "zxing-wasm/reader";
import { prepareZXingModule as prepareWriter, writeBarcode } from "zxing-wasm/writer";

const CHAVE = "43260921302723000115550010000246851647841366";
const NUMERO = "24685";
const setB = CHAVE.match(/../g).map((pair) => String.fromCharCode(Number(pair) + 32)).join("");
let checks = 0;
function check(name, fn) { fn(); checks++; console.log("OK " + name); }

check("chave real: DV e nNF", () => {
  assert.equal(validarChave(CHAVE), true);
  assert.equal(extrairNumeroNf(CHAVE), NUMERO);
});
check("câmera: chave exata e prefixo AIM", () => {
  for (const text of [CHAVE, "]C1" + CHAVE, CHAVE + "\r\n"]) assert.equal(extrairChaveDaCamera(text), CHAVE);
});
check("câmera: rejeita leituras parciais repetidas, DV errado, Set B e lixo", () => {
  for (const text of ["505584", "505584", NUMERO, CHAVE.slice(0, 43), CHAVE.slice(0, 43) + "7", setB,
    "]C1" + setB, "K8#/>;8 !/Q \"Nu/1t−b", "K8 > 7 !/? \"Nu0Ot-?", "abc" + CHAVE,
    CHAVE + "123", "0".repeat(44), " ".repeat(22)]) assert.equal(extrairChaveDaCamera(text), null, text);
});
check("manual: número e chave com espaços continuam funcionando", () => {
  assert.deepEqual(interpretarCodigoBipado("  024685 "), { numero: NUMERO });
  assert.deepEqual(interpretarCodigoBipado(CHAVE.match(/.{4}/g).join(" ")), { numero: NUMERO, chave: CHAVE });
});
check("DV incorreto não pode virar busca pelo número de outra nota", () => {
  for (const text of [CHAVE.slice(0, 43) + "7", setB, "abc xyz", "0", "1234567890"]) {
    assert.deepEqual(interpretarCodigoBipado(text), { numero: "" });
  }
});
check("faixa preserva margens e alterna imagem completa em retrato/paisagem", () => {
  for (const [w, h] of [[1920, 1080], [1080, 1920], [640, 480]]) {
    assert.deepEqual(scannerRegion(w, h, 0), { x: 0, y: 0, width: w, height: h });
    const r = scannerRegion(w, h, 1);
    assert.equal(r.width, w);
    assert.equal(r.x, 0);
    assert.equal(r.y + r.height / 2, h / 2);
  }
});

const wasmBinary = await readFile(new URL("../public/wasm/zxing_reader.wasm", import.meta.url));
check("WASM servido corresponde exatamente ao pacote JS", () => {
  assert.equal(createHash("sha256").update(wasmBinary).digest("hex"), ZXING_WASM_SHA256);
});
await prepareZXingModule({ overrides: { wasmBinary }, fireImmediately: true });
await prepareWriter({
  overrides: { wasmBinary: await readFile(new URL("../node_modules/zxing-wasm/dist/writer/zxing_writer.wasm", import.meta.url)) },
  fireImmediately: true,
});
for (const [name, text, rotate, expected] of [
  ["Code128 completo", CHAVE, 0, CHAVE],
  ["Code128 vertical", CHAVE, 90, CHAVE],
  ["Code128 invertido 180 graus", CHAVE, 180, CHAVE],
  ["outro Code128 de seis dígitos", "505584", 0, null],
  ["Code128 com DV NF-e inválido", CHAVE.slice(0, 43) + "7", 0, null],
  ["Code128 Set B não deve ser reinterpretado", setB, 0, null],
]) {
  const barcode = await writeBarcode(text, { format: "Code128", scale: 3, rotate, addQuietZones: true });
  assert.equal(barcode.error, "");
  const results = await readBarcodes(new Uint8Array(await barcode.image.arrayBuffer()), SCANNER_OPTIONS);
  check("decoder WASM real: " + name, () => {
    assert.ok(results.length > 0, "decoder não retornou código");
    assert.equal(results.map((r) => extrairChaveDaCamera(r.text)).find(Boolean) ?? null, expected);
  });
}
console.log(checks + " verificações passaram (inclui decodificação real de imagens).");
