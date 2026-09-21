import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSuggestions, setSuggestionRead, deleteSuggestion } from "@/lib/suggestions.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/saran")({
  component: AdminSaran,
});

const CATEGORY_LABELS: Record<string, string> = {
  saran: "Saran",
  kritik: "Kritik",
  pertanyaan: "Pertanyaan",
  lainnya: "Lainnya",
};

function AdminSaran() {
  const queryClient = useQueryClient();
  const fetchSuggestions = useServerFn(listSuggestions);
  const setRead = useServerFn(setSuggestionRead);
  const remove = useServerFn(deleteSuggestion);

  const { data, isLoading } = useQuery({ queryKey: ["suggestions"], queryFn: () => fetchSuggestions() });
  const suggestions = data ?? [];
  const unread = suggestions.filter((s) => !s.is_read).length;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["suggestions"] });

  const readMutation = useMutation({
    mutationFn: (vars: { id: string; is_read: boolean }) => setRead({ data: vars }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal memperbarui pesan."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Pesan dihapus.");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus pesan."),
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Kotak Saran</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {unread > 0 ? `${unread} pesan belum dibaca.` : "Semua pesan sudah dibaca."} Pesan anonim tidak menampilkan
          nama pengirim.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-3">
          {suggestions.map((item) => (
            <Card key={item.id} className={item.is_read ? "opacity-70" : ""}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                      {item.is_read ? "" : ", baru"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.sender_name ?? "Anonim"},{" "}
                      {new Date(item.created_at).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Jakarta",
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={item.is_read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                      onClick={() => readMutation.mutate({ id: item.id, is_read: !item.is_read })}
                    >
                      <Check className={"h-4 w-4 " + (item.is_read ? "text-primary" : "")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Hapus"
                      onClick={() => {
                        if (confirm("Hapus pesan ini?")) deleteMutation.mutate(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{item.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Belum ada pesan masuk.</p>
      )}
    </div>
  );
}
