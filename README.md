# X PPLG 3 — Web Kelas

Website kelas **X PPLG 3 (Pengembangan Perangkat Lunak dan Gim) SMKN 1 Leuwimunding**: profil kelas, jadwal & piket, daftar siswa, blog, portofolio, kas, voting, dan alat bantu kelas. Bisa dipasang sebagai aplikasi (PWA) dan dibuka offline.

Live: <https://xpplg3.vercel.app>

## Fitur

**Publik (tanpa login)**
- **Beranda** — jadwal pelajaran & piket hari ini, countdown acara/ujian terdekat, judul hero dengan efek ketik
- **Jadwal** — jadwal Senin–Jumat (Sabtu & Minggu libur)
- **Profil, Siswa, Organisasi** — profil kelas, daftar siswa, struktur pengurus
- **Blog** — pengumuman dan dokumentasi kegiatan
- **Portofolio** — karya siswa; thumbnail bisa dibuat otomatis dari screenshot link proyek (thum.io) atau diunggah manual
- **Editor foto** — setiap unggah foto (siswa, profil, organisasi, blog, thumbnail portofolio) dibuka di editor potong: bingkai bisa diseret/diubah ukurannya, pilihan rasio (Bebas, Asli, 1:1, 4:3, 16:9), zoom dan geser dengan jari atau scroll, putar 90°, cermin, dan luruskan miring
- **Pengaturan** (`/pengaturan`) — preferensi per perangkat: gaya tampilan (bawaan, neo-brutalism, glassmorphism, neumorphism, cyberpunk, retro terminal), tema, ukuran teks, kurangi animasi, mode countdown (per hari atau live sampai milidetik), hari awal halaman Jadwal, hapus data offline, pasang aplikasi, dan sembunyikan tombol asisten AI
- **Acak Siswa** (`/acak`) — bagi jadi N kelompok atau pilih N siswa. Bisa atur peserta, kecualikan siswa tetap, hilangkan siswa yang sudah terpilih, dan atur campuran gender per kelompok (0% acak, 50% seimbang, 100% sejenis). Hasil bisa disalin atau dibagikan sebagai gambar

**Siswa (login)**
- **Kas** — status iuran milik sendiri, saldo kas kelas, dan daftar pengeluaran
- **Kotak saran**, **voting**, **profil saya**, ganti password
- **Asisten AI** — chat CS kecil yang menjawab soal jadwal, piket, acara, dan kas milik sendiri

**Dashboard admin** (`/admin`)
- Kelola siswa & akun (buat akun, reset password, beri role), blog, organisasi, portofolio, jadwal & piket, acara, saran, voting, kas, dan profil kelas
- **Kas harian otomatis** — tagihan "Kas Harian" dibuat otomatis tiap hari sekolah (Senin–Jumat) dengan harga yang bisa diatur; tagihan manual untuk iuran khusus tetap ada
- **Asisten AI** — nyalakan/matikan, kelola beberapa API key (dipakai bergiliran, otomatis pindah kalau gagal), edit system prompt dan info tambahan, pilih data yang boleh dibaca AI, batas pertanyaan per siswa per hari

### Role

| Role | Akses dashboard |
| --- | --- |
| `admin` | Semua tab |
| `bendahara` | Kas |
| `sekretaris` | Blog dan Acara |

Admin memberi atau mencabut role bendahara/sekretaris lewat **Dashboard → Siswa** (chip di bawah nama siswa yang sudah punya akun). Role `admin` hanya dibuat lewat setup awal.

## Teknologi

- [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router, TanStack Query), TypeScript
- Tailwind CSS 4 + komponen shadcn/ui (Radix)
- [Supabase](https://supabase.com) — Postgres, Auth, Storage, dan RLS
- PWA: `public/manifest.webmanifest` + service worker `public/sw.js` (cache offline, halaman fallback `public/offline.html`)

## Menjalankan secara lokal

Butuh Node.js dan npm.

```sh
git clone https://github.com/faizrifadli489-sketch/xpplg3.git
cd xpplg3
npm install
cp .env.example .env   # lalu isi nilainya (lihat di bawah)
npm run dev
```

Perintah lain: `npm run build`, `npm run preview`, `npm run lint`, `npm run format`.

### Environment variable

| Variabel | Keterangan |
| --- | --- |
| `SUPABASE_URL`, `VITE_SUPABASE_URL` | URL project Supabase |
| `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable (anon) key |
| `SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PROJECT_ID` | ID project Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key. **Hanya di server**, jangan diberi awalan `VITE_` dan jangan di-commit. Dipakai untuk setup admin, pembuatan akun siswa, dan asisten AI |

API key untuk asisten AI **tidak** disimpan di env, tapi diisi lewat Dashboard → AI dan disimpan di database (hanya bisa dibaca admin dan server).

## Database

Skema ada di `supabase/migrations/`. Jalankan berurutan lewat Supabase CLI atau SQL Editor. Perhatikan:

- Migration `20260927100000_add_bendahara_sekretaris_roles.sql` (menambah value enum) harus dijalankan **terpisah** dan lebih dulu dari `20260927100100_kas_auto_daily_and_role_access.sql`.
- Folder ini belum mencakup seluruh tabel (misalnya `cash_*`, `events`, `schedule_entries`, `piket_assignments` dibuat lewat Lovable Cloud). Untuk project Supabase baru, ekspor skema dari project yang sudah ada.
- `src/integrations/supabase/types.ts` adalah tipe hasil generate; regenerate dengan `supabase gen types typescript` setelah skema berubah.

### Admin pertama

Kalau belum ada role sama sekali, buka `/setup` untuk membuat akun admin pertama. Halaman ini otomatis terkunci setelah admin ada. Selanjutnya admin membuat akun siswa dari Dashboard → Siswa.

## Struktur singkat

```
src/routes/        halaman (file-based routing); _authenticated/ = butuh login, admin.* = dashboard
src/lib/           server function (*.functions.ts) dan helper
src/components/    komponen UI dan widget (AI chat, thumbnail portofolio, banner offline, dll.)
src/integrations/  klien Supabase (browser dan server) + tipe
public/            manifest PWA, service worker, ikon
supabase/          migration SQL
```

Akses data dijaga di dua lapis: **RLS di Postgres** dan pengecekan role di server function. Jadi pembatasan role tidak cuma bergantung pada tampilan.

## Deploy

Dideploy di Vercel. Isi environment variable di atas pada pengaturan project Vercel, lalu push ke branch utama. Jalankan migration baru di Supabase **sebelum** meng-deploy kode yang membutuhkannya.

Proyek ini juga tersambung ke [Lovable](https://lovable.dev); commit di branch utama otomatis tersinkron ke editornya. Hindari menulis ulang riwayat git yang sudah di-push.
