// Service worker: PWA + mode offline.
//
// Prinsip: data SELALU diambil dari jaringan dulu (status kas, voting, tugas harus
// terbaru). Salinan cache hanya dipakai kalau jaringan gagal atau sangat lambat,
// jadi kelas tetap bisa buka jadwal/halaman yang pernah dikunjungi saat offline.
const VERSION = "v2";
const SHELL_CACHE = `xpplg3-shell-${VERSION}`;
const PAGES_CACHE = `xpplg3-pages-${VERSION}`;
const ASSETS_CACHE = `xpplg3-assets-${VERSION}`;
const IMAGES_CACHE = `xpplg3-images-${VERSION}`;
// Nama depan "xpplg3-data" dipakai juga oleh klien (register-sw.ts) untuk menghapusnya saat logout.
const DATA_CACHE = `xpplg3-data-${VERSION}`;
const CURRENT = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE, IMAGES_CACHE, DATA_CACHE];

const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

const NAV_TIMEOUT_MS = 4000;
const DATA_TIMEOUT_MS = 8000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Satu file gagal tidak boleh membatalkan instalasi.
      await Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => undefined)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("xpplg3-") && !CURRENT.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) event.waitUntil(cacheUrls(data.urls));
  if (data.type === "CLEAR_DATA") event.waitUntil(clearData());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // mutasi selalu langsung ke jaringan
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    // Font & foto publik (blog/portofolio/organisasi) boleh disimpan untuk offline.
    const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
    const isPublicPhoto = url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/storage/v1/object/public/");
    if (isFont || isPublicPhoto) event.respondWith(staleWhileRevalidate(event, IMAGES_CACHE, 120));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (url.pathname.startsWith("/_serverFn/")) {
    event.respondWith(networkFirst(event, DATA_CACHE, DATA_TIMEOUT_MS, 80));
    return;
  }

  if (url.pathname.startsWith("/assets/") || /\.(?:png|jpe?g|svg|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(event, ASSETS_CACHE, 150));
  }
});

// ---------- strategi ----------

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function cacheable(res) {
  return res && res.ok && res.type === "basic" && !res.redirected;
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function networkFirst(event, cacheName, timeoutMs, max) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const network = fetch(req).then((res) => {
    if (cacheable(res)) {
      event.waitUntil(cache.put(req, res.clone()).then(() => trim(cacheName, max)));
    }
    return res;
  });
  network.catch(() => undefined); // hindari unhandled rejection kalau cache yang dipakai
  try {
    return await withTimeout(network, timeoutMs);
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return network; // tidak ada salinan: tunggu jaringan (atau gagal apa adanya)
  }
}

async function cacheFirst(event, cacheName, max) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (cacheable(res)) event.waitUntil(cache.put(req, res.clone()).then(() => trim(cacheName, max)));
  return res;
}

async function staleWhileRevalidate(event, cacheName, max) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok || res.type === "opaque") {
        event.waitUntil(cache.put(req, res.clone()).then(() => trim(cacheName, max)));
      }
      return res;
    })
    .catch(() => undefined);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const res = await refresh;
  return res || Response.error();
}

async function handleNavigation(event) {
  const req = event.request;
  const cache = await caches.open(PAGES_CACHE);
  const network = fetch(req).then((res) => {
    if (cacheable(res)) event.waitUntil(cache.put(req, res.clone()).then(() => trim(PAGES_CACHE, 40)));
    return res;
  });
  network.catch(() => undefined);
  try {
    return await withTimeout(network, NAV_TIMEOUT_MS);
  } catch {
    const cached = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
    if (cached) return cached;
    try {
      return await network; // jaringan lambat tapi masih hidup
    } catch {
      const shell = await caches.open(SHELL_CACHE);
      return (await shell.match("/offline.html")) || Response.error();
    }
  }
}

// ---------- pesan dari halaman ----------

// Halaman mengirim daftar file yang baru dimuat supaya kunjungan pertama pun bisa dipakai offline.
async function cacheUrls(urls) {
  const assets = await caches.open(ASSETS_CACHE);
  const pages = await caches.open(PAGES_CACHE);
  await Promise.all(
    urls.map(async (u) => {
      try {
        const url = new URL(u, self.location.origin);
        if (url.origin !== self.location.origin) return;
        if (url.pathname.startsWith("/assets/")) {
          if (await assets.match(url.href)) return;
          const res = await fetch(url.href);
          if (cacheable(res)) await assets.put(url.href, res);
        } else {
          if (await pages.match(url.href, { ignoreVary: true })) return;
          const res = await fetch(url.href, { headers: { Accept: "text/html" } });
          if (cacheable(res)) await pages.put(url.href, res);
        }
      } catch {
        // abaikan; ini hanya optimasi
      }
    }),
  );
  await trim(ASSETS_CACHE, 150);
}

async function clearData() {
  await caches.delete(DATA_CACHE);
}
