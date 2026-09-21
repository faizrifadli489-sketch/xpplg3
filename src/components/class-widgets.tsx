import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { listEvents, listPiket, listSchedule } from "@/lib/class.functions";
import {
  CATEGORY_LABELS,
  DAY_LABELS,
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

/** Hari sekolah yang ditampilkan "hari ini": Minggu dialihkan ke Senin. */
export function useToday() {
  const now = useNow();
  const today = now === null ? null : wibDayOfWeek(new Date(now));
  const showDay = today === null ? null : today === 0 ? 1 : today;
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

export function EventCard({ event, now }: { event: EventItem; now: number | null }) {
  const countdown = event.show_countdown && now !== null ? getCountdown(event, now) : null;

  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start justify-between gap-4 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[event.category] ?? event.category}
          </p>
          <p className="mt-1 font-medium text-foreground">{event.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{formatEventDate(event)}</p>
          {event.description && <p className="mt-2 text-sm text-foreground/80">{event.description}</p>}
        </div>
        {countdown && (
          <span className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[countdown.tone]}`}>
            {countdown.label}
          </span>
        )}
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
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Hari ini</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            {today === null ? "Memuat..." : today === 0 ? "Minggu, libur. Jadwal Senin:" : DAY_LABELS[today]}
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
