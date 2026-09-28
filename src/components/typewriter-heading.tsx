import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const TYPING_MS = 55;
const DELETING_MS = 28;
const PAUSE_AFTER_TYPE_MS = 1600;
const PAUSE_AFTER_DELETE_MS = 350;
// Batas berapa kali kalimat berganti sebelum berhenti (R-19: motion butuh titik henti,
// bukan loop tanpa akhir). Skala mengikuti jumlah kalimat, dibatasi maksimal 8.
const MAX_CYCLES = (count: number) => Math.min(count * 2, 8);
// Berapa lama kursor berkedip untuk kasus satu kalimat statis, sebelum diam permanen.
const STATIC_BLINK_MS = 6000;

/**
 * Judul hero dengan efek ketik-hapus. Kalimatnya diambil dari daftar yang admin
 * atur di dashboard (Profil Kelas > Kalimat Judul Beranda), dipilih acak setiap
 * putaran, berhenti sendiri setelah beberapa kali ganti (lihat MAX_CYCLES) supaya
 * bukan animasi tanpa akhir. Kalau cuma ada satu kalimat, tampil statis dengan
 * kursor berkedip sebentar lalu diam, bukan berkedip selamanya.
 * "Kelas X PPLG 3" tetap disediakan untuk pembaca layar lewat teks tersembunyi,
 * supaya heading tidak berubah-ubah bagi mereka.
 */
export function TypewriterHeading({ phrases, className }: { phrases: string[]; className?: string }) {
  const list = phrases.length > 0 ? phrases : ["Kelas X PPLG 3"];
  const [display, setDisplay] = useState(list[0]!);
  const [blink, setBlink] = useState(true);

  // Kasus statis (0-1 kalimat): berkedip sebentar sebagai sapaan awal, lalu diam.
  useEffect(() => {
    if (list.length >= 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setBlink(false);
      return;
    }
    const timeoutId = setTimeout(() => setBlink(false), STATIC_BLINK_MS);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length]);

  // Kasus 2+ kalimat: siklus ketik-hapus acak, berhenti setelah MAX_CYCLES.
  useEffect(() => {
    if (list.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let current = list[0]!;
    let cyclesLeft = MAX_CYCLES(list.length);

    const wait = (ms: number, next: () => void) => {
      timeoutId = setTimeout(() => {
        if (!cancelled) next();
      }, ms);
    };

    const afterTypedOnce = () => {
      setBlink(true); // jeda: kursor boleh berkedip
      wait(PAUSE_AFTER_TYPE_MS, () => {
        cyclesLeft -= 1;
        if (cyclesLeft <= 0) {
          setBlink(false); // selesai: kursor diam, tidak berkedip lagi
          return;
        }
        deleteChar(current.length);
      });
    };

    const typeChar = (index: number) => {
      setBlink(false);
      if (index < current.length) {
        setDisplay(current.slice(0, index + 1));
        wait(TYPING_MS, () => typeChar(index + 1));
      } else {
        afterTypedOnce();
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
        setBlink(false);
        wait(PAUSE_AFTER_DELETE_MS, () => typeChar(0));
      }
    };

    // Kalimat pertama sudah tampil penuh saat render awal (SSR); anggap baru
    // selesai diketik, lalu jalankan siklus jeda/hapus seperti biasa.
    afterTypedOnce();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.join("|")]);

  return (
    <h1 className={className}>
      <span className="sr-only">Kelas X PPLG 3</span>
      <span aria-hidden="true">
        {display}
        <span className={cn("caret", blink && "caret-blink")} />
      </span>
    </h1>
  );
}
