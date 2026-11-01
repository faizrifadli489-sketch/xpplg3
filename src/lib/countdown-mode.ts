import { useSyncExternalStore } from "react";

/** "day" = label per hari (3 hari lagi). "ms" = hari:jam:menit:detik:ms yang berjalan langsung. */
export type CountdownMode = "day" | "ms";

const KEY = "xpplg3-countdown-mode";
const listeners = new Set<() => void>();
let mode: CountdownMode = "day";
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    if (localStorage.getItem(KEY) === "ms") mode = "ms";
  } catch {
    // abaikan: pilihan hanya tidak teringat
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    mode = e.newValue === "ms" ? "ms" : "day";
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CountdownMode {
  hydrate();
  return mode;
}

export function setCountdownMode(next: CountdownMode) {
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // abaikan
  }
  listeners.forEach((l) => l());
}

/** Pilihan mode countdown, dibagikan ke semua komponen dan diingat di perangkat ini. */
export function useCountdownMode(): [CountdownMode, (m: CountdownMode) => void] {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => "day" as CountdownMode);
  return [value, setCountdownMode];
}
