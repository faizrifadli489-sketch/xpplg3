import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createPoll, deletePoll, listPolls, setPollOpen } from "@/lib/polls.functions";
import { PollResults, type PollItem } from "@/components/poll-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatDateTimeId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/voting")({
  component: AdminVoting,
});

function AdminVoting() {
  const queryClient = useQueryClient();
  const fetchPolls = useServerFn(listPolls);
  const create = useServerFn(createPoll);
  const toggleOpen = useServerFn(setPollOpen);
  const remove = useServerFn(deletePoll);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  const { data, isLoading } = useQuery({ queryKey: ["polls"], queryFn: () => fetchPolls(), refetchInterval: 15_000 });
  const polls = (data ?? []) as PollItem[];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["polls"] });

  const createMutation = useMutation({
    mutationFn: () => {
      const cleaned = options.map((o) => o.trim()).filter(Boolean);
      if (cleaned.length < 2) throw new Error("Isi minimal 2 pilihan.");
      return create({
        data: {
          title,
          description: description || null,
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
          options: cleaned,
        },
      });
    },
    onSuccess: () => {
      toast.success("Voting dibuat.");
      setOpen(false);
      setTitle("");
      setDescription("");
      setClosesAt("");
      setOptions(["", ""]);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal membuat voting."),
  });

  const toggleMutation = useMutation({
    mutationFn: (vars: { id: string; is_open: boolean }) => toggleOpen({ data: vars }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mengubah status."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Voting dihapus.");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus voting."),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Voting Kelas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suara bersifat rahasia: dashboard hanya menampilkan jumlah, bukan siapa memilih apa. Pilihan tidak bisa
            diedit setelah voting dibuat.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Buat voting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Voting</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="poll-title">Pertanyaan / judul</Label>
                <Input id="poll-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-desc">Keterangan (opsional)</Label>
                <Textarea
                  id="poll-desc"
                  rows={2}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Pilihan (2 sampai 10)</Label>
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      placeholder={`Pilihan ${index + 1}`}
                      maxLength={100}
                      onChange={(e) => setOptions(options.map((o, i) => (i === index ? e.target.value : o)))}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Hapus pilihan"
                        onClick={() => setOptions(options.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, ""])}>
                    <Plus className="mr-1 h-4 w-4" /> Tambah pilihan
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="poll-closes">Ditutup otomatis pada (opsional, WIB)</Label>
                <Input
                  id="poll-closes"
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Menyimpan..." : "Buat"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : polls.length > 0 ? (
        <div className="space-y-4">
          {polls.map((poll) => (
            <Card key={poll.id}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{poll.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {poll.closed ? "Ditutup" : "Terbuka"}
                      {poll.closes_at ? `, batas ${formatDateTimeId(poll.closes_at)} WIB` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ id: poll.id, is_open: !poll.is_open })}
                    >
                      {poll.is_open ? "Tutup" : "Buka lagi"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Hapus"
                      onClick={() => {
                        if (confirm("Hapus voting ini beserta semua suaranya?")) deleteMutation.mutate(poll.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4">
                  {poll.results ? (
                    <PollResults options={poll.options} results={poll.results} myOptionId={null} />
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada data hasil.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Belum ada voting.</p>
      )}
    </div>
  );
}
