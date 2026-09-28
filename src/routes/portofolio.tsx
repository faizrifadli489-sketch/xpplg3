import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listPortfolio,
  createMyPortfolioProject,
  updatePortfolioProject,
  deletePortfolioProject,
} from "@/lib/portfolio.functions";
import { useAuth } from "@/hooks/useAuth";
import { PortfolioThumbnail } from "@/components/portfolio-thumbnail";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/portofolio")({
  head: () => ({
    meta: [
      { title: "Portofolio Karya — X PPLG 3" },
      { name: "description", content: "Kumpulan proyek software dan gim buatan siswa kelas X PPLG 3 SMKN 1 Leuwimunding." },
      { property: "og:title", content: "Portofolio Karya — X PPLG 3" },
      { property: "og:description", content: "Kumpulan proyek software dan gim buatan siswa kelas X PPLG 3 SMKN 1 Leuwimunding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortofolioPage,
});

type Project = {
  id: string;
  title: string;
  description: string | null;
  project_url: string | null;
  image_url: string | null;
  team_note: string | null;
  created_at: string;
  students: { id: string; full_name: string } | null;
};

type FormState = { title: string; description: string; project_url: string; image_url: string; team_note: string };
const emptyForm: FormState = { title: "", description: "", project_url: "", image_url: "", team_note: "" };

function PortofolioPage() {
  const { studentId } = useAuth();
  const queryClient = useQueryClient();
  const fetchProjects = useServerFn(listPortfolio);
  const create = useServerFn(createMyPortfolioProject);
  const update = useServerFn(updatePortfolioProject);
  const remove = useServerFn(deletePortfolioProject);

  const { data: projects, isLoading } = useQuery({ queryKey: ["portfolio"], queryFn: () => fetchProjects() });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["portfolio"] });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        project_url: form.project_url || null,
        image_url: form.image_url || null,
        team_note: form.team_note || null,
      };
      if (editing) return update({ data: { id: editing.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Karya diperbarui." : "Karya ditambahkan.");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan karya."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Karya dihapus.");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus karya."),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (project: Project) => {
    setEditing(project);
    setForm({
      title: project.title,
      description: project.description ?? "",
      project_url: project.project_url ?? "",
      image_url: project.image_url ?? "",
      team_note: project.team_note ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-3 font-mono text-sm text-muted-foreground">// hasil karya</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Portofolio Karya</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Proyek software dan gim buatan siswa kelas X PPLG 3.
          </p>
        </div>

        {studentId && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> Tambah Karya
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Karya" : "Tambah Karya"}</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="p-title">Judul proyek</Label>
                  <Input
                    id="p-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-desc">Deskripsi singkat</Label>
                  <Textarea
                    id="p-desc"
                    rows={3}
                    maxLength={500}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-url">Link (GitHub, itch.io, demo, dll — opsional)</Label>
                  <Input
                    id="p-url"
                    type="url"
                    placeholder="https://..."
                    value={form.project_url}
                    onChange={(e) => setForm({ ...form, project_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-team">Dikerjakan bersama (opsional)</Label>
                  <Input
                    id="p-team"
                    placeholder="misal: bersama Budi & Sari"
                    maxLength={150}
                    value={form.team_note}
                    onChange={(e) => setForm({ ...form, team_note: e.target.value })}
                  />
                </div>
                <PortfolioThumbnail
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  onBusyChange={setUploading}
                  projectUrl={form.project_url}
                  folder="portfolio"
                  label="Thumbnail (opsional)"
                />
                <DialogFooter>
                  <Button type="submit" disabled={saveMutation.isPending || uploading}>
                    {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </Reveal>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col overflow-hidden rounded-lg shadow-none">
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden bg-muted">
                {project.image_url ? (
                  <img src={project.image_url} alt={project.title} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <CardContent className="flex flex-1 flex-col py-4">
                <h3 className="font-display text-lg font-semibold">{project.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {project.students?.full_name ?? "Siswa"}
                  {project.team_note ? `, ${project.team_note}` : ""}
                </p>
                {project.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{project.description}</p>
                )}

                <div className="mt-4 flex items-center justify-between gap-2">
                  {project.project_url ? (
                    <a
                      href={project.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Lihat proyek <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span />
                  )}

                  {studentId === project.students?.id && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(project)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Hapus karya "${project.title}"?`)) deleteMutation.mutate(project.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </Reveal>
      ) : (
        <p className="text-center text-muted-foreground">
          Belum ada karya yang ditambahkan.
          {studentId ? " Jadi yang pertama!" : ""}
        </p>
      )}
    </div>
  );
}
