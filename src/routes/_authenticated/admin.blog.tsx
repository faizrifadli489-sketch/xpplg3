import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllPosts, createPost, updatePost, deletePost, listPostImages } from "@/lib/posts.functions";
import { ImageUpload } from "@/components/image-upload";
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
import { Pencil, Trash2, Plus, X } from "lucide-react";
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
  images: string[];
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  content: "",
  cover_image_url: "",
  published: false,
  images: [],
};

function AdminBlog() {
  const queryClient = useQueryClient();
  const fetchPosts = useServerFn(listAllPosts);
  const create = useServerFn(createPost);
  const update = useServerFn(updatePost);
  const remove = useServerFn(deletePost);
  const fetchPostImages = useServerFn(listPostImages);
  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);

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
        images: form.images,
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

  const openEdit = async (post: PostRow) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content,
      cover_image_url: post.cover_image_url ?? "",
      published: post.published,
      images: [],
    });
    setOpen(true);

    try {
      const images = await fetchPostImages({ data: { post_id: post.id } });
      setForm((f) => ({ ...f, images: images.map((img) => img.image_url) }));
    } catch {
      // galeri gagal dimuat, form tetap bisa dipakai (anggap galeri kosong)
    }
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
              <ImageUpload
                value={form.cover_image_url}
                onChange={(url) => setForm({ ...form, cover_image_url: url })}
                onUploadingChange={setUploading}
                folder="blog"
                label="Gambar sampul (opsional)"
              />

              <div className="space-y-2">
                <Label>Galeri foto (opsional, bisa lebih dari satu)</Label>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {form.images.map((url, index) => (
                      <div key={url + index} className="group relative aspect-square overflow-hidden rounded-md">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          aria-label="Hapus dari galeri"
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== index) })}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <ImageUpload
                  value=""
                  onChange={(url) => {
                    if (url) setForm((f) => ({ ...f, images: [...f.images, url] }));
                  }}
                  onUploadingChange={setGalleryUploading}
                  folder="blog"
                  label="Tambah foto ke galeri"
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
                <Button type="submit" disabled={saveMutation.isPending || uploading || galleryUploading}>
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
