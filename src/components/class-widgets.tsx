import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { listEvents, listPiket, listSchedule } from "@/lib/class.functions";
import {
  CATEGORY_LABELS,
  DAY_LABELS,
  eventEndMs,
  eventStartMs,
  formatEventDate,
  formatTime,
  getCountdown,
  isEventUpcoming,
  useNow,
  wibDayOfWeek,
  type CountdownInfo,
} from "@/lib/time";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountdownMode, type CountdownMode } from "@/lib/countdown-mode";

export type ScheduleItem = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string | null;
  room: string | null;
};

export type PiketItem = {
  id: string;
  day_of_week: number;
  student_id: string;
  students: { full_name: string; nickname: string | null } | null;
};

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  category: string;
  show_countdown: boolean;
};

export function useClassData() {
  const fetchSchedule = useServerFn(listSchedule);
  const fetchPiket = useServerFn(listPiket);
  const fetchEvents = useServerFn(listEvents);

  const schedule = useQuery({ queryKey: ["schedule"], queryFn: () => fetchSchedule() });
  const piket = useQuery({ queryKey: ["piket"], queryFn: () => fetchPiket() });
  const events = useQuery({ queryKey: ["events"], queryFn: () => fetchEvents() });

  return { schedule, piket, events };
}

/** Hari sekolah yang ditampilkan "hari ini": Minggu & Sabtu (libur) dialihkan ke Senin. */
export function useToday() {
  const now = useNow();
  const today = now === null ? null : wibDayOfWeek(new Date(now));
  const showDay = today === null ? null : today === 0 || today === 6 ? 1 : today;
  return { now, today, showDay };
}

