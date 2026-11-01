import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

/** Bilah info di paling atas: muncul saat offline, dan sebentar saat kembali online. */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [justBack, setJustBack] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const goOnline = () => {
      setOnline(true);
      setJustBack(true);
      timer = setTimeout(() => setJustBack(false), 2500);
    };
    const goOffline = () => {
      setOnline(false);
      setJustBack(false);
    };
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (online && !justBack) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium " +
        (online
          ? "bg-primary text-primary-foreground"
          : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100")
      }
    >
      {online ? <Wifi className="h-4 w-4 shrink-0" /> : <WifiOff className="h-4 w-4 shrink-0" />}
      <span>
        {online
          ? "Kembali online. Data diperbarui."
          : "Kamu sedang offline. Data yang tampil bisa jadi bukan yang terbaru, dan perubahan belum bisa disimpan."}
      </span>
    </div>
  );
}
