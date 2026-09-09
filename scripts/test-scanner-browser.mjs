import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { chromium, webkit, expect } from "@playwright/test";
import { prepareZXingModule, writeBarcode } from "zxing-wasm/writer";

const CHAVE = "43260921302723000115550010000246851647841366";
await prepareZXingModule({
  overrides: { wasmBinary: await readFile(new URL("../node_modules/zxing-wasm/dist/writer/zxing_writer.wasm", import.meta.url)) },
  fireImmediately: true,
});
const assets = new Map();
for (const [name, text] of [["valid", CHAVE], ["partial", "505584"]]) {
  const code = await writeBarcode(text, { format: "Code128", scale: 3 });
  assert.equal(code.error, "");
  assets.set("/" + name + ".png", Buffer.from(await code.image.arrayBuffer()));
}
const bundle = await build({
  entryPoints: ["scripts/scanner-browser-fixture.tsx"], bundle: true, write: false,
  platform: "browser", format: "esm", jsx: "automatic", target: "es2022",
  define: { "process.env.NODE_ENV": '"development"' },
});
const wasm = await readFile(new URL("../public/wasm/zxing_reader.wasm", import.meta.url));
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/fixture.js") {
    res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].contents);
  } else if (url.pathname === "/wasm/zxing_reader.wasm") {
    res.setHeader("Content-Type", "application/wasm"); res.end(wasm);
  } else if (assets.has(url.pathname)) {
    res.setHeader("Content-Type", "image/png"); res.end(assets.get(url.pathname));
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Scanner test</title><style>body{font:16px sans-serif;max-width:390px;margin:16px}video{width:100%}button,summary,label{display:block;margin:8px 0;min-height:48px}select{max-width:100%}</style><div id="root"></div><script type="module" src="/fixture.js"></script></html>');
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + server.address().port;
try {
  for (const [name, engine] of [["Chromium", chromium], ["WebKit", webkit]]) {
    if (process.argv[2] && process.argv[2] !== name) continue;
    const browser = await engine.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const pageErrors = [];
      page.on("pageerror", (error) => { pageErrors.push(error.message); console.error(name + ": " + error.message); });
      if (name === "WebKit") {
        await page.goto(base + "/?denied");
        await expect(page.getByRole("status")).toContainText("Não foi possível abrir a câmera");
        await page.locator('input[type="file"]').setInputFiles({ name: "partial.png", mimeType: "image/png", buffer: assets.get("/partial.png") });
        await expect(page.getByRole("status")).toContainText("Não consegui ler a foto");
        assert.equal(await page.getByTestId("results").textContent(), "");
        await page.locator('input[type="file"]').setInputFiles({ name: "danfe.png", mimeType: "image/png", buffer: assets.get("/valid.png") });
        await expect(page.getByTestId("results")).toHaveText(CHAVE);
        assert.deepEqual(pageErrors, []);
        console.log("WebKit: WASM carrega e lê foto; parcial rejeitado. Câmera ao vivo não disponível no WebKit para Windows.");
        continue;
      }
      await page.goto(base);
      await expect(page.getByRole("status")).toContainText("Leitura incompleta", { timeout: 15000 });
      assert.equal(await page.getByTestId("results").textContent(), "");
      await page.getByText("Atualizar pai", { exact: true }).click();
      await expect(page.getByTestId("revision")).toHaveText("1");
      assert.equal(await page.evaluate(() => window.cameraOpens), 1, "render do pai reabriu a câmera");
      const started = Date.now();
      await page.getByText("Código válido", { exact: true }).click();
      await expect(page.getByTestId("results")).toHaveText(CHAVE, { timeout: 5000 });
      console.log(name + ": chave fora da faixa central lida em " + (Date.now() - started) + " ms; parcial rejeitado; câmera não reiniciou.");
      await page.getByText("Fechar", { exact: true }).click();
      assert.equal(await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === "ended")), true);

      await page.goto(base);
      await expect(page.getByRole("status")).toContainText("Leitura incompleta");
      await page.locator('input[type="file"]').setInputFiles({ name: "danfe.png", mimeType: "image/png", buffer: assets.get("/valid.png") });
      await expect(page.getByTestId("results")).toHaveText(CHAVE);
      console.log(name + ": foto em resolução original decodificada.");

      let failWasm = true;
      await page.route("**/wasm/**", (route) => failWasm
        ? route.fulfill({ status: 200, contentType: "text/html", body: "<html>Login</html>" })
        : route.continue());
      await page.goto(base);
      await expect(page.getByRole("status")).toContainText("Não foi possível carregar o leitor");
      assert.equal(await page.evaluate(() => window.cameraTracks.every((track) => track.readyState === "ended")), true);
      failWasm = false;
      await page.getByText("Tentar novamente", { exact: true }).click();
      await expect(page.getByRole("status")).toContainText("Leitura incompleta");
      assert.equal(await page.evaluate(() => window.cameraOpens), 2);
      console.log(name + ": HTML no lugar de WASM exibe erro, fecha câmera e permite nova tentativa.");
      await page.unroute("**/wasm/**");

      await page.goto(base + "/?denied");
      await expect(page.getByRole("status")).toContainText("Não foi possível abrir a câmera");
      await page.locator('input[type="file"]').setInputFiles({ name: "danfe.png", mimeType: "image/png", buffer: assets.get("/valid.png") });
      await expect(page.getByTestId("results")).toHaveText(CHAVE);
      console.log(name + ": foto funciona mesmo com permissão de vídeo negada.");

      await page.goto(base + "/?delayed");
      await expect.poll(() => page.evaluate(() => !!window.releaseCamera)).toBe(true);
      await page.getByText("Fechar", { exact: true }).click();
      await page.evaluate(() => window.releaseCamera());
      await expect.poll(() => page.evaluate(() => window.cameraTracks.every((track) => track.readyState === "ended"))).toBe(true);
      assert.deepEqual(pageErrors, [], "exceções não tratadas no navegador");
      console.log(name + ": câmera liberada após desmontagem; nenhuma exceção não tratada.");
    } finally { await browser.close(); }
  }
} finally { await new Promise((resolve) => server.close(resolve)); }
