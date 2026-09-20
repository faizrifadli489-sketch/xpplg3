import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrgPositions } from "@/lib/org.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";

export const Route = createFileRoute("/organisasi")({
  head: () => ({
    meta: [
      { title: "Struktur Organisasi — X PPLG 3" },
      { name: "description", content: "Struktur organisasi kelas X PPLG 3." },
      { property: "og:title", content: "Struktur Organisasi — X PPLG 3" },
      { property: "og:description", content: "Struktur organisasi kelas X PPLG 3." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrganisasiPage,
});

function OrganisasiPage() {
  const fetchPositions = useServerFn(listOrgPositions);
  const { data: positions, isLoading } = useQuery({
    queryKey: ["org-positions"],
    queryFn: () => fetchPositions(),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Struktur Organisasi
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">Susunan pengurus kelas X PPLG 3.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      ) : positions && positions.length > 0 ? (
        <div className="border-y border-border">
          {positions.map((position) => (
            <div
              key={position.id}
              className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {position.photo_url ? (
                    <img src={position.photo_url} alt={position.student_name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span className="truncate font-medium text-foreground">{position.student_name}</span>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{position.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">Belum ada data struktur organisasi.</p>
      )}
    </div>
  );
}
