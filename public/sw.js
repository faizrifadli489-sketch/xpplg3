// Service worker minimal — tujuannya cuma supaya situs bisa di-install sebagai
// PWA (butuh fetch handler terdaftar). Sengaja TIDAK menyimpan cache apa pun:
// situs ini penuh data yang harus selalu terbaru (status kas, hasil voting,
// status tugas), jadi setiap request tetap lewat jaringan seperti biasa.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // no-op: request diteruskan apa adanya ke jaringan
});
