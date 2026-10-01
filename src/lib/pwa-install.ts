import { useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type PwaState = {
  /** Browser menawarkan instalasi langsung (Chrome/Edge/Android). */
  canPrompt: boolean;
  /** Sudah dibuka sebagai aplikasi terpasang. */
  installed: boolean;
  /** iPhone/iPad Safari: pasang lewat Bagikan > Tambah ke Layar Utama. */
  iosSafari: boolean;
};

const SERVER_STATE: PwaState = { canPrompt: false, installed: false, iosSafari: false };

const listeners = new Set<() => void>();
let deferred: BeforeInstallPromptEvent | null = null;
let state: PwaState = SERVER_STATE;
let initialized = false;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function update() {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  const installed = isStandalone();
  state = { canPrompt: deferred !== null, installed, iosSafari: isIos && isSafari && !installed };
  listeners.forEach((l) => l());
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    update();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    update();
  });
  update();
}

function subscribe(listener: () => void) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  init();
  return state;
}

/** Menampilkan dialog instalasi bawaan browser. Mengembalikan true kalau pengguna setuju. */
export async function installPwa(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const choice = await event.userChoice;
  deferred = null;
  update();
  return choice.outcome === "accepted";
}

export function usePwaInstall(): PwaState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}
