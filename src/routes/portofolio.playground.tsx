import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createPortfolioCode, getPortfolioCode, updatePortfolioCode } from "@/lib/playground.functions";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { CodePreview, type CodeDoc } from "@/components/code-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Play, Upload } from "lucide-react";
import { toast } from "sonner";

// CodeMirror hanya dimuat di browser (lazy), supaya SSR tidak ikut menanggung library editor.
const CodeEditor = lazy(() => import("@/components/code-editor"));

export const Route = createFileRoute("/portofolio/playground")({
  head: () => ({
    meta: [
      { title: "Playground Kode — X PPLG 3" },
      { name: "description", content: "Tulis HTML, CSS, dan JavaScript langsung di browser, lalu publikasikan ke portofolio kelas." },
      { property: "og:title", content: "Playground Kode — X PPLG 3" },
      { property: "og:type", content: "website" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { slug?: string } => ({
    slug: typeof search.slug === "string" && search.slug ? search.slug : undefined,
  }),
  component: PlaygroundPage,
});

const STARTER: CodeDoc = {
  html: `<h1>Halo, dunia!</h1>
<button id="btn">Klik aku</button>
<p id="out"></p>`,
  css: `body {
  font-family: system-ui, sans-serif;
  text-align: center;
  padding: 2rem;
}

button {
  padding: 0.5rem 1rem;
  border-radius: 8px;
}`,
  js: `let hitung = 0;

document.getElementById("btn").addEventListener("click", () => {
  hitung++;
  document.getElementById("out").textContent = "Diklik " + hitung + " kali";
  console.log("klik ke-" + hitung);
});`,
};

type Tab = "html" | "css" | "js";
const TAB_LABEL: Record<Tab, string> = { html: "HTML", css: "CSS", js: "JS" };

function PlaygroundPage() {
  const { slug } = Route.useSearch();
  const navigate = useNavigate();
  const { user, studentId, isAdmin } = useAuth();
  const { resolvedTheme } = useTheme();
  const fetchCode = useServerFn(getPortfolioCode);
  const create = useServerFn(createPortfolioCode);
  const update = useServerFn(updatePortfolioCode);

  const [tab, setTab] = useState<Tab>("html");
  const [code, setCode] = useState<CodeDoc>(STARTER);
  const [runDoc, setRunDoc] = useState<CodeDoc>(STARTER);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const loadedSlug = useRef<string | null>(null);

  // Ref supaya Ctrl+Enter di editor selalu menjalankan kode terbaru.
  const codeRef = useRef(code);
  codeRef.current = code;
  const run = () => setRunDoc({ ...codeRef.current });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["portfolio-code", slug],
    queryFn: () => fetchCode({ data: { slug: slug! } }),
    enabled: !!slug,
  });

  // Muat karya yang dibuka lewat ?slug=. Pemilik mengedit; selain itu jadi remix (disimpan sebagai karya baru).
  useEffect(() => {
    if (!slug || !existing || loadedSlug.current === slug) return;
    loadedSlug.current = slug;
    const doc = { html: existing.html, css: existing.css, js: existing.js };
    setCode(doc);
    setRunDoc(doc);
    const isOwner = !!existing.students && (existing.students.id === studentId || isAdmin);
    if (isOwner) {
      setEditingId(existing.id);
      setTitle(existing.title);
      setDescription(existing.description ?? "");
    } else {
      setEditingId(null);
      setTitle(`Remix ${existing.title}`.slice(0, 100));
      setDescription("");
    }
  }, [slug, existing, studentId, isAdmin]);

  const publishMutation = useMutation({
    mutationFn: () => {
      const payload = { title, description: description || null, ...code };
      return editingId ? update({ data: { id: editingId, ...payload } }) : create({ data: payload });
    },
    onSuccess: (row) => {
      toast.success(editingId ? "Karya diperbarui." : "Karya dipublikasikan.");
      setPublishOpen(false);
      void navigate({ to: "/portofolio/$slug", params: { slug: row.slug } });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan karya."),
  });

  const openPublish = () => {
    if (!user) {
      toast.error("Masuk dengan akun siswa dulu untuk mempublikasikan karya.");
      return;
    }
    if (!studentId && !isAdmin) {
      toast.error("Hanya akun siswa yang bisa mempublikasikan karya.");
      return;
    }
    setPublishOpen(true);
  };

  const dark = resolvedTheme === "dark";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-4 sm:px-6 lg:h-[calc(100dvh-4rem)] lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Kembali ke portofolio">
            <Link to="/portofolio">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold leading-tight">Playground Kode</h1>
            <p className="truncate text-xs text-muted-foreground">
              {editingId ? `Mengedit: ${title}` : slug && existing ? "Mode remix — disimpan sebagai karya baru" : "Ctrl/Cmd + Enter untuk menjalankan"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={run} variant="secondary">
            <Play className="mr-1 h-4 w-4" /> Jalankan
          </Button>
          <Button onClick={openPublish}>
            <Upload className="mr-1 h-4 w-4" /> {editingId ? "Simpan" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <div className="flex h-[55dvh] min-h-0 flex-col gap-2 lg:h-auto">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
                <TabsTrigger key={t} value={t} className="font-mono text-xs">
                  {TAB_LABEL[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative min-h-0 flex-1">
            {slug && loadingExisting ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
                  // Tiga editor terpisah (yang tidak aktif disembunyikan) supaya undo/redo tiap tab tidak tercampur.
                  <div key={t} className={tab === t ? "h-full" : "hidden"}>
                    <CodeEditor
                      language={t}
                      value={code[t]}
                      dark={dark}
                      onRun={run}
                      onChange={(v) => setCode((c) => (c[t] === v ? c : { ...c, [t]: v }))}
                    />
                  </div>
                ))}
              </Suspense>
            )}
          </div>
        </div>

        <CodePreview doc={runDoc} className="h-[45dvh] lg:h-auto" />
      </div>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Simpan perubahan" : "Publikasikan ke portofolio"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              publishMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pg-title">Judul karya</Label>
              <Input id="pg-title" value={title} maxLength={100} required onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-desc">Deskripsi singkat (opsional)</Label>
              <Textarea id="pg-desc" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Karya bisa dilihat semua orang di halaman portofolio. Jangan menaruh data pribadi di dalam kode.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={publishMutation.isPending || !title.trim()}>
                {publishMutation.isPending ? "Menyimpan..." : editingId ? "Simpan" : "Publish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
