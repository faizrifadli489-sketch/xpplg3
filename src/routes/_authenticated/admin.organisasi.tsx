import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrgPositions, createOrgPosition, updateOrgPosition, deleteOrgPosition } from "@/lib/org.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/admin/organisasi")({
  component: AdminOrganisasi,
});

type OrgRow = {
  id: string;
  title: string;
  order_index: number;
  student_name: string;
};

type FormState = { title: string; student_name: string; order_index: string };

const emptyForm: FormState = { title: "", student_name: "", order_index: "0" };

function AdminOrganisasi() {
  const queryClient = useQueryClient();
  const fetchOrg = useServerFn(listOrgPositions);
  const create = useServerFn(createOrgPosition);
  const update = useServerFn(updateOrgPosition);
  const remove = useServerFn(deleteOrgPosition);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrgRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: positions, isLoading } = useQuery({
    queryKey: ["org-positions"],
    queryFn: () => fetchOrg(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["org-positions"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        student_name: form.student_name,
        order_index: Number(form.order_index) || 0,
      };
      if (editing) return update({ data: { id: editing.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Jabatan diperbarui." : "Jabatan ditambahkan.");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan jabatan."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Jabatan dihapus.");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus jabatan."),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (position: OrgRow) => {
    setEditing(position);
    setForm({
      title: position.title,
      student_name: position.student_name,
      order_index: String(position.order_index),
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kelola Struktur Organisasi</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Tambah jabatan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Jabatan" : "Tambah Jabatan"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="title">Nama jabatan</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student_name">Nama siswa</Label>
                <Input
                  id="student_name"
                  value={form.student_name}
                  onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="order_index">Urutan tampil</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={form.order_index}
                  onChange={(e) => setForm({ ...form, order_index: e.target.value })}
                />
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
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : positions && positions.length > 0 ? (
        <div className="space-y-3">
          {positions.map((position) => (
            <Card key={position.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{position.title}</p>
                  <p className="text-sm text-muted-foreground">{position.student_name}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(position)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Hapus jabatan ini?")) deleteMutation.mutate(position.id);
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
        <p className="text-muted-foreground">Belum ada data organisasi.</p>
      )}
    </div>
  );
}
