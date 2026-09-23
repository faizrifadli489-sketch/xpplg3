import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStudents } from "@/lib/students.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";
import { Reveal } from "@/components/reveal";

export const Route = createFileRoute("/siswa")({
  head: () => ({
    meta: [
      { title: "Daftar Siswa — X PPLG 3" },
      { name: "description", content: "Daftar lengkap siswa kelas X PPLG 3." },
      { property: "og:title", content: "Daftar Siswa — X PPLG 3" },
      { property: "og:description", content: "Daftar lengkap siswa kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SiswaPage,
});

function SiswaPage() {
  const fetchStudents = useServerFn(listStudents);
  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => fetchStudents(),
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mb-12 max-w-2xl">
        <p className="mb-3 font-mono text-sm text-muted-foreground">// anggota kelas</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Daftar Siswa</h1>
        <p className="mt-4 text-lg text-muted-foreground">Berikut adalah anggota kelas X PPLG 3.</p>
      </Reveal>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : students && students.length > 0 ? (
        <Reveal className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <Card key={student.id} className="rounded-lg shadow-none">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-medium">{student.full_name}</h3>
                  {student.nickname && <p className="text-sm text-muted-foreground">{student.nickname}</p>}
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {student.gender === "L" ? "Laki-laki" : student.gender === "P" ? "Perempuan" : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      ) : (
        <p className="text-center text-muted-foreground">Belum ada data siswa.</p>
      )}
    </div>
  );
}
