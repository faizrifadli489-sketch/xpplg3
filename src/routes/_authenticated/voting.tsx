import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { castVote, listPolls } from "@/lib/polls.functions";
import { useAuth } from "@/hooks/useAuth";
import { PollResults, type PollItem } from "@/components/poll-results";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { formatDateTimeId } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/voting")({
  head: () => ({
    meta: [
      { title: "Voting Kelas — X PPLG 3" },
      { name: "description", content: "Voting kelas X PPLG 3. Satu siswa satu suara, suara bersifat rahasia." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VotingPage,
});

function VotingPage() {
  const { studentId } = useAuth();
  const fetchPolls = useServerFn(listPolls);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["polls"],
    queryFn: () => fetchPolls(),
    refetchInterval: 15_000,
  });
  const polls = (data ?? []) as PollItem[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Voting Kelas</h1>
      <p className="mt-3 text-muted-foreground">
        Satu siswa satu suara. Suaramu rahasia dan tidak bisa diubah setelah dikirim. Hasil tampil setelah kamu memilih
        atau setelah voting ditutup.
      </p>

      <div className="mt-8 space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </>
        ) : isError ? (
          <p className="text-muted-foreground">Data voting belum bisa dimuat. Coba muat ulang halaman.</p>
        ) : polls.length === 0 ? (
          <p className="text-muted-foreground">Belum ada voting.</p>
        ) : (
          polls.map((poll) => <PollCard key={poll.id} poll={poll} canVote={!!studentId} />)
        )}
      </div>
    </div>
  );
}

function PollCard({ poll, canVote }: { poll: PollItem; canVote: boolean }) {
  const queryClient = useQueryClient();
  const vote = useServerFn(castVote);
  const [selected, setSelected] = useState("");

  const mutation = useMutation({
    mutationFn: () => vote({ data: { poll_id: poll.id, option_id: selected } }),
    onSuccess: () => {
      toast.success("Suaramu tercatat.");
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal mengirim suara."),
  });

  const canVoteNow = canVote && !poll.closed && poll.my_option_id === null;

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{poll.title}</h2>
          <span
            className={
              "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold " +
              (poll.closed ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground")
            }
          >
            {poll.closed ? "Ditutup" : "Terbuka"}
          </span>
        </div>
        {poll.description && <p className="mt-1 text-sm text-muted-foreground">{poll.description}</p>}
        {poll.closes_at && !poll.closed && (
          <p className="mt-1 text-xs text-muted-foreground">Ditutup {formatDateTimeId(poll.closes_at)} WIB</p>
        )}

        <div className="mt-5">
          {canVoteNow ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2">
                {poll.options.map((option) => (
                  <div key={option.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                    <RadioGroupItem value={option.id} id={`${poll.id}-${option.id}`} />
                    <Label htmlFor={`${poll.id}-${option.id}`} className="flex-1 cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <Button type="submit" disabled={!selected || mutation.isPending}>
                {mutation.isPending ? "Mengirim..." : "Kirim suara"}
              </Button>
            </form>
          ) : poll.results ? (
            <PollResults options={poll.options} results={poll.results} myOptionId={poll.my_option_id} />
          ) : (
            <p className="text-sm text-muted-foreground">Hasil akan tampil setelah voting ditutup.</p>
          )}
          {!canVote && !poll.closed && (
            <p className="mt-3 text-xs text-muted-foreground">Akun admin tidak ikut memberi suara.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
