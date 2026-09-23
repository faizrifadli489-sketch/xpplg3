import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteContent, saveSiteContent } from "@/lib/site-content.functions";
import {
  listHeroTaglines,
  createHeroTagline,
  updateHeroTagline,
  deleteHeroTagline,
} from "@/lib/hero-taglines.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
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

      <div className="mt-12 border-t border-border pt-8">
        <HeroTaglines />
      </div>
    </div>
  );
}

// Kalimat yang berganti-ganti (efek ketik) di judul beranda. Diacak di sisi klien,
// jadi urutan di sini tidak berpengaruh.
function HeroTaglines() {
  const queryClient = useQueryClient();
  const fetchTaglines = useServerFn(listHeroTaglines);
  const create = useServerFn(createHeroTagline);
  const update = useServerFn(updateHeroTagline);
  const remove = useServerFn(deleteHeroTagline);

  const { data, isLoading } = useQuery({ queryKey: ["hero-taglines"], queryFn: () => fetchTaglines() });
  const taglines = data ?? [];

  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hero-taglines"] });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { text: newText } }),
    onSuccess: () => {
      setNewText("");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menambah kalimat."),
  });

  const updateMutation = useMutation({
    mutationFn: () => update({ data: { id: editingId!, text: editingText } }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan kalimat."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus kalimat."),
  });

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Kalimat Judul Beranda</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Judul di beranda berganti-ganti (efek ketik) di antara kalimat-kalimat ini, dipilih acak. Kalau cuma diisi
        satu, judul tampil diam tanpa animasi ketik. Usahakan singkat (maksimal 50 karakter) biar rapi di layar HP.
      </p>

      {isLoading ? (
        <Skeleton className="mt-4 h-32 rounded-lg" />
      ) : (
        <div className="mt-4 space-y-2">
          {taglines.map((tagline) => (
            <Card key={tagline.id} className="shadow-none">
              <CardContent className="flex items-center gap-2 py-2.5">
                {editingId === tagline.id ? (
                  <>
                    <Input
                      autoFocus
                      maxLength={50}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateMutation.mutate();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate()}
                    >
                      Simpan
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Batal
                    </Button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="flex-1 truncate rounded px-1 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        setEditingId(tagline.id);
                        setEditingText(tagline.text);
                      }}
                    >
                      {tagline.text}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Hapus kalimat "${tagline.text}"?`)) deleteMutation.mutate(tagline.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
          {taglines.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada kalimat. Beranda memakai "Kelas X PPLG 3" sebagai cadangan.
            </p>
          )}
        </div>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newText.trim()) createMutation.mutate();
        }}
      >
        <Input
          placeholder="Tambah kalimat baru"
          maxLength={50}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
        />
        <Button type="submit" disabled={createMutation.isPending || !newText.trim()}>
          <Plus className="mr-1 h-4 w-4" /> Tambah
        </Button>
      </form>
    </div>
  );
}
