import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteContent, saveSiteContent } from "@/lib/site-content.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/profil")({
  component: AdminProfil,
});

type FormState = { visi: string; misi: string; motto: string; motto_arti: string };

function AdminProfil() {
  const queryClient = useQueryClient();
  const fetchContent = useServerFn(getSiteContent);
  const save = useServerFn(saveSiteContent);

  const { data, isLoading } = useQuery({ queryKey: ["site-content"], queryFn: () => fetchContent() });
  const [form, setForm] = useState<FormState>({ visi: "", misi: "", motto: "", motto_arti: "" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      setForm({
        visi: data["visi"] ?? "",
        misi: data["misi"] ?? "",
        motto: data["motto"] ?? "",
        motto_arti: data["motto_arti"] ?? "",
      });
      setLoaded(true);
    }
  }, [data, loaded]);

  const mutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Profil kelas diperbarui.");
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan."),
  });

  if (isLoading) return <Skeleton className="h-96 max-w-2xl rounded-lg" />;

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Visi, Misi, dan Motto</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tampil di halaman Profil Kelas.</p>

      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="visi">Visi</Label>
          <Textarea
            id="visi"
            rows={4}
            maxLength={1000}
            value={form.visi}
            onChange={(e) => setForm({ ...form, visi: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="misi">Misi</Label>
          <Textarea
            id="misi"
            rows={6}
            maxLength={2000}
            value={form.misi}
            onChange={(e) => setForm({ ...form, misi: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Satu poin per baris. Tiap baris jadi satu butir di halaman.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="motto">Motto</Label>
          <Input
            id="motto"
            maxLength={150}
            value={form.motto}
            onChange={(e) => setForm({ ...form, motto: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="motto_arti">Arti / penjelasan motto (opsional)</Label>
          <Input
            id="motto_arti"
            maxLength={200}
            value={form.motto_arti}
            onChange={(e) => setForm({ ...form, motto_arti: e.target.value })}
          />
        </div>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Menyimpan..." : "Simpan"}
        </Button>
      </form>
    </div>
  );
}
