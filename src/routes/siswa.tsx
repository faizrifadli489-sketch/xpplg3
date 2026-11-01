import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listStudents } from "@/lib/students.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState } from "@/components/state-notice";
import { Search } from "lucide-react";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/siswa")({
  head: () => ({
    meta: [
      { title: "Daftar Siswa | X PPLG 3" },
      { name: "description", content: "Daftar lengkap siswa kelas X PPLG 3." },
      { property: "og:title", content: "Daftar Siswa | X PPLG 3" },
      { property: "og:description", content: "Daftar lengkap siswa kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SiswaPage,
});

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function SiswaPage() {
  const fetchStudents = useServerFn(listStudents);
  const {
    data: students,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["students"],
    queryFn: () => fetchStudents(),
  });
  const [query, setQuery] = useState("");

  // Nomor mengikuti urutan daftar asli, jadi tidak berubah saat hasil pencarian menyaring.
  const numbered = useMemo(() => (students ?? []).map((student, index) => ({ student, no: index + 1 })), [students]);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? numbered.filter(({ student }) => `${student.full_name} ${student.nickname ?? ""}`.toLowerCase().includes(needle))
    : numbered;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="max-w-2xl">
          <p className="mb-3 font-mono text-sm text-muted-foreground">// anggota kelas</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Daftar Siswa</h1>
          <p className="mt-4 text-lg text-muted-foreground">Berikut adalah anggota kelas X PPLG 3.</p>
        </div>

        {students && students.length > 0 && (
          <div className="w-full sm:w-72">
            <Label htmlFor="cari-siswa" className="mb-1.5 block text-sm font-medium">
              Cari siswa
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="cari-siswa"
                type="search"
                inputMode="search"
                autoComplete="off"
                placeholder="Nama atau panggilan"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}
      </Reveal>

      {isLoading ? (
        <div role="status" aria-label="Memuat daftar siswa" className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="my-2 h-14 rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Daftar siswa belum bisa dimuat" retrying={isFetching} onRetry={() => void refetch()} />
      ) : students && students.length > 0 ? (
        <>
          <p className="mb-2 font-mono text-xs text-muted-foreground" aria-live="polite">
            {needle ? `${visible.length} dari ${students.length} siswa` : `${students.length} siswa`}
          </p>

          {visible.length > 0 ? (
            // Daftar bergaris tipis (seperti daftar absen), bukan 36 kotak berbingkai.
            <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(({ student, no }) => (
                <li key={student.id} className="flex items-center gap-3.5 border-b border-border py-3">
                  <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground" aria-hidden="true">
                    {String(no).padStart(2, "0")}
                  </span>
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-mono text-xs font-medium text-muted-foreground"
                    aria-hidden="true"
                  >
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt=""
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(student.full_name)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium leading-snug">{student.full_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[student.nickname, student.gender === "L" ? "Laki-laki" : student.gender === "P" ? "Perempuan" : null]
                        .filter(Boolean)
                        .join(" · ") || "-"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={`Tidak ada siswa bernama "${query.trim()}"`}
              action={
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  Hapus pencarian
                </Button>
              }
            >
              Coba tulis sebagian nama, atau pakai nama panggilannya.
            </EmptyState>
          )}
        </>
      ) : (
        <EmptyState title="Belum ada data siswa">Daftar anggota kelas akan muncul di sini setelah admin menambahkannya.</EmptyState>
      )}
    </div>
  );
}
