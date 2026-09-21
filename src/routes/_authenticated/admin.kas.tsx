import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createCashDue,
  createCashExpense,
  deleteCashDue,
  deleteCashExpense,
  getMyCash,
  listCashDuesAdmin,
  listDuePayments,
  setCashPayment,
  updateCashDue,
  updateCashExpense,
} from "@/lib/kas.functions";
import { listStudents } from "@/lib/students.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDateId, formatRupiah } from "@/lib/format";
import { wibDateString } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/admin/kas")({
  component: AdminKas,
});

type DueRow = { id: string; title: string; amount: number; due_date: string | null; paid_count: number };
type ExpenseRow = { id: string; spent_on: string; description: string; amount: number };

type DueForm = { title: string; amount: string; due_date: string };
type ExpenseForm = { spent_on: string; description: string; amount: string };

const emptyDue: DueForm = { title: "", amount: "", due_date: "" };
const emptyExpense = (): ExpenseForm => ({ spent_on: wibDateString(), description: "", amount: "" });

function AdminKas() {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getMyCash);
  const fetchDues = useServerFn(listCashDuesAdmin);
  const fetchStudents = useServerFn(listStudents);
  const createDue = useServerFn(createCashDue);
  const updateDue = useServerFn(updateCashDue);
  const removeDue = useServerFn(deleteCashDue);
  const createExpense = useServerFn(createCashExpense);
  const updateExpense = useServerFn(updateCashExpense);
  const removeExpense = useServerFn(deleteCashExpense);

  const overview = useQuery({ queryKey: ["my-cash"], queryFn: () => fetchOverview() });
  const dues = useQuery({ queryKey: ["cash-dues-admin"], queryFn: () => fetchDues() });
  const students = useQuery({ queryKey: ["students"], queryFn: () => fetchStudents() });

  const [dueOpen, setDueOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<DueRow | null>(null);
  const [dueForm, setDueForm] = useState<DueForm>(emptyDue);
  const [paymentsDue, setPaymentsDue] = useState<DueRow | null>(null);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpense());

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-cash"] });
    queryClient.invalidateQueries({ queryKey: ["cash-dues-admin"] });
  };

  const saveDue = useMutation({
    mutationFn: () => {
      const payload = { title: dueForm.title, amount: Number(dueForm.amount), due_date: dueForm.due_date || null };
      if (editingDue) return updateDue({ data: { id: editingDue.id, ...payload } });
      return createDue({ data: payload });
    },
    onSuccess: () => {
      toast.success(editingDue ? "Tagihan diperbarui." : "Tagihan dibuat.");
      setDueOpen(false);
      setEditingDue(null);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan tagihan."),
  });

  const deleteDueMutation = useMutation({
    mutationFn: (id: string) => removeDue({ data: { id } }),
    onSuccess: () => {
      toast.success("Tagihan dihapus.");
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus tagihan."),
  });

  const saveExpense = useMutation({
    mutationFn: () => {
      const payload = {
        spent_on: expenseForm.spent_on,
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
      };
      if (editingExpense) return updateExpense({ data: { id: editingExpense.id, ...payload } });
      return createExpense({ data: payload });
    },
    onSuccess: () => {
      toast.success(editingExpense ? "Pengeluaran diperbarui." : "Pengeluaran dicatat.");
      setExpenseOpen(false);
      setEditingExpense(null);
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengeluaran."),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => removeExpense({ data: { id } }),
    onSuccess: () => {
      toast.success("Pengeluaran dihapus.");
      refresh();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus pengeluaran."),
  });

  const totalStudents = students.data?.length ?? 0;
  const duesData = (dues.data ?? []) as DueRow[];
  const expenses = (overview.data?.expenses ?? []) as ExpenseRow[];

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-lg font-semibold">Kas Kelas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Siswa hanya melihat status iuran miliknya sendiri, plus saldo dan pengeluaran. Daftar siapa yang belum bayar
          hanya ada di sini.
        </p>
        {overview.data && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-primary bg-primary px-4 py-3 text-primary-foreground">
              <p className="text-xs text-primary-foreground/70">Saldo</p>
              <p className="font-display text-lg font-semibold">{formatRupiah(overview.data.balance)}</p>
            </div>
            <div className="rounded-lg border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Total masuk</p>
              <p className="font-display text-lg font-semibold">{formatRupiah(overview.data.total_in)}</p>
            </div>
            <div className="rounded-lg border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Total keluar</p>
              <p className="font-display text-lg font-semibold">{formatRupiah(overview.data.total_out)}</p>
            </div>
          </div>
        )}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Tagihan iuran</h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingDue(null);
              setDueForm(emptyDue);
              setDueOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Tambah tagihan
          </Button>
        </div>

        {dues.isLoading ? (
          <Skeleton className="h-20 rounded-lg" />
        ) : duesData.length > 0 ? (
          <div className="space-y-3">
            {duesData.map((due) => (
              <Card key={due.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{due.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatRupiah(due.amount)} per siswa
                      {due.due_date ? `, batas ${formatDateId(due.due_date)}` : ""}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {due.paid_count}/{totalStudents} siswa lunas
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => setPaymentsDue(due)}>
                      <Users className="mr-1 h-4 w-4" /> Pembayaran
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingDue(due);
                        setDueForm({
                          title: due.title,
                          amount: String(due.amount),
                          due_date: due.due_date ?? "",
                        });
                        setDueOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Hapus tagihan ini beserta catatan pembayarannya?")) deleteDueMutation.mutate(due.id);
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
          <p className="text-muted-foreground">Belum ada tagihan.</p>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Pengeluaran</h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingExpense(null);
              setExpenseForm(emptyExpense());
              setExpenseOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Catat pengeluaran
          </Button>
        </div>

        {overview.isLoading ? (
          <Skeleton className="h-20 rounded-lg" />
        ) : expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateId(expense.spent_on)}, {formatRupiah(expense.amount)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingExpense(expense);
                        setExpenseForm({
                          spent_on: expense.spent_on,
                          description: expense.description,
                          amount: String(expense.amount),
                        });
                        setExpenseOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Hapus catatan pengeluaran ini?")) deleteExpenseMutation.mutate(expense.id);
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
          <p className="text-muted-foreground">Belum ada pengeluaran.</p>
        )}
      </section>

      <Dialog open={dueOpen} onOpenChange={setDueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDue ? "Edit Tagihan" : "Tambah Tagihan"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveDue.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="due-title">Nama tagihan</Label>
              <Input
                id="due-title"
                placeholder="Kas September 2026"
                value={dueForm.title}
                onChange={(e) => setDueForm({ ...dueForm, title: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="due-amount">Nominal per siswa (Rp)</Label>
                <Input
                  id="due-amount"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={dueForm.amount}
                  onChange={(e) => setDueForm({ ...dueForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date">Batas bayar (opsional)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueForm.due_date}
                  onChange={(e) => setDueForm({ ...dueForm, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveDue.isPending}>
                {saveDue.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Pengeluaran" : "Catat Pengeluaran"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveExpense.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="exp-desc">Keperluan</Label>
              <Input
                id="exp-desc"
                placeholder="Beli spidol dan penghapus"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exp-amount">Nominal (Rp)</Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-date">Tanggal</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={expenseForm.spent_on}
                  onChange={(e) => setExpenseForm({ ...expenseForm, spent_on: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saveExpense.isPending}>
                {saveExpense.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PaymentsDialog
        due={paymentsDue}
        students={(students.data ?? []).map((s) => ({ id: s.id, full_name: s.full_name }))}
        onClose={() => setPaymentsDue(null)}
        onChanged={refresh}
      />
    </div>
  );
}

function PaymentsDialog({
  due,
  students,
  onClose,
  onChanged,
}: {
  due: DueRow | null;
  students: { id: string; full_name: string }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const fetchPayments = useServerFn(listDuePayments);
  const toggle = useServerFn(setCashPayment);

  const payments = useQuery({
    queryKey: ["cash-payments", due?.id],
    queryFn: () => fetchPayments({ data: { due_id: due!.id } }),
    enabled: !!due,
  });

  const mutation = useMutation({
    mutationFn: (vars: { student_id: string; paid: boolean }) => toggle({ data: { due_id: due!.id, ...vars } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-payments", due?.id] });
      onChanged();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan pembayaran."),
  });

  const paid = new Set(payments.data ?? []);

  return (
    <Dialog open={!!due} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pembayaran: {due?.title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Nyalakan tombol di samping nama siswa yang sudah membayar {due ? formatRupiah(due.amount) : ""}.
        </p>
        {payments.isLoading ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : (
          <div className="max-h-80 divide-y divide-border overflow-auto rounded-md border border-border">
            {students.map((student) => (
              <div key={student.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate text-sm">{student.full_name}</span>
                <Switch
                  checked={paid.has(student.id)}
                  disabled={mutation.isPending}
                  onCheckedChange={(checked) => mutation.mutate({ student_id: student.id, paid: checked })}
                />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
