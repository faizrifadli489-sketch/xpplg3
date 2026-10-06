import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createPortfolioCode, createProject, getPortfolioCode, getProject, runPlaygroundCode, saveProject, updatePortfolioCode } from "@/lib/playground.functions";
import {
  STARTER_FILES,
  SERVER_LANG_LABEL,
  MAX_FILES,
  MAX_FILE_CHARS,
  MAX_TOTAL_CHARS,
  baseName,
  buildWebDoc,
  deletePath,
  dirOf,
  isFolder,
  joinPath,
  languageOf,
  normalizePath,
  parseFiles,
  pathExists,
  renamePath,
  runTargetFor,
  templateFor,
  totalChars,
  KEEP_FILE,
  type IdeFile,
} from "@/lib/ide-files";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/use-theme";
import { CodePreview } from "@/components/code-preview";
import { FileTree } from "@/components/file-tree";
import { ChoiceGroup, ProjectPicker } from "@/components/project-picker";
import { RunOutput, type RunResult } from "@/components/run-output";
import { PythonConsole } from "@/components/python-console";
import { usePythonRunner } from "@/lib/python-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Globe, Lock, Menu, Play, Save, Square, Upload, X } from "lucide-react";
import { toast } from "sonner";

// CodeMirror hanya dimuat di browser (lazy), supaya SSR tidak ikut menanggung library editor.
const CodeEditor = lazy(() => import("@/components/code-editor"));

