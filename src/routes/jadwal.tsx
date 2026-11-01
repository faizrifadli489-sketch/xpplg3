import { usePrefs } from "@/lib/preferences";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PiketNames,
  ScheduleList,
  UpcomingEvents,
  useClassData,
  useToday,
  type EventItem,
  type PiketItem,
  type ScheduleItem,
} from "@/components/class-widgets";
import { DAY_LABELS, SCHOOL_DAYS } from "@/lib/time";
import { Reveal } from "@/components/reveal";
import { ErrorState } from "@/components/state-notice";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jadwal")({
  head: () => ({
    meta: [
      { title: "Jadwal & Piket | X PPLG 3" },
      { name: "description", content: "Jadwal pelajaran, jadwal piket, dan countdown acara kelas X PPLG 3 SMKN 1 Leuwimunding." },
      { property: "og:title", content: "Jadwal & Piket | X PPLG 3" },
      { property: "og:description", content: "Jadwal pelajaran, jadwal piket, dan countdown acara kelas X PPLG 3 SMKN 1 Leuwimunding." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JadwalPage,
});

function JadwalPage() {
  const { schedule, piket, events } = useClassData();
  const { now, today, showDay } = useToday();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { scheduleStart } = usePrefs();
  const startDay = scheduleStart === "today" ? showDay : Number(scheduleStart);
  const activeDay = selectedDay ?? startDay ?? 1;
  const isLoading = schedule.isLoading || piket.isLoading || events.isLoading;

  const dayEntries = ((schedule.data ?? []) as ScheduleItem[]).filter((e) => e.day_of_week === activeDay);
  const dayPiket = ((piket.data ?? []) as unknown as PiketItem[]).filter((p) => p.day_of_week === activeDay);

  return (
    <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal>
        <p className="mb-3 font-mono text-sm text-muted-foreground">// hari ini & seterusnya</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Jadwal & Piket</h1>
        <p className="mt-3 text-muted-foreground">
          Jadwal pelajaran, siapa yang piket, dan hitung mundur acara penting kelas X PPLG 3.
        </p>

        <div role="group" aria-label="Pilih hari" className="mt-8 flex flex-wrap gap-2">
          {SCHOOL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={day === activeDay}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-md border px-3.5 text-sm font-medium transition-colors",
                day === activeDay
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {DAY_LABELS[day]}
              {today === day && (
                <span className={cn("font-mono text-[11px]", day === activeDay ? "text-primary-foreground" : "text-primary")}>
                  hari ini
                </span>
              )}
            </button>
          ))}
        </div>
      </Reveal>

      {schedule.isError || piket.isError ? (
        <ErrorState
          className="mt-8"
          title="Jadwal belum bisa dimuat"
          retrying={schedule.isFetching || piket.isFetching}
          onRetry={() => {
            void schedule.refetch();
            void piket.refetch();
          }}
        />
      ) : isLoading ? (
        <div role="status" aria-label="Memuat jadwal" className="mt-8 grid gap-8 md:grid-cols-[2fr_1fr]">
          <Skeleton className="h-56 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Mata pelajaran hari {DAY_LABELS[activeDay]}</h2>
            <ScheduleList entries={dayEntries} now={now} isToday={today === activeDay} />
          </div>
          <div>
            <h2 className="mb-3 text-sm font-semibold">Piket hari {DAY_LABELS[activeDay]}</h2>
            <PiketNames items={dayPiket} />
          </div>
        </div>
      )}

      <Reveal className="mt-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Acara & countdown</h2>
        <div className="mt-4">
          {events.isError ? (
            <ErrorState title="Acara belum bisa dimuat" retrying={events.isFetching} onRetry={() => void events.refetch()} />
          ) : (
            <UpcomingEvents events={(events.data ?? []) as EventItem[]} now={now} />
          )}
        </div>
      </Reveal>
    </section>
  );
}
