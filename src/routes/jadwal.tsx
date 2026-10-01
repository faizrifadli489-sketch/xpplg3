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

export const Route = createFileRoute("/jadwal")({
  head: () => ({
    meta: [
      { title: "Jadwal & Piket — X PPLG 3" },
      { name: "description", content: "Jadwal pelajaran, jadwal piket, dan countdown acara kelas X PPLG 3 SMKN 1 Leuwimunding." },
      { property: "og:title", content: "Jadwal & Piket — X PPLG 3" },
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

        <div className="mt-8 flex flex-wrap gap-2">
          {SCHOOL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={
                "rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                (day === activeDay
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground/70 hover:bg-accent hover:text-accent-foreground")
              }
            >
              {DAY_LABELS[day]}
              {today === day && <span className="ml-1.5 text-xs opacity-80">(hari ini)</span>}
            </button>
          ))}
        </div>
      </Reveal>

      {schedule.isError || piket.isError ? (
        <p className="mt-8 text-muted-foreground">Data jadwal belum bisa dimuat. Coba muat ulang halaman.</p>
      ) : isLoading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="mb-3 text-sm font-semibold">Mata pelajaran hari {DAY_LABELS[activeDay]}</h2>
            <ScheduleList entries={dayEntries} />
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
            <p className="text-muted-foreground">Data acara belum bisa dimuat.</p>
          ) : (
            <UpcomingEvents events={(events.data ?? []) as EventItem[]} now={now} />
          )}
        </div>
      </Reveal>
    </section>
  );
}
