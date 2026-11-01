import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEvents, createEvent, updateEvent, deleteEvent } from "@/lib/class.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { CATEGORY_LABELS, formatEventDate, formatTime, isEventUpcoming } from "@/lib/time";
import type { EventItem } from "@/components/class-widgets";

export const Route = createFileRoute("/_authenticated/admin/acara")({
  component: AdminAcara,
});

type FormState = {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  category: string;
  show_countdown: boolean;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  event_date: "",
  event_time: "",
  category: "event",
  show_countdown: true,
};

function AdminAcara() {
  const queryClient = useQueryClient();
  const fetchEvents = useServerFn(listEvents);
  const create = useServerFn(createEvent);
  const update = useServerFn(updateEvent);
  const remove = useServerFn(deleteEvent);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading } = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents() });
  const events = (data ?? []) as EventItem[];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["events"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description || null,
        event_date: form.event_date,
        event_time: form.event_time || null,
        category: form.category as "ujian" | "tugas" | "event" | "libur",
        show_countdown: form.show_countdown,
      };
      if (editing) return update({ data: { id: editing.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Acara diperbarui." : "Acara ditambahkan.");
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menyimpan acara."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Acara dihapus.");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus acara."),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (event: EventItem) => {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? "",
      event_date: event.event_date,
      event_time: formatTime(event.event_time),
      category: event.category,
      show_countdown: event.show_countdown,
    });
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Kelola Acara & Countdown</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Tambah acara
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Acara" : "Tambah Acara"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="title">Nama acara</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event_date">Tanggal</Label>
                  <Input
                    id="event_date"
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event_time">Jam (opsional)</Label>
                  <Input
                    id="event_time"
                    type="time"
                    value={form.event_time}
                    onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Keterangan (opsional)</Label>
                <Textarea
                  id="description"
                  rows={3}
                  maxLength={500}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
                <Label htmlFor="show_countdown" className="text-sm">
                  Tampilkan countdown
                </Label>
                <Switch
                  id="show_countdown"
                  checked={form.show_countdown}
                  onCheckedChange={(checked) => setForm({ ...form, show_countdown: checked })}
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event) => {
            const finished = !isEventUpcoming(event);
            return (
              <Card key={event.id} className={finished ? "opacity-60" : ""}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORY_LABELS[event.category] ?? event.category}, {formatEventDate(event)}
                      {event.show_countdown ? "" : ", tanpa countdown"}
                      {finished ? ", sudah lewat" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Hapus acara ini?")) deleteMutation.mutate(event.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground">Belum ada acara.</p>
      )}
    </div>
  );
}
