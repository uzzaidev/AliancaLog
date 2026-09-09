// Service Worker mínimo do Aliança Log.
// A fila vive no IndexedDB e sincroniza tanto pela aplicação aberta quanto por
// Background Sync (quando o navegador oferece a API).
//
// SEGURANÇA: este SW NÃO cacheia páginas autenticadas (navegações) — elas são
// específicas do usuário e cachear vazaria dados para o próximo login no mesmo
// aparelho. Só cacheamos assets estáticos (versionados, sem dados). O cache e a
// fila também são limpos no logout (LogoutButton). v2 = purga qualquer cache
// antigo que ainda tenha páginas autenticadas.
const CACHE = "alianca-log-v5";
const DB_NAME = "alianca-log";
const DB_VERSION = 1;
const STORE_FILA = "fila_canhotos";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        // Precache do App Shell offline estático
        const res = await fetch(OFFLINE_URL);
        if (res.ok) {
          await cache.put(OFFLINE_URL, res.clone());
          // Extrai scripts e stylesheets linkados no HTML do App Shell para precache
          const text = await res.text();
          const matches = text.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g);
          const urls = Array.from(matches, (m) => m[1]);
          await Promise.all(
            urls.map(async (u) => {
              try {
                const assetRes = await fetch(u);
                if (assetRes.ok) await cache.put(u, assetRes);
              } catch {}
            }),
          );
        }
      } catch {
        // Best-effort no precache: se falhar na instalação, continuará tentando nos próximos acessos
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // não intercepta Supabase/externos
  if (url.pathname.startsWith("/api/")) return; // nunca cacheia API

  // Navegações (páginas autenticadas): Network-First.
  // Se online: busca direto na rede (SSR fresco com autenticação). Nunca grava no cache
  // para não vazar dados para o próximo login no mesmo aparelho.
  // Se offline (modo avião, sem sinal, timeout): serve o App Shell estático (/offline)
  // do cache, que lê os dados seguros locais do IndexedDB (STORE_CACHE).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE);
        const cachedOffline = await cache.match(OFFLINE_URL);
        if (cachedOffline) return cachedOffline;
        return new Response(
          "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Aliança Log — Offline</title></head><body style='font-family:system-ui;padding:2rem;text-align:center;background:#1e1e1e;color:#fff;'><h2>Sem conexão</h2><p style='color:#aaa;'>Não foi possível conectar ao servidor.</p><button onclick='location.reload()' style='background:#f37312;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:bold;margin-top:1rem;cursor:pointer;'>Tentar novamente</button></body></html>",
          {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        );
      }),
    );
    return;
  }

  // Estáticos (versionados, sem dados do usuário): cache primeiro.
  // `/wasm/` é o decodificador de código de barras (ZXing-C++, ~1 MB). Precisa
  // entrar aqui explicitamente: requisição de .wasm tem `destination` vazio e
  // não cairia na lista abaixo — e sem ele o motorista sem sinal não bipa.
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/wasm/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    ["style", "script", "image", "font"].includes(req.destination)
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

function abrirDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function lerFila() {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILA, "readonly");
    const req = tx.objectStore(STORE_FILA).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => a.criado_em - b.criado_em));
    req.onerror = () => reject(req.error);
  });
}

async function salvarFila(item) {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILA, "readwrite");
    const req = tx.objectStore(STORE_FILA).put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function apagarFila(clientId) {
  const db = await abrirDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILA, "readwrite");
    const req = tx.objectStore(STORE_FILA).delete(clientId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function formDataDoItem(c) {
  const fd = new FormData();
  fd.set("client_id", c.client_id);
  fd.set("nf_id", c.nf_id);
  fd.set("status", c.status);
  if (c.ocorrencia_tipo) fd.set("ocorrencia_tipo", c.ocorrencia_tipo);
  if (c.ocorrencia_desc) fd.set("ocorrencia_desc", c.ocorrencia_desc);
  if (c.observacao) fd.set("observacao", c.observacao);
  if (c.lat != null) fd.set("lat", String(c.lat));
  if (c.lng != null) fd.set("lng", String(c.lng));
  if (c.gps_precisao != null) fd.set("gps_precisao", String(c.gps_precisao));
  if (c.foto) fd.set("foto", c.foto, "canhoto.jpg");
  if (c.foto_chegada) fd.set("foto_chegada", c.foto_chegada, "chegada.jpg");
  return fd;
}

async function sincronizarEmBackground() {
  const fila = await lerFila();
  let teveFalhaTemporaria = false;
  let alterados = 0;

  for (const item of fila) {
    if (item.bloqueado_por_validacao) continue;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);
      let res;
      try {
        res = await fetch("/api/sync", {
          method: "POST",
          body: formDataDoItem(item),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (res.ok || res.status === 409) {
        await apagarFila(item.client_id);
        alterados++;
      } else if (res.status === 400) {
        let detalhe = "dados inválidos";
        try {
          detalhe = (await res.json()).error || detalhe;
        } catch {}
        await salvarFila({
          ...item,
          bloqueado_por_validacao: `NF ${item.numero_nf}: o servidor recusou os dados — ${detalhe}. O registro foi preservado no aparelho.`,
        });
        alterados++;
      } else {
        const tentativas = (item.tentativas_sync || 0) + 1;
        if (res.status >= 500 && tentativas >= 5) {
          await salvarFila({
            ...item,
            tentativas_sync: tentativas,
            bloqueado_por_validacao: `NF ${item.numero_nf}: erro persistente no servidor (${res.status}) após 5 tentativas. O registro foi preservado no aparelho.`,
          });
          alterados++;
        } else {
          await salvarFila({
            ...item,
            tentativas_sync: tentativas,
            ultimo_erro_sync: `erro ${res.status}`,
          });
          teveFalhaTemporaria = true;
        }
      }
    } catch {
      teveFalhaTemporaria = true;
    }
  }

  if (alterados > 0) {
    const clientes = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const cliente of clientes) cliente.postMessage({ type: "ALIANCA_SYNC_CONCLUIDO" });
  }
  if (teveFalhaTemporaria) throw new Error("sincronização incompleta");
}

self.addEventListener("sync", (event) => {
  if (event.tag === "alianca-sync-canhotos") {
    event.waitUntil(sincronizarEmBackground());
  }
});
