// Service worker: deixa o app funcionar offline.
// Estratégia: responde do cache e atualiza em segundo plano (a versão nova aparece na próxima abertura).
const CACHE = "sistema-v50";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/styles.css", "vendor/chart.umd.js", "data/taco.json",
  "icons/icon.svg", "icons/icon-192.png",
  "js/app.js", "js/core.js", "js/util.js", "js/store.js", "js/game.js", "js/tracks.js", "js/ui.js", "js/ocr.js", "js/fx.js", "js/native.js",
  "js/feitos.js", "js/premios.js", "js/arte-itens.js", "js/sombras.js", "js/conquistas.js", "js/portoes.js", "js/recompensas.js", "js/cartao.js",
  "js/views/home.js", "js/views/treino.js", "js/views/comida.js", "js/views/outros.js",
  "js/views/evolucao.js", "js/views/assiduidade.js", "js/views/condicao.js", "js/views/bloqueio.js", "js/views/avaliacao.js", "js/views/extras.js", "js/views/penalidade.js", "js/views/perfil.js",
  "js/views/recompensas-ui.js", "js/views/exercito.js", "js/views/titulos.js", "js/views/portao.js", "js/views/arsenal.js",
];

self.addEventListener("install", e => {
  // cache: "reload" = baixa da rede, sem pegar cópia antiga do cache HTTP do navegador
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // clima etc. vão direto para a rede
  if (url.pathname.includes("/download/")) return; // instalador e versão do app Android: sempre da rede
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => cached);
    return cached || fresh;
  }));
});
