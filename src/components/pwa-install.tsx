import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "xpplg3-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Tombol "Pasang sebagai Aplikasi" yang muncul hanya kalau browser benar-benar
 * menawarkan instalasi (event beforeinstallprompt) dan orang belum pernah
 * menutupnya. Tidak muncul di iOS Safari (browser itu tidak mengirim event ini;
 * di sana instal lewat menu Share > Add to Home Screen).
 */
export function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setDeferred(null));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg sm:left-auto sm:right-4">
      <Download className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-foreground">Pasang situs ini sebagai aplikasi di perangkatmu.</p>
      <Button
        size="sm"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        Pasang
      </Button>
      <button
        type="button"
        aria-label="Tutup"
        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
