import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban, ChevronDown, Copy, Dices, Loader2, Minus, Plus, RotateCcw, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Reveal } from "@/components/reveal";
import { listStudents } from "@/lib/students.functions";
import { formatDateId } from "@/lib/format";
import { wibDateString } from "@/lib/time";
import {
  genderCounts,
  makeGroups,
  pickPeople,
  renderResultImage,
  resultToText,
  type Person,
  type RandomResult,
} from "@/lib/randomizer";

export const Route = createFileRoute("/acak")({
  head: () => ({
    meta: [
      { title: "Acak Siswa — X PPLG 3" },
      { name: "description", content: "Bagi siswa kelas X PPLG 3 jadi kelompok atau pilih siswa secara acak." },
      { property: "og:title", content: "Acak Siswa — X PPLG 3" },
      { property: "og:description", content: "Bagi siswa jadi kelompok atau pilih siswa secara acak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AcakPage,
});

type Mode = "groups" | "pick";
const EXCLUDED_KEY = "xpplg3-acak-excluded";
const ROLL_MS = 1100;

function loadExcluded(): Set<string> {
  try {
    const raw = localStorage.getItem(EXCLUDED_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function AcakPage() {
  const fetchStudents = useServerFn(listStudents);
  const { data: students, isLoading } = useQuery({ queryKey: ["students"], queryFn: () => fetchStudents() });

  const [mode, setMode] = useState<Mode>("groups");
  const [count, setCount] = useState(4);
  const [present, setPresent] = useState<Set<string> | null>(null); // null = semua ikut
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false);
  const [genderMix, setGenderMix] = useState(0);
  const [autoRemove, setAutoRemove] = useState(false);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  const [rolling, setRolling] = useState(false);
  const [rollName, setRollName] = useState("");
  const [result, setResult] = useState<RandomResult | null>(null);
  const [resultId, setResultId] = useState(0);
  const [busy, setBusy] = useState<"copy" | "share" | null>(null);

  const timers = useRef<{ tick?: ReturnType<typeof setInterval>; done?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    setExcluded(loadExcluded());
    return () => {
      clearInterval(timers.current.tick);
      clearTimeout(timers.current.done);
    };
  }, []);

  const eligible: Person[] = useMemo(
    () =>
      (students ?? [])
        .filter((s) => !excluded.has(s.id) && (present === null || present.has(s.id)))
        .map((s) => ({
          id: s.id,
          name: s.full_name,
          gender: s.gender === "L" || s.gender === "P" ? (s.gender as "L" | "P") : null,
        })),
    [students, excluded, present],
  );

  // Kalau "hilangkan yang sudah terpilih" aktif (mode pilih siswa), yang sudah terpilih tidak ikut lagi.
  const pool = useMemo(
    () => (mode === "pick" && autoRemove ? eligible.filter((p) => !pickedIds.has(p.id)) : eligible),
    [mode, autoRemove, eligible, pickedIds],
  );

  const min = mode === "groups" ? 2 : 1;
  const max = Math.max(pool.length, min);
  const effective = Math.min(Math.max(count, min), max);
  const canRun = pool.length >= min && !rolling;
  const poolGender = genderCounts(pool);

  const perGroup = mode === "groups" && pool.length >= min ? pool.length / effective : 0;
  const perGroupText =
    perGroup > 0
      ? Number.isInteger(perGroup)
        ? `${perGroup} orang per kelompok`
        : `${Math.floor(perGroup)}–${Math.ceil(perGroup)} orang per kelompok`
      : "";

  const setPresentIds = (ids: Set<string> | null) => setPresent(ids);

  const isPresent = (id: string) => present === null || present.has(id);

  const togglePresent = (id: string, checked: boolean) => {
    const base = present ?? new Set<string>((students ?? []).map((s) => s.id));
    const next = new Set<string>(base);
    if (checked) next.add(id);
    else next.delete(id);
    setPresentIds(next);
  };

  const toggleExcluded = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(EXCLUDED_KEY, JSON.stringify([...next]));
      } catch {
        // abaikan: hanya untuk mengingat pilihan di perangkat ini
      }
      return next;
    });
  };

  const run = () => {
    if (!canRun) return;
    setRolling(true);
    const names = pool.map((p) => p.name);
    timers.current.tick = setInterval(() => {
      setRollName(names[Math.floor(Math.random() * names.length)]);
    }, 70);
    timers.current.done = setTimeout(() => {
      clearInterval(timers.current.tick);
      const next = mode === "groups" ? makeGroups(pool, effective, genderMix) : pickPeople(pool, effective);
      setResult(next);
      if (next.mode === "pick" && autoRemove) {
        setPickedIds((prev) => new Set([...prev, ...next.picked.map((p) => p.id)]));
      }
      setResultId((n) => n + 1);
      setRolling(false);
    }, ROLL_MS);
  };

  const dateLabel = formatDateId(wibDateString());

  const copy = async () => {
    if (!result) return;
    setBusy("copy");
    try {
      const text = resultToText(result, dateLabel);
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("copy failed");
      }
      toast.success("Hasil disalin.");
    } catch {
      toast.error("Gagal menyalin. Salin manual dari layar ya.");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    if (!result) return;
    setBusy("share");
    try {
      const blob = await renderResultImage(result, dateLabel);
      const file = new File([blob], "acak-siswa-xpplg3.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Hasil acak X PPLG 3" });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          // lanjut ke unduh biasa
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Gambar diunduh.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat gambar.");
    } finally {
      setBusy(null);
    }
  };

  const activeCount = pool.length;
  const pickedList = eligible.filter((p) => pickedIds.has(p.id));
  const totalCount = students?.length ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mb-10 max-w-2xl">
        <p className="mb-3 font-mono text-sm text-muted-foreground">// alat kelas</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Acak Siswa</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Bagi siswa jadi beberapa kelompok, atau pilih beberapa siswa secara acak.
        </p>
      </Reveal>

      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : totalCount === 0 ? (
        <p className="text-muted-foreground">Belum ada data siswa.</p>
      ) : (
        <div className="space-y-6">
          <Card className="rounded-lg shadow-none">
            <CardContent className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Mode acak">
                {(
                  [
                    ["groups", "Bagi kelompok", Users],
                    ["pick", "Pilih siswa", Dices],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    disabled={rolling}
                    onClick={() => setMode(value)}
                    className={
                      "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                      (mode === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div>
                  <p className="mb-1.5 text-sm font-medium">
                    {mode === "groups" ? "Jumlah kelompok" : "Butuh berapa siswa"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={rolling || effective <= min}
                      onClick={() => setCount(effective - 1)}
                      aria-label="Kurangi"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={min}
                      max={max}
                      value={count}
                      disabled={rolling}
                      onChange={(e) => setCount(Number(e.target.value) || min)}
                      onBlur={() => setCount(effective)}
                      className="h-10 w-20 rounded-md border border-input bg-background text-center text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={mode === "groups" ? "Jumlah kelompok" : "Jumlah siswa"}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={rolling || effective >= max}
                      onClick={() => setCount(effective + 1)}
                      aria-label="Tambah"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {mode === "groups" ? perGroupText : `dari ${activeCount} siswa yang masih bisa dipilih`}
                </p>
              </div>

              {mode === "groups" && (
                <GenderMixControl
                  value={genderMix}
                  onChange={setGenderMix}
                  disabled={rolling}
                  males={poolGender.l}
                  females={poolGender.p}
                />
              )}

              {mode === "pick" && (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Hilangkan siswa yang sudah terpilih</p>
                      <p className="text-xs text-muted-foreground">
                        Siswa yang sudah keluar tidak akan terpilih lagi di putaran berikutnya.
                      </p>
                    </div>
                    <Switch
                      checked={autoRemove}
                      disabled={rolling}
                      onCheckedChange={(v) => {
                        setAutoRemove(v);
                        if (!v) setPickedIds(new Set());
                      }}
                      aria-label="Hilangkan siswa yang sudah terpilih"
                    />
                  </div>
                  {autoRemove && pickedList.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{pickedList.length} sudah terpilih</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={rolling}
                          onClick={() => setPickedIds(new Set())}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Reset
                        </Button>
                      </div>
                      <div className="flex max-h-24 flex-wrap gap-1.5 overflow-auto">
                        {pickedList.map((p) => (
                          <span key={p.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setShowList((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={showList}
                >
                  <span className="text-sm">
                    <span className="font-medium">{activeCount}</span> dari {totalCount} siswa ikut
                    {excluded.size > 0 && (
                      <span className="text-muted-foreground"> · {excluded.size} dikecualikan tetap</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-primary">
                    Atur peserta
                    <ChevronDown className={"h-4 w-4 transition-transform " + (showList ? "rotate-180" : "")} />
                  </span>
                </button>

                {showList && (
                  <div className="border-t border-border">
                    <div className="flex flex-wrap gap-2 px-4 py-3">
                      <Button type="button" size="sm" variant="outline" onClick={() => setPresentIds(null)}>
                        Pilih semua
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setPresentIds(new Set())}>
                        Kosongkan
                      </Button>
                    </div>
                    <div className="max-h-80 divide-y divide-border overflow-auto border-t border-border">
                      {(students ?? []).map((s) => {
                        const isExcluded = excluded.has(s.id);
                        return (
                          <div key={s.id} className="flex items-center gap-3 px-4 py-2">
                            <Checkbox
                              checked={!isExcluded && isPresent(s.id)}
                              disabled={isExcluded}
                              onCheckedChange={(v) => togglePresent(s.id, v === true)}
                              aria-label={`Ikutkan ${s.full_name}`}
                            />
                            <span
                              className={
                                "min-w-0 flex-1 truncate text-sm " + (isExcluded ? "text-muted-foreground line-through" : "")
                              }
                            >
                              {s.full_name}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExcluded(s.id)}
                              className={
                                "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors " +
                                (isExcluded
                                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground")
                              }
                              aria-pressed={isExcluded}
                            >
                              <Ban className="h-3 w-3" />
                              {isExcluded ? "Dikecualikan" : "Kecualikan tetap"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                      "Kecualikan tetap" diingat di perangkat ini dan tidak ikut diacak sampai kamu batalkan.
                    </p>
                  </div>
                )}
              </div>

              <Button type="button" size="lg" className="w-full" disabled={!canRun} onClick={run}>
                {rolling ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Dices className="mr-2 h-5 w-5" />}
                {rolling
                  ? "Mengacak..."
                  : result
                    ? mode === "pick" && autoRemove
                      ? "Pilih lagi"
                      : "Acak ulang"
                    : "Acak sekarang"}
              </Button>
              {!rolling && pool.length < min && (
                <p className="text-center text-sm text-destructive">
                  {mode === "groups"
                    ? "Minimal 2 siswa ikut untuk dibagi kelompok."
                    : pickedList.length > 0
                      ? "Semua siswa sudah terpilih. Tekan Reset untuk mulai dari awal."
                      : "Pilih minimal 1 siswa yang ikut."}
                </p>
              )}
            </CardContent>
          </Card>

          {rolling && (
            <div className="relative overflow-hidden rounded-lg border border-border bg-card px-6 py-10 text-center" aria-live="polite">
              <div className="thumb-shimmer absolute inset-0" />
              <p className="relative mb-2 font-mono text-xs text-muted-foreground">// mengacak</p>
              <p className="relative truncate font-display text-2xl font-semibold sm:text-3xl">{rollName || "..."}</p>
            </div>
          )}

          {!rolling && result && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">
                  {result.mode === "groups"
                    ? `${result.groups.length} kelompok`
                    : `${result.picked.length} siswa terpilih`}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void copy()}>
                    {busy === "copy" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Copy className="mr-1.5 h-4 w-4" />}
                    Salin
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void share()}>
                    {busy === "share" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Share2 className="mr-1.5 h-4 w-4" />}
                    Bagikan gambar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={!canRun} onClick={run}>
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    {result.mode === "pick" && autoRemove ? "Pilih lagi" : "Acak ulang"}
                  </Button>
                </div>
              </div>

              <div key={resultId}>
                {result.mode === "groups" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.groups.map((group, i) => (
                      <Card
                        key={i}
                        className="pop-in overflow-hidden rounded-lg shadow-none"
                        style={{ animationDelay: `${i * 70}ms` }}
                      >
                        <div className="flex items-center justify-between bg-primary px-4 py-2 text-primary-foreground">
                          <span className="font-semibold">Kelompok {i + 1}</span>
                          <span className="text-xs opacity-90">
                            {group.length} orang
                            {genderCounts(group).hasGender &&
                              ` · ${genderCounts(group).l} cowok · ${genderCounts(group).p} cewek`}
                          </span>
                        </div>
                        <CardContent className="p-0">
                          <ol className="divide-y divide-border">
                            {group.map((p, j) => (
                              <li key={p.id} className="flex gap-3 px-4 py-2 text-sm">
                                <span className="w-5 shrink-0 text-right font-mono text-xs leading-5 text-muted-foreground">
                                  {j + 1}
                                </span>
                                <span>{p.name}</span>
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <ol className="grid gap-3 sm:grid-cols-2">
                    {result.picked.map((p, i) => (
                      <li
                        key={p.id}
                        className="pop-in flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                        style={{ animationDelay: `${i * 90}ms` }}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium">{p.name}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function mixDescription(value: number, males: number, females: number) {
  if (males === 0 || females === 0) return "Peserta hanya satu gender, jadi pengaturan ini tidak berpengaruh.";
  if (value === 0) return "Acak biasa: gender tidak dipertimbangkan.";
  if (value < 50) return "Condong ke seimbang: tiap kelompok makin mendekati perbandingan cowok:cewek yang sama.";
  if (value === 50) {
    return `Seimbang: tiap kelompok punya perbandingan cowok:cewek yang sama (mendekati ${males}:${females}).`;
  }
  if (value < 100) return "Condong ke sejenis: makin banyak kelompok yang isinya satu gender.";
  return "Sejenis: tiap kelompok hanya berisi satu gender. Jumlah anggota antar kelompok bisa berbeda.";
}

function GenderMixControl({
  value,
  onChange,
  disabled,
  males,
  females,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
  males: number;
  females: number;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Campuran gender</p>
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-sm font-semibold">{value}%</span>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        aria-label="Campuran gender"
      />
      <div className="flex flex-wrap gap-2">
        {(
          [
            [0, "Acak"],
            [50, "Seimbang"],
            [100, "Sejenis"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className={
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
              (value === v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground")
            }
          >
            {v}% · {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {males} cowok · {females} cewek ikut. {mixDescription(value, males, females)}
      </p>
    </div>
  );
}
