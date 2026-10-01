import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { installPwa, usePwaInstall } from "@/lib/pwa-install";

const DISMISS_KEY = "xpplg3-pwa-install-dismissed";

/**
 * Banner "Pasang sebagai Aplikasi": muncul hanya kalau browser menawarkan instalasi
 * (atau di iPhone Safari sebagai petunjuk manual) dan belum pernah ditutup.
 * Tombol pasang yang selalu tersedia ada di halaman /pengaturan.
 */
export function PwaInstallButton() {
  const pwa = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const close = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (dismissed || pwa.installed) return null;

  if (!pwa.canPrompt && pwa.iosSafari) {
    return (
      <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
        <Share className="h-5 w-5 shrink-0 text-primary" />
        <p className="flex-1 text-sm text-foreground">
          Pasang sebagai aplikasi: ketuk <span className="font-medium">Bagikan</span>, lalu{" "}
          <span className="font-medium">Tambah ke Layar Utama</span>.
        </p>
        <button
          type="button"
          aria-label="Tutup"
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
          onClick={close}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!pwa.canPrompt) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg sm:left-auto sm:right-4">
      <Download className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-foreground">Pasang situs ini sebagai aplikasi di perangkatmu.</p>
      <Button size="sm" onClick={() => void installPwa()}>
        Pasang
      </Button>
      <button
        type="button"
        aria-label="Tutup"
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
        onClick={close}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
