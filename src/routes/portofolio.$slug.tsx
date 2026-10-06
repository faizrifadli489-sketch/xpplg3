import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deletePortfolioCode } from "@/lib/playground.functions";
import { KEEP_FILE, baseName, buildWebDoc, extOf, hasWebEntry, languageOf, parseFiles } from "@/lib/ide-files";
import { usePythonRunner } from "@/lib/python-runner";
import { PythonConsole } from "@/components/python-console";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { CodePreview } from "@/components/code-preview";
import { FileTree } from "@/components/file-tree";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Code2, Lock, Pencil, Play, Square, Trash2 } from "lucide-react";
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

function PortfolioCodePage() {
  const project = Route.useLoaderData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { studentId, isAdmin } = useAuth();
  const { resolvedTheme } = useTheme();
  const remove = useServerFn(deletePortfolioCode);

  const files = useMemo(() => parseFiles(project.files), [project.files]);
  const visible = useMemo(() => files.filter((f) => baseName(f.path) !== KEEP_FILE), [files]);
  const firstFile = useMemo(() => visible.find((f) => f.path === "index.html") ?? visible[0] ?? null, [visible]);
  const isWeb = hasWebEntry(files);
  const srcDoc = useMemo(() => (isWeb ? buildWebDoc(files, null) : ""), [files, isWeb]);

  const [showCode, setShowCode] = useState(!isWeb);
  const [activePath, setActivePath] = useState<string | null>(firstFile?.path ?? null);
  const [selected, setSelected] = useState<string | null>(firstFile?.path ?? null);
  const activeFile = files.find((f) => f.path === activePath) ?? null;

  const isOwner = (!!project.students && project.students.id === studentId) || isAdmin;
  // Close source: selain pemilik/admin hanya boleh melihat hasil, tanpa kode.
  const canSeeCode = project.is_open_source !== false || isOwner;
  const py = usePythonRunner();
  const pyEntry = useMemo(() => visible.find((f) => f.path === "main.py") ?? visible.find((f) => extOf(f.path) === "py") ?? null, [visible]);

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
          {canSeeCode && (
            <Button asChild variant={isOwner ? "default" : "outline"}>
              <Link to="/portofolio/playground" search={{ slug: project.slug }}>
                <Pencil className="mr-1 h-4 w-4" /> {isOwner ? "Edit" : isWeb ? "Remix" : "Buka & jalankan"}
              </Link>
            </Button>
          )}
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

      {isWeb && <CodePreview srcDoc={srcDoc} showConsole={false} className="mt-6 h-[65dvh]" />}

      {!canSeeCode && (
        <div className="mt-6 space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" /> Karya ini close source. Kodenya disembunyikan, kamu hanya bisa menjalankannya.
          </p>
          {!isWeb && pyEntry && (
            <>
              <div className="flex gap-2">
                <Button onClick={() => py.run(visible, pyEntry.path)} disabled={py.active}>
                  <Play className="mr-1 h-4 w-4" /> Run
                </Button>
                <Button variant="destructive" onClick={py.stop} disabled={!py.active}>
                  <Square className="mr-1 h-4 w-4" /> Stop
                </Button>
              </div>
              <div className="h-[50dvh]">
                <PythonConsole segments={py.segments} status={py.status} onInput={py.sendInput} />
              </div>
            </>
          )}
          {!isWeb && !pyEntry && <p className="text-sm text-muted-foreground">Karya jenis ini belum bisa dijalankan tanpa membuka kodenya.</p>}
        </div>
      )}

      <div className="mt-6">
        {canSeeCode && isWeb && (
          <Button variant="outline" size="sm" onClick={() => setShowCode((s) => !s)}>
            <Code2 className="mr-1 h-4 w-4" /> {showCode ? "Sembunyikan kode" : "Lihat kode"}
          </Button>
        )}

        {canSeeCode && showCode && (
          <div className="mt-3 grid h-[60dvh] gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="max-h-48 min-h-0 overflow-hidden rounded-md border sm:max-h-none">
              <FileTree files={files} activePath={activePath} selected={selected} onSelect={setSelected} onOpen={setActivePath} />
            </div>
            <div className="min-h-0">
              {activeFile ? (
                <Suspense fallback={<Skeleton className="h-full w-full" />}>
                  <CodeEditor
                    key={activeFile.path}
                    language={languageOf(activeFile.path)}
                    value={activeFile.content}
                    dark={resolvedTheme === "dark"}
                    readOnly
                  />
                </Suspense>
              ) : (
                <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                  Pilih file di sebelah kiri.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