export const Route = createFileRoute("/portofolio/playground")({
  head: () => ({
    meta: [
      { title: "Playground Kode — X PPLG 3" },
      { name: "description", content: "Tulis dan jalankan kode (HTML, CSS, JS, Python, C, C++, Java, PHP, SQL) langsung di browser, lalu publikasikan ke portofolio kelas." },
      { property: "og:title", content: "Playground Kode — X PPLG 3" },
      { property: "og:type", content: "website" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { slug?: string; project?: string } => ({
    slug: typeof search.slug === "string" && search.slug ? search.slug : undefined,
    project: typeof search.project === "string" && search.project ? search.project : undefined,
  }),
  component: PlaygroundPage,
});

type PanelTab = "preview" | "output";

function PlaygroundPage() {
  const { slug, project } = Route.useSearch();
  const navigate = useNavigate();
  const { user, studentId, isAdmin, isLoading: authLoading, roleLoading } = useAuth();
  const { resolvedTheme } = useTheme();
  const fetchCode = useServerFn(getPortfolioCode);
  const create = useServerFn(createPortfolioCode);
  const update = useServerFn(updatePortfolioCode);
  const execute = useServerFn(runPlaygroundCode);
  const fetchProject = useServerFn(getProject);
  const createProj = useServerFn(createProject);
  const saveProj = useServerFn(saveProject);

  const [files, setFiles] = useState<IdeFile[]>(STARTER_FILES);
  const [openPaths, setOpenPaths] = useState<string[]>(["index.html"]);
  const [activePath, setActivePath] = useState<string | null>("index.html");
  const [selected, setSelected] = useState<string | null>("index.html");
  const [explorerOpen, setExplorerOpen] = useState(false);

  const [srcDoc, setSrcDoc] = useState(() => buildWebDoc(STARTER_FILES, "index.html"));
  const [panelTab, setPanelTab] = useState<PanelTab>("preview");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const py = usePythonRunner();
  const [outputKind, setOutputKind] = useState<"python" | "server">("server");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [pubVisibility, setPubVisibility] = useState<"open" | "closed">("open");
  const loadedSlug = useRef<string | null>(null);

  // Proyek tersimpan (akun login). scratch = coba tanpa menyimpan.
  const [scratch, setScratch] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projName, setProjName] = useState("");
  const [visibility, setVisibility] = useState<"open" | "closed">("closed");
  const [saveOpen, setSaveOpen] = useState(false);
  const loadedProject = useRef<string | null>(null);

  const { data: savedProject, isLoading: loadingProject } = useQuery({
    queryKey: ["playground-project", project],
    queryFn: () => fetchProject({ data: { id: project! } }),
    enabled: !!project && !!user,
  });

  // Muat proyek yang dibuka lewat ?project=. Pemilik mengedit; selain itu jadi salinan (disimpan sebagai proyek baru).
  useEffect(() => {
    if (!project || !savedProject || loadedProject.current === project) return;
    loadedProject.current = project;
    const loaded = parseFiles(savedProject.files);
    const first = loaded.find((f) => f.path === "index.html") ?? loaded.find((f) => baseName(f.path) !== KEEP_FILE) ?? null;
    setFiles(loaded);
    setOpenPaths(first ? [first.path] : []);
    setActivePath(first?.path ?? null);
    setSelected(first?.path ?? null);
    setSrcDoc(buildWebDoc(loaded, first?.path ?? null));
    if (savedProject.owner_id === user?.id) {
      setProjectId(savedProject.id);
      setProjName(savedProject.name);
      setVisibility(savedProject.visibility as "open" | "closed");
    } else {
      setProjectId(null);
      setProjName(`Salinan ${savedProject.name}`.slice(0, 100));
      setVisibility("closed");
    }
  }, [project, savedProject, user?.id]);

  const checkSize = () => {
    if (files.some((f) => f.content.length > MAX_FILE_CHARS)) return toast.error("Ada file yang terlalu panjang (maks 100.000 karakter).");
    if (totalChars(files) > MAX_TOTAL_CHARS) return toast.error("Total isi proyek terlalu besar (maks 300.000 karakter).");
    return true;
  };
  const projectFiles = () => files.map((f) => ({ path: f.path, content: f.content }));

  const saveMutation = useMutation({
    mutationFn: () => saveProj({ data: { id: projectId!, name: projName, visibility, files: projectFiles() } }),
    onSuccess: () => toast.success("Proyek disimpan."),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan proyek."),
  });

  const createCopyMutation = useMutation({
    mutationFn: () => createProj({ data: { name: projName, visibility, files: projectFiles() } }),
    onSuccess: (row) => {
      toast.success("Proyek disimpan.");
      setSaveOpen(false);
      void navigate({ to: "/portofolio/playground", search: { project: row.id }, replace: true });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan proyek."),
  });

  const visibilityMutation = useMutation({
    mutationFn: (next: "open" | "closed") => saveProj({ data: { id: projectId!, visibility: next } }),
    onSuccess: (_row, next) => {
      setVisibility(next);
      toast.success(next === "open" ? "Proyek jadi open source." : "Proyek jadi close source.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mengubah visibilitas."),
  });

  const onSaveProject = () => {
    if (!user) return toast.error("Masuk dulu untuk menyimpan proyek.");
    if (checkSize() !== true) return;
    if (projectId) saveMutation.mutate();
    else {
      if (!projName) setProjName(title || "Proyekku");
      setSaveOpen(true);
    }
  };

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["portfolio-code", slug],
    queryFn: () => fetchCode({ data: { slug: slug! } }),
    enabled: !!slug,
  });

  // Muat karya yang dibuka lewat ?slug=. Pemilik mengedit; selain itu jadi remix (disimpan sebagai karya baru).
  useEffect(() => {
    if (!slug || !existing || loadedSlug.current === slug) return;
    if (authLoading || roleLoading) return;
    const owner = !!existing.students && (existing.students.id === studentId || isAdmin);
    // Close source: orang lain tidak boleh membuka kodenya di editor (remix).
    if (existing.is_open_source === false && !owner) {
      loadedSlug.current = slug;
      toast.error("Karya ini close source, kodenya tidak bisa dibuka.");
      void navigate({ to: "/portofolio/$slug", params: { slug }, replace: true });
      return;
    }
    loadedSlug.current = slug;
    const loaded = parseFiles(existing.files);
    const first = loaded.find((f) => f.path === "index.html") ?? loaded.find((f) => baseName(f.path) !== KEEP_FILE) ?? null;
    setFiles(loaded);
    setOpenPaths(first ? [first.path] : []);
    setActivePath(first?.path ?? null);
    setSelected(first?.path ?? null);
    setSrcDoc(buildWebDoc(loaded, first?.path ?? null));
    const isOwner = !!existing.students && (existing.students.id === studentId || isAdmin);
    if (isOwner) {
      setEditingId(existing.id);
      setPubVisibility(existing.is_open_source === false ? "closed" : "open");
      setTitle(existing.title);
      setDescription(existing.description ?? "");
    } else {
      setEditingId(null);
      setTitle(`Remix ${existing.title}`.slice(0, 100));
      setDescription("");
    }
  }, [slug, existing, studentId, isAdmin, authLoading, roleLoading, navigate]);

  // ---------- Operasi file ----------

  const openFile = (path: string) => {
    setOpenPaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActivePath(path);
    setExplorerOpen(false);
  };

  const closeTab = (path: string) => {
    const next = openPaths.filter((p) => p !== path);
    setOpenPaths(next);
    if (activePath === path) {
      const idx = openPaths.indexOf(path);
      setActivePath(next[Math.min(idx, next.length - 1)] ?? null);
    }
  };

  const setContent = (path: string, value: string) =>
    setFiles((prev) => prev.map((f) => (f.path === path && f.content !== value ? { ...f, content: value } : f)));

  // Folder tempat file/folder baru dibuat: folder terpilih, atau induk dari file terpilih.
  const targetDir = () => {
    if (!selected) return "";
    return isFolder(files, selected) ? selected : dirOf(selected);
  };

  const newFile = () => {
    if (files.length >= MAX_FILES) return toast.error(`Maksimal ${MAX_FILES} file.`);
    const dir = targetDir();
    const input = window.prompt(`Nama file baru${dir ? ` di ${dir}/` : ""} (contoh: main.py, app.js, data/query.sql)`);
    if (input === null) return;
    const norm = normalizePath(joinPath(dir, input.trim()));
    if (!norm.ok) return toast.error(norm.error);
    if (pathExists(files, norm.path)) return toast.error("Nama itu sudah dipakai.");
    if (baseName(norm.path) === KEEP_FILE) return toast.error("Nama itu dipakai sistem.");
    setFiles((prev) => [...prev, { path: norm.path, content: templateFor(norm.path) }]);
    setSelected(norm.path);
    openFile(norm.path);
  };

  const newFolder = () => {
    const dir = targetDir();
    const input = window.prompt(`Nama folder baru${dir ? ` di ${dir}/` : ""}`);
    if (input === null) return;
    const norm = normalizePath(joinPath(dir, input.trim()));
    if (!norm.ok) return toast.error(norm.error);
    if (pathExists(files, norm.path)) return toast.error("Nama itu sudah dipakai.");
    setFiles((prev) => [...prev, { path: `${norm.path}/${KEEP_FILE}`, content: "" }]);
    setSelected(norm.path);
  };

  const renameSelected = () => {
    if (!selected) return;
    const input = window.prompt("Nama/path baru", selected);
    if (input === null || input.trim() === selected) return;
    const norm = normalizePath(input);
    if (!norm.ok) return toast.error(norm.error);
    if (pathExists(files, norm.path)) return toast.error("Nama itu sudah dipakai.");
    if (norm.path.startsWith(`${selected}/`)) return toast.error("Folder tidak bisa dipindah ke dalam dirinya sendiri.");
    const remap = (p: string) => (p === selected ? norm.path : p.startsWith(`${selected}/`) ? `${norm.path}/${p.slice(selected.length + 1)}` : p);
    setFiles((prev) => renamePath(prev, selected, norm.path));
    setOpenPaths((prev) => prev.map(remap));
    setActivePath((prev) => (prev ? remap(prev) : prev));
    setSelected(norm.path);
  };

  const deleteSelected = () => {
    if (!selected) return;
    const folder = isFolder(files, selected);
    const label = folder ? `folder "${selected}" beserta isinya` : `file "${selected}"`;
    if (!window.confirm(`Hapus ${label}?`)) return;
    const gone = (p: string) => p === selected || p.startsWith(`${selected}/`);
    setFiles((prev) => deletePath(prev, selected));
    setOpenPaths((prev) => prev.filter((p) => !gone(p)));
    if (activePath && gone(activePath)) {
      const remaining = openPaths.filter((p) => !gone(p));
      setActivePath(remaining[remaining.length - 1] ?? null);
    }
    setSelected(null);
  };

  // ---------- Menjalankan ----------

  const run = async () => {
    if (!activePath) return toast.error("Buka sebuah file dulu.");
    const target = runTargetFor(activePath);

    if (target.kind === "none") return toast.error(target.reason);

    if (target.kind === "web") {
      setSrcDoc(buildWebDoc(files, activePath));
      setPanelTab("preview");
      return;
    }

    // Python jalan di browser (Pyodide): live output, input() interaktif, tanpa login.
    if (target.language === "python") {
      setOutputKind("python");
      setPanelTab("output");
      py.run(files.filter((f) => baseName(f.path) !== KEEP_FILE), activePath);
      return;
    }

    if (!user) return toast.error("Masuk dengan akun kelas dulu untuk menjalankan " + SERVER_LANG_LABEL[target.language] + ".");
    setOutputKind("server");
    setPanelTab("output");
    setRunning(true);
    try {
      const res = await execute({
        data: {
          language: target.language,
          entry: activePath,
          files: files.filter((f) => baseName(f.path) !== KEEP_FILE),
          stdin,
        },
      });
      setResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menjalankan kode.";
      setResult({ language: SERVER_LANG_LABEL[target.language], status: "Gagal", stdout: "", stderr: message, compile: "", exitCode: null, time: null });
    } finally {
      setRunning(false);
    }
  };

  // Ctrl/Cmd+Enter di dalam editor selalu memakai state terbaru.
  const runRef = useRef(run);
  runRef.current = run;
  const onRun = useRef(() => void runRef.current()).current;

  // ---------- Publish ----------

  const publishMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        description: description || null,
        files: files.map((f) => ({ path: f.path, content: f.content })),
        openSource: pubVisibility === "open",
      };
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
    if (!user) return toast.error("Masuk dengan akun siswa dulu untuk mempublikasikan karya.");
    if (!studentId && !isAdmin) return toast.error("Hanya akun siswa yang bisa mempublikasikan karya.");
    if (files.some((f) => f.content.length > MAX_FILE_CHARS)) return toast.error("Ada file yang terlalu panjang (maks 100.000 karakter).");
    if (totalChars(files) > MAX_TOTAL_CHARS) return toast.error("Total isi proyek terlalu besar (maks 300.000 karakter).");
    // Proyek tersimpan membawa pilihan open/close source-nya ke publish pertama.
    if (!editingId && projectId) setPubVisibility(visibility);
    setPublishOpen(true);
  };

  const openProject = (id: string) => void navigate({ to: "/portofolio/playground", search: { project: id } });

  // Tanpa ?slug= / ?project= dan belum pilih "coba tanpa menyimpan": tampilkan daftar proyek.
  if (!slug && !project && !scratch) return <ProjectPicker onOpen={openProject} onScratch={() => setScratch(true)} />;

  const dark = resolvedTheme === "dark";
  const activeTarget = activePath ? runTargetFor(activePath) : null;

  const explorer = (
    <FileTree
      files={files}
      activePath={activePath}
      selected={selected}
      onSelect={setSelected}
      onOpen={openFile}
      onNewFile={newFile}
      onNewFolder={newFolder}
      onRename={renameSelected}
      onDelete={deleteSelected}
    />
  );

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-4 sm:px-6 lg:h-[calc(100dvh-4rem)] lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Kembali ke portofolio">
            <Link to="/portofolio">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="lg:hidden" aria-label="Buka Explorer" onClick={() => setExplorerOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-semibold leading-tight">Playground Kode</h1>
            <p className="truncate text-xs text-muted-foreground">
              {projectId
                ? `Proyek: ${projName}`
                : project && savedProject
                  ? "Proyek orang lain — simpan sebagai salinanmu"
                  : editingId
                ? `Mengedit: ${title}`
                : slug && existing
                  ? "Mode remix — disimpan sebagai karya baru"
                  : "Ctrl/Cmd + Enter untuk menjalankan"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {projectId && (
            <Button
              variant="outline"
              disabled={visibilityMutation.isPending}
              onClick={() => visibilityMutation.mutate(visibility === "open" ? "closed" : "open")}
              title="Klik untuk ganti open/close source"
            >
              {visibility === "open" ? <Globe className="mr-1 h-4 w-4" /> : <Lock className="mr-1 h-4 w-4" />}
              {visibility === "open" ? "Open source" : "Close source"}
            </Button>
          )}
          <Button variant="outline" onClick={onSaveProject} disabled={saveMutation.isPending || (!!project && loadingProject)}>
            <Save className="mr-1 h-4 w-4" /> {saveMutation.isPending ? "Menyimpan..." : projectId ? "Simpan" : "Simpan Proyek"}
          </Button>
          {py.active ? (
            <Button onClick={py.stop} variant="destructive">
              <Square className="mr-1 h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button onClick={() => void run()} variant="secondary" disabled={running}>
              <Play className="mr-1 h-4 w-4" />
              {activeTarget?.kind === "server" ? `Jalankan ${SERVER_LANG_LABEL[activeTarget.language]}` : "Jalankan"}
            </Button>
          )}
          <Button onClick={openPublish}>
            <Upload className="mr-1 h-4 w-4" /> {editingId ? "Perbarui Karya" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,0.9fr)]">
        {/* Explorer (desktop) */}
        <aside className="hidden min-h-0 overflow-hidden rounded-md border bg-background lg:block">{explorer}</aside>

        {/* Editor + tab file */}
        <div className="flex h-[55dvh] min-h-0 flex-col gap-2 lg:h-auto">
          <div className="flex items-stretch gap-1 overflow-x-auto border-b">
            {openPaths.length === 0 && <span className="px-2 py-1.5 text-xs text-muted-foreground">Buka file dari Explorer</span>}
            {openPaths.map((p) => (
              <div
                key={p}
                className={`flex shrink-0 items-center gap-1 rounded-t-md border border-b-0 pl-3 pr-1 text-sm ${
                  activePath === p ? "bg-background font-medium" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                <button type="button" className="py-1.5" onClick={() => setActivePath(p)} title={p}>
                  {baseName(p)}
                </button>
                <button type="button" className="rounded p-1 hover:bg-muted" aria-label={`Tutup ${baseName(p)}`} onClick={() => closeTab(p)}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="relative min-h-0 flex-1">
            {(slug && loadingExisting) || (project && loadingProject) ? (
              <Skeleton className="h-full w-full" />
            ) : openPaths.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Belum ada file yang dibuka.
              </div>
            ) : (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                {/* Satu editor per file terbuka (yang tidak aktif disembunyikan) supaya undo/redo tiap file terpisah. */}
                {openPaths.map((p) => {
                  const file = files.find((f) => f.path === p);
                  if (!file) return null;
                  return (
                    <div key={p} className={activePath === p ? "h-full" : "hidden"}>
                      <CodeEditor
                        language={languageOf(p)}
                        value={file.content}
                        dark={dark}
                        onRun={onRun}
                        onChange={(v) => setContent(p, v)}
                      />
                    </div>
                  );
                })}
              </Suspense>
            )}
          </div>
        </div>

        {/* Panel hasil */}
        <div className="flex h-[45dvh] min-h-0 flex-col gap-2 lg:h-auto">
          <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as PanelTab)}>
            <TabsList>
              <TabsTrigger value="preview" className="text-xs">
                Preview
              </TabsTrigger>
              <TabsTrigger value="output" className="text-xs">
                Output
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="min-h-0 flex-1">
            {panelTab === "preview" ? (
              <CodePreview srcDoc={srcDoc} className="h-full" />
            ) : outputKind === "python" ? (
              <PythonConsole segments={py.segments} status={py.status} onInput={py.sendInput} />
            ) : (
              <RunOutput result={result} running={running} stdin={stdin} onStdinChange={setStdin} />
            )}
          </div>
        </div>
      </div>

      {/* Explorer (mobile) */}
      <Sheet open={explorerOpen} onOpenChange={setExplorerOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Explorer</SheetTitle>
          </SheetHeader>
          <div className="h-full pt-8">{explorer}</div>
        </SheetContent>
      </Sheet>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simpan sebagai proyek</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createCopyMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="sp-name">Nama proyek</Label>
              <Input id="sp-name" value={projName} maxLength={100} required onChange={(e) => setProjName(e.target.value)} />
            </div>
            <ChoiceGroup
              label="Kode proyek"
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: "closed", title: "Close source", desc: "Hanya kamu yang bisa lihat", icon: <Lock className="h-4 w-4" /> },
                { value: "open", title: "Open source", desc: "User lain bisa lihat kodenya", icon: <Globe className="h-4 w-4" /> },
              ]}
            />
            <DialogFooter>
              <Button type="submit" disabled={createCopyMutation.isPending || !projName.trim()}>
                {createCopyMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <ChoiceGroup
              label="Kode karya"
              value={pubVisibility}
              onChange={setPubVisibility}
              options={[
                { value: "open", title: "Open source", desc: "Semua orang bisa lihat kodenya", icon: <Globe className="h-4 w-4" /> },
                { value: "closed", title: "Close source", desc: "Orang lain hanya bisa menjalankan", icon: <Lock className="h-4 w-4" /> },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              {pubVisibility === "open"
                ? `Semua file (${files.filter((f) => baseName(f.path) !== KEEP_FILE).length}) bisa dilihat semua orang di halaman portofolio. Jangan menaruh data pribadi atau kata sandi di dalam kode.`
                : "Kodenya disembunyikan dari halaman karya, tapi tetap dijalankan di browser pengunjung. Jangan menaruh kata sandi atau data rahasia di dalam kode."}
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
