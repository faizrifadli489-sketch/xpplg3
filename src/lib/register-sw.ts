// Didaftarkan sekali dari klien (lihat routes/__root.tsx). Aman dipanggil
// berkali-kali; browser yang tidak mendukung service worker akan melewatinya.
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Diamkan saja — PWA bukan fitur kritis, situs tetap harus jalan tanpanya.
    });
  });
}
