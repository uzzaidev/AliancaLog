// Service Worker mínimo do Aliança Log — cache do app shell para abrir offline.
// O envio de canhotos NÃO depende deste SW: a fila vive no IndexedDB e sincroniza
// pela própria aplicação (lib/offline). Aqui só garantimos que o app carregue sem rede.
const CACHE = "alianca-log-v1";

self.addEventListener("install", () => self.skipWaiting());

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

  // Navegações: rede primeiro, com fallback ao cache (offline).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("/motorista/entregas")),
        ),
    );
    return;
  }

  // Estáticos: cache primeiro.
  if (
    url.pathname.startsWith("/_next/") ||
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