export function ScheduleList({ entries }: { entries: ScheduleItem[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada jadwal pelajaran untuk hari ini.</p>;
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {entries.map((entry) => {
        const detail = [entry.teacher, entry.room].filter(Boolean).join(", ");
        return (
          <div key={entry.id} className="flex items-start gap-4 px-4 py-3">
            <div className="w-28 shrink-0 font-mono text-sm text-muted-foreground">
              {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{entry.subject}</p>
              {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PiketNames({ items }: { items: PiketItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada yang dijadwalkan piket.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.id} className="rounded-full border border-border px-3 py-1 text-sm text-foreground">
          {item.students?.full_name ?? "(siswa dihapus)"}
        </span>
      ))}
    </div>
  );
}

const TONE_CLASSES: Record<CountdownInfo["tone"], string> = {
  now: "bg-primary text-primary-foreground",
  urgent: "bg-destructive/10 text-destructive",
  soon: "bg-accent text-accent-foreground",
  later: "bg-muted text-muted-foreground",
};

const DAY_MS = 86_400_000;

function pad(n: number, width: number) {
  return String(n).padStart(width, "0");
}

/** Hitung mundur berjalan langsung: hari : jam : menit : detik : milidetik. */
function MsCountdown({ event, label }: { event: EventItem; label: string }) {
  const start = useMemo(() => eventStartMs(event), [event]);
  const end = useMemo(() => eventEndMs(event), [event]);
  const [now, setNow] = useState<number | null>(null);

  // Hanya komponen kecil ini yang dirender ulang tiap frame, bukan seluruh halaman.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setInterval(tick, 1000); // pengguna yang mengurangi gerakan: cukup tiap detik
      return () => clearInterval(id);
    }
    let raf = 0;
    const loop = () => {
      tick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const left = now === null ? null : start - now;

  if (left !== null && left <= 0) {
    const running = now! < end;
    return (
      <div className={`mt-3 rounded-md px-3 py-2 text-center text-sm font-semibold ${TONE_CLASSES[running ? "now" : "later"]}`}>
        {running ? (event.event_time ? "Sedang berlangsung" : "Hari ini") : "Selesai"}
      </div>
    );
  }

  const tone: CountdownInfo["tone"] = left === null ? "later" : left <= DAY_MS ? "urgent" : left <= 7 * DAY_MS ? "soon" : "later";
  const total = left ?? 0;
  const units: [string, string][] =
    left === null
      ? [["--", "hari"], ["--", "jam"], ["--", "menit"], ["--", "detik"], ["---", "ms"]]
      : [
          [pad(Math.floor(total / DAY_MS), 2), "hari"],
          [pad(Math.floor(total / 3_600_000) % 24, 2), "jam"],
          [pad(Math.floor(total / 60_000) % 60, 2), "menit"],
          [pad(Math.floor(total / 1000) % 60, 2), "detik"],
          [pad(total % 1000, 3), "ms"],
        ];

  return (
    <div role="timer" className={`mt-3 rounded-md px-3 py-2 ${TONE_CLASSES[tone]}`}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex items-end justify-center gap-1 font-mono tabular-nums">
        {units.map(([value, unit], i) => (
          <Fragment key={unit}>
            {i > 0 && <span className="pb-4 text-lg opacity-60">:</span>}
            <div className="flex flex-col items-center">
              <span className="text-xl font-semibold leading-none sm:text-2xl">{value}</span>
              <span className="mt-1 text-[10px] uppercase tracking-wider opacity-70">{unit}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** Pilihan tampilan countdown: per hari atau live sampai milidetik. */
function CountdownModeToggle() {
  const [mode, setMode] = useCountdownMode();
  const options: [CountdownMode, string][] = [
    ["day", "Per hari"],
    ["ms", "Live (ms)"],
  ];
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="text-xs text-muted-foreground">Tampilan</span>
      <div className="inline-flex rounded-md bg-muted p-0.5" role="group" aria-label="Mode countdown">
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={
              "rounded px-2.5 py-1 text-xs font-medium transition-colors " +
              (mode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EventCard({ event, now }: { event: EventItem; now: number | null }) {
  const [mode] = useCountdownMode();
  const countdown = event.show_countdown && now !== null ? getCountdown(event, now) : null;
  const live = countdown !== null && mode === "ms";

  return (
    <Card className="shadow-none">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[event.category] ?? event.category}
            </p>
            <p className="mt-1 font-medium text-foreground">{event.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatEventDate(event)}</p>
            {event.description && <p className="mt-2 text-sm text-foreground/80">{event.description}</p>}
          </div>
          {countdown && !live && (
            <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[countdown.tone]}`}>
              {countdown.label}
            </span>
          )}
        </div>
        {live && <MsCountdown event={event} label={countdown.label} />}
      </CardContent>
    </Card>
  );
}

export function UpcomingEvents({
  events,
  now,
  limit,
}: {
  events: EventItem[];
  now: number | null;
  limit?: number;
}) {
  if (now === null) return <Skeleton className="h-20 rounded-lg" />;

  const upcoming = events.filter((event) => isEventUpcoming(event, now));
  const shown = limit ? upcoming.slice(0, limit) : upcoming;

  if (shown.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada acara atau ujian mendatang.</p>;
  }

  return (
    <div className="space-y-3">
      {shown.some((event) => event.show_countdown) && <CountdownModeToggle />}
      {shown.map((event) => (
        <EventCard key={event.id} event={event} now={now} />
      ))}
    </div>
  );
}

/** Blok "Hari ini" untuk beranda: mapel, piket, dan countdown terdekat. */
export function TodayPanel() {
  const { schedule, piket, events } = useClassData();
  const { now, today, showDay } = useToday();

  const isLoading = schedule.isLoading || piket.isLoading || events.isLoading || showDay === null;
  const hasError = schedule.isError || piket.isError || events.isError;

  const dayEntries = ((schedule.data ?? []) as ScheduleItem[]).filter((e) => e.day_of_week === showDay);
  const dayPiket = ((piket.data ?? []) as unknown as PiketItem[]).filter((p) => p.day_of_week === showDay);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-muted-foreground">// hari ini</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {today === null
              ? "Memuat..."
              : today === 0
                ? "Minggu, libur. Jadwal Senin:"
                : today === 6
                  ? "Sabtu, libur. Jadwal Senin:"
                  : DAY_LABELS[today]}
          </h2>
        </div>
        <Link to="/jadwal" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          Jadwal lengkap <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {hasError ? (
        <p className="text-sm text-muted-foreground">Data jadwal belum bisa dimuat. Coba muat ulang halaman.</p>
      ) : isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Mata pelajaran</h3>
            <ScheduleList entries={dayEntries} />
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Piket</h3>
              <PiketNames items={dayPiket} />
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">Countdown</h3>
              <UpcomingEvents events={(events.data ?? []) as EventItem[]} now={now} limit={2} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
