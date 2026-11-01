export type PollItem = {
  id: string;
  title: string;
  description: string | null;
  is_open: boolean;
  closes_at: string | null;
  created_at: string;
  closed: boolean;
  options: { id: string; label: string; order_index: number }[];
  my_option_id: string | null;
  results: Record<string, number> | null;
};

export function PollResults({
  options,
  results,
  myOptionId,
}: {
  options: { id: string; label: string }[];
  results: Record<string, number>;
  myOptionId: string | null;
}) {
  const total = Object.values(results).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const votes = results[option.id] ?? 0;
        const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
        return (
          <div key={option.id}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">
                {option.label}
                {myOptionId === option.id && <span className="ml-2 text-xs font-normal text-primary">(pilihanmu)</span>}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {votes} suara, {percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Total {total} suara.</p>
    </div>
  );
}
