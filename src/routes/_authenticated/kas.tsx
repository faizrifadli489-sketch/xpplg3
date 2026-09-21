import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyCash } from "@/lib/kas.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateId, formatRupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/kas")({
  head: () => ({
    meta: [
      { title: "Kas Kelas — X PPLG 3" },
      { name: "description", content: "Saldo kas dan status iuran kelas X PPLG 3." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KasPage,
});

function KasPage() {
  const fetchCash = useServerFn(getMyCash);
  const { data, isLoading, isError } = useQuery({ queryKey: ["my-cash"], queryFn: () => fetchCash() });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Kas Kelas</h1>
      <p className="mt-3 text-muted-foreground">
        Saldo dan pengeluaran kas bisa dilihat semua siswa. Status iuran hanya terlihat oleh kamu dan admin.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      ) : isError || !data ? (
        <p className="mt-8 text-muted-foreground">Data kas belum bisa dimuat. Coba muat ulang halaman.</p>
      ) : (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Saldo kas" value={formatRupiah(data.balance)} highlight />
            <SummaryCard label="Total masuk" value={formatRupiah(data.total_in)} />
            <SummaryCard label="Total keluar" value={formatRupiah(data.total_out)} />
          </div>

          <section className="mt-10">
            <h2 className="mb-3 font-display text-xl font-semibold">Iuran saya</h2>
            {!data.is_student ? (
              <p className="text-sm text-muted-foreground">
                Akun admin tidak punya iuran. Kelola tagihan dan pembayaran lewat dashboard admin.
              </p>
            ) : data.dues.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada tagihan iuran.</p>
            ) : (
              <div className="space-y-3">
                {data.dues.map((due) => (
                  <Card key={due.id} className="shadow-none">
                    <CardContent className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="font-medium">{due.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatRupiah(due.amount)}
                          {due.due_date ? `, batas ${formatDateId(due.due_date)}` : ""}
                        </p>
                        {due.paid && due.paid_at && (
                          <p className="text-xs text-muted-foreground">Dibayar {formatDateId(due.paid_at)}</p>
                        )}
                      </div>
                      <span
                        className={
                          "shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold " +
                          (due.paid ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive")
                        }
                      >
                        {due.paid ? "Lunas" : "Belum bayar"}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-3 font-display text-xl font-semibold">Pengeluaran kas</h2>
            {data.expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pengeluaran.</p>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border">
                {data.expenses.map((expense) => (
                  <div key={expense.id} className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateId(expense.spent_on)}</p>
                    </div>
                    <span className="shrink-0 font-mono text-sm">{formatRupiah(expense.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={
        "rounded-lg border px-4 py-4 " +
        (highlight ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")
      }
    >
      <p className={"text-xs " + (highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}
