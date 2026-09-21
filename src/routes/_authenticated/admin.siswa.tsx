import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStudents, createStudent, updateStudent, deleteStudent } from "@/lib/students.functions";
import {
  listStudentAccounts,
  createStudentAccount,
  createAllStudentAccounts,
  resetStudentPassword,
} from "@/lib/accounts.functions";
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
import { Pencil, Trash2, Plus, User, KeyRound, UserPlus, Copy } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/image-upload";

export const Route = createFileRoute("/_authenticated/admin/siswa")({
  component: AdminSiswa,
});

type StudentRow = {
  id: string;
  full_name: string;
  nickname: string | null;
  gender: string | null;
  photo_url: string | null;
};

type FormState = {
  full_name: string;
  nickname: string;
  gender: string;
  photo_url: string;
};

type Credential = { student_id: string; full_name: string; username: string; password: string };
type CredentialsView = { rows: Credential[]; failed: { full_name: string; error: string }[] };

const emptyForm: FormState = { full_name: "", nickname: "", gender: "", photo_url: "" };

function AdminSiswa() {
  const queryClient = useQueryClient();
  const fetchStudents = useServerFn(listStudents);
  const create = useServerFn(createStudent);
  const update = useServerFn(updateStudent);
  const remove = useServerFn(deleteStudent);
  const fetchAccounts = useServerFn(listStudentAccounts);
  const createAccount = useServerFn(createStudentAccount);
  const createAll = useServerFn(createAllStudentAccounts);
  const resetPassword = useServerFn(resetStudentPassword);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [credentials, setCredentials] = useState<CredentialsView | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: () => fetchStudents(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["students"] });

  const { data: accounts } = useQuery({
    queryKey: ["student-accounts"],
    queryFn: () => fetchAccounts(),
  });
  const usernameById = new Map((accounts ?? []).map((a) => [a.student_id, a.username]));
  const missingCount = (students ?? []).filter((s) => !usernameById.has(s.id)).length;

  const invalidateAccounts = () => queryClient.invalidateQueries({ queryKey: ["student-accounts"] });

  const createAccountMutation = useMutation({
    mutationFn: (student_id: string) => createAccount({ data: { student_id } }),
    onSuccess: (cred) => {
      setCredentials({ rows: [cred], failed: [] });
      invalidateAccounts();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal membuat akun."),
  });

  const resetMutation = useMutation({
    mutationFn: (student_id: string) => resetPassword({ data: { student_id } }),
    onSuccess: (cred) => setCredentials({ rows: [cred], failed: [] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mereset password."),
  });

  const createAllMutation = useMutation({
    mutationFn: () => createAll(),
    onSuccess: (result) => {
      invalidateAccounts();
      if (result.created.length === 0 && result.failed.length === 0) {
        toast.info("Semua siswa sudah punya akun.");
        return;
      }
      setCredentials({ rows: result.created, failed: result.failed });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal membuat akun."),
  });

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = credentials.rows.map((r) => `${r.full_name}\t${r.username}\t${r.password}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Daftar akun disalin.");
    } catch {
      toast.error("Gagal menyalin. Salin manual dari tabel.");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name,
        ...(form.nickname ? { nickname: form.nickname } : {}),
        ...(form.gender ? { gender: form.gender as "L" | "P" } : {}),
        photo_url: form.photo_url || null,
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
              <div className="space-y-2">
                <Label htmlFor="nickname">Nama panggilan</Label>
                <Input
                  id="nickname"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                />
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
              <ImageUpload
                value={form.photo_url}
                onChange={(url) => setForm({ ...form, photo_url: url })}
                onUploadingChange={setUploading}
                folder="students"
                label="Foto siswa (opsional)"
              />
              <DialogFooter>
                <Button type="submit" disabled={saveMutation.isPending || uploading}>
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {missingCount > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {missingCount} siswa belum punya akun login. Siswa masuk dengan nama lengkap dan password awal dari sini.
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={createAllMutation.isPending}
            onClick={() => {
              if (confirm(`Buat akun untuk ${missingCount} siswa sekarang?`)) createAllMutation.mutate();
            }}
          >
            <UserPlus className="mr-1 h-4 w-4" />
            {createAllMutation.isPending ? "Membuat akun..." : "Buat semua akun"}
          </Button>
        </div>
      )}

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
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{student.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.nickname ? student.nickname + " · " : ""}
                      {student.gender === "L" ? "Laki-laki" : student.gender === "P" ? "Perempuan" : "-"}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {usernameById.has(student.id) ? "Login: " + usernameById.get(student.id) : "Belum punya akun"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {usernameById.has(student.id) ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reset password"
                      disabled={resetMutation.isPending}
                      onClick={() => {
                        if (confirm("Reset password " + student.full_name + "? Password lama tidak berlaku lagi."))
                          resetMutation.mutate(student.id);
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Buat akun"
                      disabled={createAccountMutation.isPending}
                      onClick={() => createAccountMutation.mutate(student.id)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
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

      <Dialog open={credentials !== null} onOpenChange={(o) => !o && setCredentials(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kredensial login siswa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Password hanya ditampilkan sekali ini. Salin dan bagikan ke siswa sekarang. Siswa bisa menggantinya
            sendiri lewat tombol "Ganti password" setelah login.
          </p>
          {credentials && credentials.rows.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Login</th>
                    <th className="px-3 py-2">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.rows.map((row) => (
                    <tr key={row.student_id} className="border-t border-border">
                      <td className="px-3 py-2">{row.full_name}</td>
                      <td className="px-3 py-2 font-mono">{row.username}</td>
                      <td className="px-3 py-2 font-mono">{row.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {credentials && credentials.failed.length > 0 && (
            <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
              <p className="font-medium">{credentials.failed.length} akun gagal dibuat:</p>
              <ul className="mt-1 list-disc pl-5">
                {credentials.failed.map((f) => (
                  <li key={f.full_name}>
                    {f.full_name}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={copyCredentials}>
              <Copy className="mr-1 h-4 w-4" /> Salin semua
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
