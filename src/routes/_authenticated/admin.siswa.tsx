import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStudents, createStudent, updateStudent, deleteStudent } from "@/lib/students.functions";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/siswa")({
  component: AdminSiswa,
});

type StudentRow = {
  id: string;
  full_name: string;
  nickname: string | null;
  nis: string | null;
  gender: string | null;
  photo_url: string | null;
};

type FormState = {
  full_name: string;
  nickname: string;
  nis: string;
  gender: string;
  photo_url: string;
};

const emptyForm: FormState = { full_name: "", nickname: "", nis: "", gender: "", photo_url: "" };

function AdminSiswa() {
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listStudents);
  const create = useServerFn(createStudent);
  const update = useServerFn(updateStudent);
  const remove = useServerFn(deleteStudent);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => fetchStudents(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["students"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name,
        ...(form.nickname ? { nickname: form.nickname } : {}),
        ...(form.nis ? { nis: form.nis } : {}),
        ...(form.gender ? { gender: form.gender as "L" | "P" } : {}),
        ...(form.photo_url ? { photo_url: form.photo_url } : {}),
      };
      if (editing) {
        return update({ data: { id: editing.id, ...payload } });
      }
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Data siswa diperbarui." : "Siswa ditambahkan.");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan data."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Siswa dihapus.");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus data."),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (student: StudentRow) => {
    setEditing(student);
    setForm({
      full_name: student.full_name,
      nickname: student.nickname ?? "",
      nis: student.nis ?? "",
      gender: student.gender ?? "",
      photo_url: student.photo_url ?? "",
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kelola Siswa</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama lengkap</Label>
                <Input
                  id="full_name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nickname">Nama panggilan</Label>
                  <Input
                    id="nickname"
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nis">NIS</Label>
                  <Input id="nis" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Jenis kelamin</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo_url">URL foto (opsional)</Label>
                <Input
                  id="photo_url"
                  type="url"
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
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
      ) : students && students.length > 0 ? (
        <div className="space-y-3">
          {students.map((student) => (
            <Card key={student.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{student.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {student.nickname ? student.nickname + " · " : ""}
                    {student.gender === "L" ? "Laki-laki" : student.gender === "P" ? "Perempuan" : "-"}
                    {student.nis ? " · NIS " + student.nis : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(student)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Hapus siswa ini?")) deleteMutation.mutate(student.id);
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
        <p className="text-muted-foreground">Belum ada data siswa.</p>
      )}
    </div>
  );
}
