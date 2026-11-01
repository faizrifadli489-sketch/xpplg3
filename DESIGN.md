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

## Pass UI/UX 2026-10-30

Ringkasan keputusan dari satu putaran perbaikan UI/UX. Semuanya tetap di dalam identitas di atas
(teal + koral, eyebrow `// ...`, motif file explorer).

### Token hero dan kontras

Teks di hero dulu memakai `text-primary-foreground/80` dan `/70` di atas `bg-primary`; setelah
diukur, kontrasnya 2,3:1 sampai 4,0:1 (di bawah WCAG AA). Sekarang hero punya token sendiri, bukan
opasitas:

- `--hero` / `--hero-foreground` / `--hero-muted` / `--hero-line` / `--hero-panel`
  (Tailwind: `bg-hero`, `text-hero-foreground`, `text-hero-muted`, `border-hero-line`,
  `bg-hero-panel`, `ring-offset-hero`)
- Light: latar `#0d5c52`, teks putih 7,9:1, teks redup `#cfe8e3` 6,1:1
- Dark: latar `#0d2926`, teks `#eaf7f4`, teks redup `#a9d4cc` 9,5:1
- Gaya alternatif cyber/retro menimpa token yang sama lewat selector `section.bg-hero`, jadi
  jangan pakai `bg-primary` untuk hero baru
- `--spark-foreground` light = `#1d0c06` (tombol koral 5,6:1; putih di atas koral cuma 3,4:1)
- `--destructive` light = `#bb322a` (badge hitung mundur mendesak, kurang dari 24 jam: 3,9:1 jadi 4,6:1; teks putih di tombol hapus 5,8:1)

Aturan praktis: teks kecil jangan dibuat redup dengan opasitas, pakai token solid yang sudah
dihitung kontrasnya.

### Status data: memuat, kosong, gagal

Tiga keadaan itu sekarang dibedakan, bukan digabung jadi "kosong":

- Memuat: `Skeleton` di dalam wadah `role="status"` dengan `aria-label`
- Kosong: `EmptyState` (`components/state-notice.tsx`), kotak garis putus-putus, jelaskan apa
  yang akan muncul dan kapan
- Gagal: `ErrorState` (komponen yang sama), `role="alert"`, tombol "Muat ulang" yang memanggil
  `refetch()`, pesan berbeda kalau perangkat sedang offline

Query baru wajib menangani `isError`; jangan biarkan galat jatuh ke cabang "belum ada data".

### Konvensi

- Judul tab: `Halaman | X PPLG 3` (tanpa em dash)
- Target sentuh minimal 40px di layar sentuh (`Button` dan `Input` `h-10`, `md:h-9` di desktop)
- Fokus keyboard: satu aturan global `:focus-visible` di `styles.css`; komponen yang perlu cincin
  lain (hero, kartu yang bisa diklik) menimpanya, bukan menghilangkannya
- Kartu yang seluruhnya bisa diklik memakai tautan judul yang diperluas (`after:absolute
  after:inset-0`) dan cincin fokus di pembungkus (`has-[:focus-visible]`)
- Daftar panjang (siswa) memakai garis tipis seperti daftar absen, bukan puluhan kotak berbingkai
- Baris "sedang berlangsung" di jadwal memakai `bg-primary` yang diperhalus, bukan `bg-accent`
  (di cyber/retro `accent` adalah warna neon penuh dan membuat teks abu-abu tak terbaca)
- Konten tidak boleh disembunyikan `Reveal` kalau JS mati (`@media (scripting: none)`)
