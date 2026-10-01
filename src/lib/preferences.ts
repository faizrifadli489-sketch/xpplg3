import { useSyncExternalStore } from "react";

/**
 * Pengaturan tampilan per pengunjung. Disimpan di localStorage perangkat ini,
 * jadi tidak berpengaruh ke orang lain.
 * Kunci "xpplg3-prefs" harus sama dengan script anti-kedip di routes/__root.tsx.
 */
export const FONT_SCALES = [90, 100, 112, 125] as const;
export type FontScale = (typeof FONT_SCALES)[number];
export type ScheduleStart = "today" | "1" | "2" | "3" | "4" | "5";
export type UiStyle = "default" | "brutal" | "glass";

export type Prefs = {
  uiStyle: UiStyle;
  fontScale: FontScale;
  reduceMotion: boolean;
  aiHidden: boolean;
  scheduleStart: ScheduleStart;
};

export const DEFAULT_PREFS: Prefs = {
  uiStyle: "default",
  fontScale: 100,
  reduceMotion: false,
  aiHidden: false,
  scheduleStart: "today",
};

const KEY = "xpplg3-prefs";
const START_VALUES: ScheduleStart[] = ["today", "1", "2", "3", "4", "5"];
const STYLE_VALUES: UiStyle[] = ["default", "brutal", "glass"];

const listeners = new Set<() => void>();
let prefs: Prefs = DEFAULT_PREFS;
let hydrated = false;

function sanitize(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    uiStyle: STYLE_VALUES.includes(r.uiStyle as UiStyle) ? (r.uiStyle as UiStyle) : DEFAULT_PREFS.uiStyle,
    fontScale: FONT_SCALES.includes(r.fontScale as FontScale) ? (r.fontScale as FontScale) : DEFAULT_PREFS.fontScale,
    reduceMotion: r.reduceMotion === true,
    aiHidden: r.aiHidden === true,
    scheduleStart: START_VALUES.includes(r.scheduleStart as ScheduleStart)
      ? (r.scheduleStart as ScheduleStart)
      : DEFAULT_PREFS.scheduleStart,
  };
}

function apply(p: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.fontSize = p.fontScale === 100 ? "" : `${p.fontScale}%`;
  root.classList.toggle("reduce-motion", p.reduceMotion);
  if (p.uiStyle === "default") root.removeAttribute("data-style");
  else root.setAttribute("data-style", p.uiStyle);
}

function read(): Prefs {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
  } catch {
    return DEFAULT_PREFS;
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  prefs = read();
  apply(prefs);
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    prefs = read();
    apply(prefs);
    notify();
  });
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Prefs {
  hydrate();
  return prefs;
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  prefs = { ...prefs, [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // abaikan: pilihan hanya tidak teringat setelah halaman ditutup
  }
  apply(prefs);
  notify();
}

export function resetPrefs() {
  prefs = DEFAULT_PREFS;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // abaikan
  }
  apply(prefs);
  notify();
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_PREFS);
}
