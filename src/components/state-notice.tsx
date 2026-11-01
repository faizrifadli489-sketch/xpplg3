import type { ReactNode } from "react";
import { Inbox, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Keadaan "kosong" dan "gagal memuat" yang dipakai bersama oleh semua halaman daftar.
 * Dulu gagal memuat tampil sama persis dengan "belum ada data", sehingga siswa
 * mengira datanya memang tidak ada padahal cuma sinyalnya lemah.
 */

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-border px-5 py-8 sm:px-8", className)}>
      <Inbox className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 font-medium text-foreground">{title}</p>
      {children && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Data belum bisa dimuat",
  children,
  onRetry,
  retrying = false,
  className,
}: {
  title?: string;
  children?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <div
      role="alert"
      className={cn("rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-6 sm:px-8", className)}
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {children ??
              (offline
                ? "Kamu sedang offline. Sambungkan internet, lalu coba lagi."
                : "Server belum merespons. Coba lagi sebentar lagi.")}
          </p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry} disabled={retrying}>
              <RefreshCw className={cn(retrying && "animate-spin")} aria-hidden="true" />
              Muat ulang
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
