import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPortfolio, deletePortfolioProject } from "@/lib/portfolio.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/portofolio")({
  component: AdminPortofolio,
});

function AdminPortofolio() {
  const queryClient = useQueryClient();
  const fetchProjects = useServerFn(listPortfolio);
  const remove = useServerFn(deletePortfolioProject);

  const { data: projects, isLoading } = useQuery({ queryKey: ["portfolio"], queryFn: () => fetchProjects() });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Karya dihapus.");
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus karya."),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold">Portofolio Karya</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Siswa menambah karyanya sendiri lewat halaman Portofolio publik. Di sini admin bisa memoderasi (hapus) kalau
        ada yang tidak pantas atau salah tempat.
      </p>

      {isLoading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="mt-4 space-y-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                  {project.image_url ? (
                    <img src={project.image_url} alt={project.title} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{project.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {project.students?.full_name ?? "(siswa dihapus)"}
                    {project.team_note ? `, ${project.team_note}` : ""}
                  </p>
                </div>
                {project.project_url && (
                  <a
                    href={project.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm(`Hapus karya "${project.title}"?`)) deleteMutation.mutate(project.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-muted-foreground">Belum ada karya.</p>
      )}
    </div>
  );
}
