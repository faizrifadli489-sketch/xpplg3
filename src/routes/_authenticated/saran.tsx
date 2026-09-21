import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sendSuggestion } from "@/lib/suggestions.functions";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/saran")({
  head: () => ({
    meta: [
      { title: "Kotak Saran — X PPLG 3" },
      { name: "description", content: "Kirim saran atau masukan untuk pengurus dan wali kelas X PPLG 3." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SaranPage,
});

const MAX_LENGTH = 1000;

function SaranPage() {
  const { studentId, isAdmin, roleLoading } = useAuth();
  const send = useServerFn(sendSuggestion);

  const [category, setCategory] = useState("saran");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const mutation = useMutation({
    mutationFn: () =>
      send({
        data: {
          message,
          category: category as "saran" | "kritik" | "pertanyaan" | "lainnya",
          is_anonymous: anonymous,
        },
      }),
    onSuccess: () => {
      toast.success("Pesan terkirim. Terima kasih!");
      setMessage("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mengirim pesan."),
  });

  if (roleLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Kotak Saran</h1>
        <p className="mt-4 text-muted-foreground">
          Halaman ini hanya untuk siswa yang punya akun kelas.
          {isAdmin && (
            <>
              {" "}
              Untuk membaca pesan masuk, buka{" "}
              <Link to="/admin/saran" className="font-medium text-primary hover:underline">
                dashboard admin
              </Link>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Kotak Saran</h1>
      <p className="mt-3 text-muted-foreground">
        Sampaikan saran, kritik, atau pertanyaan untuk pengurus kelas dan wali kelas tanpa harus chat pribadi.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>Jenis pesan</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="saran">Saran</SelectItem>
              <SelectItem value="kritik">Kritik</SelectItem>
              <SelectItem value="pertanyaan">Pertanyaan</SelectItem>
              <SelectItem value="lainnya">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Pesan</Label>
          <Textarea
            id="message"
            rows={6}
            maxLength={MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <p className="text-right text-xs text-muted-foreground">
            {message.length}/{MAX_LENGTH}
          </p>
        </div>

        <div className="rounded-md border border-border px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="anonymous" className="text-sm font-medium">
              Kirim sebagai anonim
            </Label>
            <Switch id="anonymous" checked={anonymous} onCheckedChange={setAnonymous} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {anonymous
              ? "Namamu tidak ditampilkan di dashboard admin. Untuk mencegah penyalahgunaan (spam, ancaman), sistem tetap menyimpan siapa pengirimnya di database."
              : "Namamu akan terlihat oleh admin bersama pesan ini."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">Maksimal 5 pesan per hari.</p>
          <Button type="submit" disabled={mutation.isPending || message.trim().length < 5}>
            {mutation.isPending ? "Mengirim..." : "Kirim"}
          </Button>
        </div>
      </form>
    </div>
  );
}
