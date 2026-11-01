import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSchedule,
  listPiket,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  addPiket,
  removePiket,
} from "@/lib/class.functions";
import { listStudents } from "@/lib/students.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { DAY_LABELS, SCHOOL_DAYS, formatTime } from "@/lib/time";
import type { PiketItem, ScheduleItem } from "@/components/class-widgets";

export const Route = createFileRoute("/_authenticated/admin/jadwal")({
  component: AdminJadwal,
});

type FormState = {
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string;
  room: string;
};

const emptyForm = (day: number): FormState => ({
  day_of_week: String(day),
  start_time: "",
  end_time: "",
  subject: "",
  teacher: "",
  room: "",
});

function AdminJadwal() {
  const queryClient = useQueryClient();
  const fetchSchedule = useServerFn(listSchedule);
  const fetchPiket = useServerFn(listPiket);
  const fetchStudents = useServerFn(listStudents);
  const createEntry = useServerFn(createScheduleEntry);
  const updateEntry = useServerFn(updateScheduleEntry);
  const removeEntry = useServerFn(deleteScheduleEntry);
  const addPiketFn = useServerFn(addPiket);
  const removePiketFn = useServerFn(removePiket);

  const [day, setDay] = useState<number>(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(1));
  const [pickStudent, setPickStudent] = useState("");

  const schedule = useQuery({ queryKey: ["schedule"], queryFn: () => fetchSchedule() });
  const piket = useQuery({ queryKey: ["piket"], queryFn: () => fetchPiket() });
  const students = useQuery({ queryKey: ["students"], queryFn: () => fetchStudents() });

  const dayEntries = ((schedule.data ?? []) as ScheduleItem[]).filter((e) => e.day_of_week === day);
  const dayPiket = ((piket.data ?? []) as unknown as PiketItem[]).filter((p) => p.day_of_week === day);
  const assignedIds = new Set(dayPiket.map((p) => p.student_id));
  const availableStudents = (students.data ?? []).filter((s) => !assignedIds.has(s.id));

  const invalidateSchedule = () => queryClient.invalidateQueries({ queryKey: ["schedule"] });
  const invalidatePiket = () => queryClient.invalidateQueries({ queryKey: ["piket"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        subject: form.subject,
        teacher: form.teacher || null,
        room: form.room || null,
      };
      if (editing) return updateEntry({ data: { id: editing.id, ...payload } });
      return createEntry({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Jadwal diperbarui." : "Jadwal ditambahkan.");
      setOpen(false);
      setEditing(null);
      invalidateSchedule();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan jadwal."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeEntry({ data: { id } }),
    onSuccess: () => {
      toast.success("Jadwal dihapus.");
      invalidateSchedule();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus jadwal."),
  });

  const addPiketMutation = useMutation({
    mutationFn: () => addPiketFn({ data: { day_of_week: day, student_id: pickStudent } }),
    onSuccess: () => {
      setPickStudent("");
      invalidatePiket();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menambah piket."),
  });

  const removePiketMutation = useMutation({
    mutationFn: (id: string) => removePiketFn({ data: { id } }),
    onSuccess: () => invalidatePiket(),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus piket."),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(day));
    setOpen(true);
  };

  const openEdit = (entry: ScheduleItem) => {
    setEditing(entry);
    setForm({
      day_of_week: String(entry.day_of_week),
      start_time: formatTime(entry.start_time),
      end_time: formatTime(entry.end_time),
      subject: entry.subject,
      teacher: entry.teacher ?? "",
      room: entry.room ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="mb-4 text-lg font-semibold">Kelola Jadwal & Piket</h2>
        <div className="flex flex-wrap gap-2">
          {SCHOOL_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={
                "rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                (d === day
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground/70 hover:bg-accent hover:text-accent-foreground")
              }
            >
              {DAY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Mata pelajaran hari {DAY_LABELS[day]}</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-1 h-4 w-4" /> Tambah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label>Hari</Label>
                  <Select value={form.day_of_week} onValueChange={(v) => setForm({ ...form, day_of_week: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_DAYS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {DAY_LABELS[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Jam mulai</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Jam selesai</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Mata pelajaran</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Guru (opsional)</Label>
                    <Input
                      id="teacher"
                      value={form.teacher}
                      onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Ruangan (opsional)</Label>
                    <Input id="room" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
                  </div>
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

        {schedule.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : dayEntries.length > 0 ? (
          <div className="space-y-3">
            {dayEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                      {[entry.teacher, entry.room].filter(Boolean).length > 0
                        ? ", " + [entry.teacher, entry.room].filter(Boolean).join(", ")
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Hapus jadwal ini?")) deleteMutation.mutate(entry.id);
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
          <p className="text-muted-foreground">Belum ada jadwal untuk hari {DAY_LABELS[day]}.</p>
        )}
      </section>

      <section>
        <h3 className="mb-4 font-semibold">Piket hari {DAY_LABELS[day]}</h3>

        {dayPiket.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {dayPiket.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full border border-border py-1 pl-3 pr-1 text-sm"
              >
                {item.students?.full_name ?? "(siswa dihapus)"}
                <button
                  type="button"
                  aria-label="Hapus dari piket"
                  className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => removePiketMutation.mutate(item.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-muted-foreground">Belum ada yang piket hari {DAY_LABELS[day]}.</p>
        )}

        <div className="flex max-w-md items-center gap-2">
          <Select value={pickStudent} onValueChange={setPickStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih siswa" />
            </SelectTrigger>
            <SelectContent>
              {availableStudents.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            disabled={!pickStudent || addPiketMutation.isPending}
            onClick={() => addPiketMutation.mutate()}
          >
            Tambah
          </Button>
        </div>
      </section>
    </div>
  );
}
