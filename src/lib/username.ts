// Siswa login pakai nama lengkap. Supabase Auth butuh email, jadi nama diubah
// jadi email "palsu" yang konsisten. Email ini tidak pernah dipakai buat kirim surat.
export const STUDENT_EMAIL_DOMAIN = "xpplg3-siswa.vercel.app";

export function slugifyName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function usernameToEmail(username: string): string {
  return `${slugifyName(username)}@${STUDENT_EMAIL_DOMAIN}`;
}

// Input login: kalau ada "@" dianggap email (admin), kalau tidak dianggap nama siswa.
export function loginIdentifierToEmail(input: string): string {
  const value = input.trim();
  if (value.includes("@")) return value;
  return usernameToEmail(value);
}
