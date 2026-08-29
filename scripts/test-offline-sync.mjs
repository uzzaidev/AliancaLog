import assert from "node:assert/strict";
import {
  classificarRespostaSync,
  mensagemRespostaSync,
} from "../lib/offline/sync-result.ts";

const casos = [
  [200, "sucesso"],
  [201, "sucesso"],
  [409, "sucesso"],
  [400, "validacao"],
  [401, "autenticacao"],
  [403, "autenticacao"],
  [500, "tentar_novamente"],
  [503, "tentar_novamente"],
];

for (const [status, esperado] of casos) {
  assert.equal(classificarRespostaSync(status), esperado, `HTTP ${status}`);
}

const rejeitada = mensagemRespostaSync("123", 400, "foto obrigatória");
assert.match(rejeitada, /preservado no aparelho/);
assert.match(rejeitada, /foto obrigatória/);
assert.doesNotMatch(rejeitada, /Registrado/);

const auth = mensagemRespostaSync("123", 401);
assert.match(auth, /Entre novamente/);

console.log("✓ fila offline: respostas classificadas sem transformar rejeição em sucesso");
