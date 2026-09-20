import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllPosts, createPost, updatePost, deletePost } from "@/lib/posts.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  component: AdminBlog,
});

type PostRow = {
  id: string;
  title: string;
  slug: string;
  content: string;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
};

type FormState = {
  title: string;
  slug: string;
  content: string;
  cover_image_url: string;
  published: boolean;
};

const emptyForm: FormState = { title: "", slug: "", content: "", cover_image_url: "", published: false };

function AdminBlog() {
  const queryClient = useQueryClient();
  const fetchPosts = useServerFn(listAllPosts);
  const create = useServerFn(createPost);
  const update = useServerFn(updatePost);
  const remove = useServerFn(deletePost);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PostRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-posts"],
    queryFn: () => fetchPosts(),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        slug: form.slug || form.title,
        content: form.content,
        published: form.published,
        ...(form.cover_image_url ? { cover_image_url: form.cover_image_url } : {}),
      };
      if (editing) return update({ data: { id: editing.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Artikel diperbarui." : "Artikel dibuat.");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan artikel."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Artikel dihapus.");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus artikel."),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (post: PostRow) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      cover_image_url: post.cover_image_url ?? "",
      published: post.published,
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kelola Blog</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Tulis artikel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Artikel" : "Tulis Artikel"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="title">Judul</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (opsional)</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="otomatis dari judul"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Isi artikel</Label>
                <Textarea
                  id="content"
                  rows={10}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">URL gambar sampul (opsional)</Label>
                <Input
                  id="cover"
                  type="url"
                  value={form.cover_image_url}
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="published"
                  checked={form.published}
                  onCheckedChange={(v) => setForm({ ...form, published: v })}
                />
                <Label htmlFor="published">Tampilkan ke publik</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{post.title}</p>
                    <Badge variant={post.published ? "default" : "secondary"}>
                      {post.published ? "Publik" : "Draf"}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">/{post.slug}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Hapus artikel ini?")) deleteMutation.mutate(post.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Belum ada artikel.</p>
      )}
    </div>
  );
}
