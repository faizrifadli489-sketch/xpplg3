import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TYPING_MS = 55;
const DELETING_MS = 28;
const PAUSE_AFTER_TYPE_MS = 1600;
const PAUSE_AFTER_DELETE_MS = 350;

/**
 * Judul hero dengan efek ketik-hapus. Kalimatnya diambil dari daftar yang admin
 * atur di dashboard (Profil Kelas > Kalimat Judul Beranda), dipilih acak setiap
 * putaran. Kalau cuma ada satu kalimat, tampil statis (tidak mengetik ulang hal
 * yang sama terus-menerus) dengan kursor yang berkedip pelan.
 * "Kelas X PPLG 3" tetap disediakan untuk pembaca layar lewat teks tersembunyi,
 * supaya heading tidak berubah-ubah bagi mereka.
 */
export function TypewriterHeading({ phrases, className }: { phrases: string[]; className?: string }) {
  const list = phrases.length > 0 ? phrases : ["Kelas X PPLG 3"];
  const [display, setDisplay] = useState(list[0]!);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (list.length < 2) return;
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.documentElement.classList.contains("reduce-motion"))
    )
      return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let current = list[0]!;

    const wait = (ms: number, next: () => void) => {
      timeoutId = setTimeout(() => {
        if (!cancelled) next();
      }, ms);
    };

    const typeChar = (index: number) => {
      setBlink(false);
      if (index < current.length) {
        setDisplay(current.slice(0, index + 1));
        wait(TYPING_MS, () => typeChar(index + 1));
      } else {
        setBlink(true);
        wait(PAUSE_AFTER_TYPE_MS, () => deleteChar(current.length));
      }
    };

    const deleteChar = (index: number) => {
      setBlink(false);
      if (index > 0) {
        setDisplay(current.slice(0, index - 1));
        wait(DELETING_MS, () => deleteChar(index - 1));
      } else {
        let next = current;
        while (next === current) next = list[Math.floor(Math.random() * list.length)]!;
        current = next;
        setBlink(true);
        wait(PAUSE_AFTER_DELETE_MS, () => typeChar(0));
      }
    };

    // Kalimat pertama sudah tampil penuh saat render awal (SSR); anggap baru
    // selesai diketik, lalu jeda dulu sebelum mulai menghapus.
    setBlink(true);
    wait(PAUSE_AFTER_TYPE_MS, () => deleteChar(current.length));

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.join("|")]);

  const trimmed = display.replace(/\s+$/, "");
  const cut = trimmed.lastIndexOf(" ") + 1;
  const head = trimmed.slice(0, cut);
  const tail = trimmed.slice(cut);

  return (
    <h1 className={className}>
      <span className="sr-only">Kelas X PPLG 3</span>
      <span aria-hidden="true">
        {head}
        {/* Kata terakhir + kursor dibungkus nowrap supaya kursor tidak jatuh sendirian ke baris baru. */}
        <span className="whitespace-nowrap">
          {tail}
          <span className={cn("caret", blink && "caret-blink")} />
        </span>
      </span>
    </h1>
  );
}
