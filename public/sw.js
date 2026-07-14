// Service Worker mínimo do Aliança Log.
// O envio de canhotos NÃO depende deste SW: a fila vive no IndexedDB e sincroniza
// pela própria aplicação (lib/offline).
//
// SEGURANÇA: este SW NÃO cacheia páginas autenticadas (navegações) — elas são
// específicas do usuário e cachear vazaria dados para o próximo login no mesmo
// aparelho. Só cacheamos assets estáticos (versionados, sem dados). O cache e a
// fila também são limpos no logout (LogoutButton). v2 = purga qualquer cache
// antigo que ainda tenha páginas autenticadas.
const CACHE = "alianca-log-v2";

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

  // Navegações (páginas autenticadas): SÓ rede, nunca grava no cache.
  // Sem rede, deixa o navegador exibir seu próprio estado offline — não
  // servimos página de outro usuário a partir do cache.
  if (req.mode === "navigate") return;

  // Estáticos (versionados, sem dados do usuário): cache primeiro.
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
