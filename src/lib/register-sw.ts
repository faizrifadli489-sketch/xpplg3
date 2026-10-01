// Didaftarkan sekali dari klien (lihat routes/__root.tsx). Aman dipanggil
// berkali-kali; browser yang tidak mendukung service worker akan melewatinya.
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const start = async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      primeOfflineCache(reg);
    } catch {
      // Diamkan saja — PWA bukan fitur kritis, situs tetap harus jalan tanpanya.
    }
  };
  // Dipanggil dari useEffect, jadi event "load" bisa saja sudah lewat.
  if (document.readyState === "complete") void start();
  else window.addEventListener("load", () => void start(), { once: true });
}

/** Simpan file yang baru dimuat halaman ini, supaya kunjungan pertama pun bisa dibuka offline. */
function primeOfflineCache(reg: ServiceWorkerRegistration) {
  const target = reg.active ?? navigator.serviceWorker.controller;
  if (!target) return;

  const urls = performance
    .getEntriesByType("resource")
    .map((e) => e.name)
    .filter((name) => {
      try {
        const u = new URL(name);
        return u.origin === location.origin && u.pathname.startsWith("/assets/");
      } catch {
        return false;
      }
    });
  urls.push(location.pathname + location.search);
  target.postMessage({ type: "CACHE_URLS", urls });
}

/** Hapus salinan data offline (dipanggil saat logout supaya data akun tidak tertinggal di perangkat). */
export async function clearOfflineData() {
  if (typeof caches === "undefined") return;
  try {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n.startsWith("xpplg3-data")).map((n) => caches.delete(n)));
  } catch {
    // abaikan
  }
}

const SHELL_PREFIX = "xpplg3-shell"; // berisi halaman offline & ikon, jangan dihapus

/** Ringkasan data offline di perangkat ini. */
export async function getOfflineStats(): Promise<{ files: number; bytes: number | null; swActive: boolean }> {
  let files = 0;
  try {
    if (typeof caches !== "undefined") {
      const names = (await caches.keys()).filter((n) => n.startsWith("xpplg3-") && !n.startsWith(SHELL_PREFIX));
      for (const name of names) files += (await (await caches.open(name)).keys()).length;
    }
  } catch {
    // abaikan
  }
  let bytes: number | null = null;
  try {
    const est = await navigator.storage?.estimate?.();
    bytes = est?.usage ?? null;
  } catch {
    // abaikan
  }
  const swActive = typeof navigator !== "undefined" && "serviceWorker" in navigator && !!navigator.serviceWorker.controller;
  return { files, bytes, swActive };
}

/** Hapus semua salinan offline (halaman, data, file, foto). Halaman fallback offline tetap disimpan. */
export async function clearAllOfflineCaches(): Promise<number> {
  if (typeof caches === "undefined") return 0;
  const names = (await caches.keys()).filter((n) => n.startsWith("xpplg3-") && !n.startsWith(SHELL_PREFIX));
  await Promise.all(names.map((n) => caches.delete(n)));
  return names.length;
}
