# DESIGN.md — X PPLG 3

Arah desain situs kelas X PPLG 3 SMKN 1 Leuwimunding. Ditulis mundur (bukan sebelum desain
dibikin), sebagai bagian dari perbaikan temuan #9 audit antislop — supaya ke depannya ada satu
rujukan tertulis, bukan cuma disebutin di chat.

## Identitas

Kelas PPLG (Pengembangan Perangkat Lunak dan Gim). Motif visualnya diambil dari dunia kerja
siswa sendiri: editor kode, file explorer, komentar kode (`// ...`) sebagai pengganti eyebrow
label yang biasanya all-caps. Nadanya tenang dan rapi, bukan "AI startup" yang riuh.

## Palet

- `--primary` (teal, "signal" / warna "build succeeded"): `#12786b` (light) / `#2fb6a3` (dark)
- `--spark` (aksen, dipakai sedikit dan sengaja): `#ef5a34` (light) / `#ff7a54` (dark)
- `--background` / `--foreground` / `--card` / `--border`: lihat `src/styles.css`, sudah ada set
  lengkap untuk light dan dark (class `.dark`)
- Neutral (putih/hitam/abu) tidak dihitung sebagai warna inti

## Tipografi

- Display/heading: **Space Grotesk**
- Body: **IBM Plex Sans**
- Mono (label, komentar kode, data): **IBM Plex Mono**

## Motif identitas (identity motif)

- Eyebrow di atas judul ditulis gaya komentar kode: `// begini`, bukan pill badge atau all-caps
  tracked label
- Panel "src/routes" di beranda: daftar halaman gaya file explorer, bukan dekorasi kosong
- Ikon aplikasi: monogram "X3", navy `#141824` + teal `#2fb6a3`

## Dial (Part 3 antislop)

> Reading this as: website kelas SMK untuk siswa dan wali kelas, gaya minimalis-modern ala
> Linear/Stripe, dial ENERGY 1 / RHYTHM 2 / MOTION 2.

- **ENERGY 1** (tenang) — whitespace lega, aksen tipis, gak teriak-teriak
- **RHYTHM 2** (konsisten dengan beberapa variasi sengaja) — hero beda komposisi dari section
  biasa, tapi section-section biasa sendiri konsisten satu pola
- **MOTION 2** (scroll-reveal + satu momen bertanda tangan) — animasi scroll pakai satu pola
  konsisten (`components/reveal.tsx`), plus satu momen spesifik: efek ketik-hapus di judul
  beranda (`components/typewriter-heading.tsx`), yang sengaja dibatasi jumlah siklusnya
  (lihat komentar `MAX_CYCLES` di file itu) supaya bukan animasi tanpa akhir

## Motion budget

Semua animasi lewat dua komponen (`Reveal`, `TypewriterHeading`), keduanya hormat
`prefers-reduced-motion`. Gak ada parallax, gak ada glow/glassmorphism, gak ada animasi
per-kartu yang di-stagger untuk grid besar (siswa, blog) — itu sengaja dihindarin karena bikin
lag kalau isinya banyak.
