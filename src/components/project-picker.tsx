import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createProject, deleteProject, listMyProjects, listOpenProjects } from "@/lib/playground.functions";
import { STARTER_FILES, type IdeFile } from "@/lib/ide-files";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, FileCode2, FilePlus2, Globe, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Kind = "empty" | "html";
type Visibility = "open" | "closed";

const EMPTY_FILES: IdeFile[] = [{ path: "index.html", content: "" }];

const date = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const open = visibility === "open";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
      {open ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {open ? "Open source" : "Close source"}
    </span>
  );
}

export function ProjectPicker({ onOpen, onScratch }: { onOpen: (id: string) => void; onScratch: () => void }) {
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const fetchMine = useServerFn(listMyProjects);
  const fetchOpen = useServerFn(listOpenProjects);
  const create = useServerFn(createProject);
  const remove = useServerFn(deleteProject);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("html");
  const [visibility, setVisibility] = useState<Visibility>("closed");

  const mine = useQuery({ queryKey: ["playground-projects"], queryFn: () => fetchMine(), enabled: !!user });
  const open = useQuery({ queryKey: ["playground-open-projects"], queryFn: () => fetchOpen(), enabled: !!user });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { name, visibility, files: kind === "html" ? STARTER_FILES : EMPTY_FILES } }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["playground-projects"] });
      setDialogOpen(false);
      onOpen(row.id);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal membuat proyek."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Proyek dihapus.");
      void qc.invalidateQueries({ queryKey: ["playground-projects"] });
      void qc.invalidateQueries({ queryKey: ["playground-open-projects"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus proyek."),
  });

  const openDialog = () => {
    setName("");
    setKind("html");
    setVisibility("closed");
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Kembali ke portofolio">
            <Link to="/portofolio">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-display text-xl font-semibold">Playground Kode</h1>
        </div>
        {user && (
          <Button onClick={openDialog}>
            <Plus className="mr-1 h-4 w-4" /> Tambah Proyek
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !user ? (
        <div className="space-y-3 rounded-md border p-4 text-sm">
          <p>Masuk dengan akun kelas untuk menyimpan proyek dan membukanya lagi nanti.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button variant="outline" onClick={onScratch}>
              Coba tanpa menyimpan
            </Button>
          </div>
        </div>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Proyek saya</h2>
            {mine.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : !mine.data?.length ? (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Belum ada proyek. Klik "Tambah Proyek" untuk mulai.
              </p>
            ) : (
              <ul className="space-y-2">
                {mine.data.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-md border p-2 pl-3">
                    <button type="button" className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left" onClick={() => onOpen(p.id)}>
                      <span className="flex max-w-full items-center gap-2">
                        <FileCode2 className="h-4 w-4 shrink-0" />
                        <span className="truncate font-medium">{p.name}</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <VisibilityBadge visibility={p.visibility as Visibility} />
                        Diubah {date(p.updated_at)}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Hapus ${p.name}`}
                      disabled={deleteMutation.isPending}
                      onClick={() => window.confirm(`Hapus proyek "${p.name}"?`) && deleteMutation.mutate(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {!!open.data?.length && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Open source dari user lain</h2>
              <ul className="space-y-2">
                {open.data.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-md border p-3 text-left hover:bg-muted/50"
                      onClick={() => onOpen(p.id)}
                    >
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{date(p.updated_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Proyek</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="pp-name">Nama proyek</Label>
              <Input id="pp-name" value={name} maxLength={100} required autoFocus onChange={(e) => setName(e.target.value)} />
            </div>
            <ChoiceGroup
              label="Mulai dari"
              value={kind}
              onChange={setKind}
              options={[
                { value: "empty", title: "Proyek kosong", desc: "Satu file index.html kosong", icon: <FilePlus2 className="h-4 w-4" /> },
                { value: "html", title: "Template HTML", desc: "HTML + CSS + JS dasar", icon: <FileCode2 className="h-4 w-4" /> },
              ]}
            />
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
              <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                {createMutation.isPending ? "Membuat..." : "Buat Proyek"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; title: string; desc: string; icon: React.ReactNode }[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`flex flex-col items-start gap-1 rounded-md border p-3 text-left text-sm ${value === o.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
          >
            <span className="flex items-center gap-2 font-medium">
              {o.icon}
              {o.title}
            </span>
            <span className="text-xs text-muted-foreground">{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
