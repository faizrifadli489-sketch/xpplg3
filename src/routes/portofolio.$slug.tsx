import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deletePortfolioCode } from "@/lib/playground.functions";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { CodePreview } from "@/components/code-preview";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Code2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

const CodeEditor = lazy(() => import("@/components/code-editor"));

export const Route = createFileRoute("/portofolio/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.fetchQuery({
      queryKey: ["portfolio-code", params.slug],
      queryFn: async () => {
        const fn = (await import("@/lib/playground.functions")).getPortfolioCode;
        return fn({ data: { slug: params.slug } });
      },
    });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — Portofolio X PPLG 3` : "Karya — X PPLG 3";
    const description = loaderData?.description || "Karya kode buatan siswa kelas X PPLG 3.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: PortfolioCodePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Karya tidak ditemukan</h1>
      <p className="mt-2 text-muted-foreground">Karya yang kamu cari tidak ada atau sudah dihapus.</p>
      <Button asChild className="mt-6">
        <Link to="/portofolio">Kembali ke portofolio</Link>
      </Button>
    </div>
  ),
});

type Tab = "html" | "css" | "js";

function PortfolioCodePage() {
  const project = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studentId, isAdmin } = useAuth();
  const { resolvedTheme } = useTheme();
  const remove = useServerFn(deletePortfolioCode);
  const [showCode, setShowCode] = useState(false);
  const [tab, setTab] = useState<Tab>("html");

  const doc = useMemo(() => ({ html: project.html, css: project.css, js: project.js }), [project]);
  const isOwner = (!!project.students && project.students.id === studentId) || isAdmin;

  const deleteMutation = useMutation({
    mutationFn: () => remove({ data: { id: project.id } }),
    onSuccess: () => {
      toast.success("Karya dihapus.");
      void queryClient.invalidateQueries({ queryKey: ["portfolio-codes"] });
      queryClient.removeQueries({ queryKey: ["portfolio-code", project.slug] });
      void navigate({ to: "/portofolio" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus karya."),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/portofolio">
          <ArrowLeft className="mr-1 h-4 w-4" /> Portofolio
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.students?.full_name ?? "Siswa"} · {format(new Date(project.created_at), "d MMMM yyyy", { locale: idLocale })}
          </p>
          {project.description && <p className="mt-3 max-w-2xl text-muted-foreground">{project.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button asChild variant={isOwner ? "default" : "outline"}>
            <Link to="/portofolio/playground" search={{ slug: project.slug }}>
              <Pencil className="mr-1 h-4 w-4" /> {isOwner ? "Edit" : "Remix"}
            </Link>
          </Button>
          {isOwner && (
            <Button
              variant="outline"
              size="icon"
              aria-label="Hapus karya"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm(`Hapus karya "${project.title}"?`)) deleteMutation.mutate();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <CodePreview doc={doc} showConsole={false} className="mt-6 h-[65dvh]" />

      <div className="mt-6">
        <Button variant="outline" size="sm" onClick={() => setShowCode((s) => !s)}>
          <Code2 className="mr-1 h-4 w-4" /> {showCode ? "Sembunyikan kode" : "Lihat kode"}
        </Button>

        {showCode && (
          <div className="mt-3 space-y-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList>
                {(["html", "css", "js"] as Tab[]).map((t) => (
                  <TabsTrigger key={t} value={t} className="font-mono text-xs">
                    {t.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="h-[50dvh]">
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <CodeEditor language={tab} value={project[tab]} dark={resolvedTheme === "dark"} readOnly />
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
