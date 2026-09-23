import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrgPositions } from "@/lib/org.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { OrgChart } from "@/components/org-chart";
import { Reveal } from "@/components/reveal";

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
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mb-12 max-w-2xl">
        <p className="mb-3 font-mono text-sm text-muted-foreground">// susunan pengurus</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Struktur Organisasi
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">Susunan pengurus kelas X PPLG 3.</p>
      </Reveal>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-md" />
          ))}
        </div>
      ) : positions && positions.length > 0 ? (
        <Reveal>
          <OrgChart positions={positions} />
        </Reveal>
      ) : (
        <p className="text-center text-muted-foreground">Belum ada data struktur organisasi.</p>
      )}
    </div>
  );
}
