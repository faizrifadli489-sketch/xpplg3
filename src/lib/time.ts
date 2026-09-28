import { useEffect, useState } from "react";

const WIB = "Asia/Jakarta";

export const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
export const SCHOOL_DAYS = [1, 2, 3, 4, 5] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  ujian: "Ujian",
  tugas: "Tugas",
  event: "Acara",
  libur: "Libur",
};

export function wibDayOfWeek(date: Date = new Date()): number {
  const short = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: WIB }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[short] ?? 1;
}

// Format YYYY-MM-DD di zona waktu WIB
export function wibDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: WIB }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

export type EventLike = { event_date: string; event_time: string | null };

function eventStartMs(event: EventLike): number {
  const time = event.event_time ? event.event_time.slice(0, 5) : "00:00";
  return Date.parse(`${event.event_date}T${time}:00+07:00`);
}

function eventEndMs(event: EventLike): number {
  // Acara tanpa jam dianggap berlangsung seharian, acara berjam dianggap 3 jam.
  return eventStartMs(event) + (event.event_time ? 3 : 24) * 3600 * 1000;
}

export function isEventUpcoming(event: EventLike, now: number = Date.now()): boolean {
  return now < eventEndMs(event);
}

export type CountdownInfo = { label: string; tone: "now" | "urgent" | "soon" | "later" };

export function getCountdown(event: EventLike, now: number = Date.now()): CountdownInfo {
  const start = eventStartMs(event);

  if (now >= start && now < eventEndMs(event)) {
    return { label: event.event_time ? "Sedang berlangsung" : "Hari ini", tone: "now" };
  }

  const msLeft = start - now;
  if (event.event_time && msLeft > 0 && msLeft < 24 * 3600 * 1000) {
    const totalMinutes = Math.floor(msLeft / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { label: hours > 0 ? `${hours} jam ${minutes} menit lagi` : `${minutes} menit lagi`, tone: "urgent" };
  }

  const today = wibDateString(new Date(now));
  const diff = Math.round((Date.parse(`${event.event_date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);

  if (diff <= 0) return { label: "Hari ini", tone: "now" };
  if (diff === 1) return { label: "Besok", tone: "urgent" };
  return { label: `${diff} hari lagi`, tone: diff <= 7 ? "soon" : "later" };
}

export function formatEventDate(event: EventLike): string {
  const date = new Date(`${event.event_date}T00:00:00Z`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return event.event_time ? `${date}, pukul ${formatTime(event.event_time).replace(":", ".")} WIB` : date;
}

// Nilai awal null supaya hasil render server dan browser sama (hindari hydration mismatch).
export function useNow(intervalMs: number = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
