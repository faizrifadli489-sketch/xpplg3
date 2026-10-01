import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Download, Loader2, RotateCcw, Share, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Reveal } from "@/components/reveal";
import { useTheme } from "@/hooks/use-theme";
import { setCountdownMode, useCountdownMode, type CountdownMode } from "@/lib/countdown-mode";
import { installPwa, usePwaInstall } from "@/lib/pwa-install";
import {
  FONT_SCALES,
  resetPrefs,
  setPref,
  usePrefs,
  type FontScale,
  type ScheduleStart,
  type UiStyle,
} from "@/lib/preferences";
import { clearAllOfflineCaches, getOfflineStats } from "@/lib/register-sw";
import { DAY_LABELS } from "@/lib/time";

export const Route = createFileRoute("/pengaturan")({
  head: () => ({
    meta: [
      { title: "Pengaturan — X PPLG 3" },
      { name: "description", content: "Atur tampilan, countdown, data offline, dan asisten AI di web kelas X PPLG 3." },
      { property: "og:title", content: "Pengaturan — X PPLG 3" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PengaturanPage,
});

const FONT_LABELS: Record<FontScale, string> = { 90: "Kecil", 100: "Normal", 112: "Besar", 125: "Sangat besar" };
const START_OPTIONS: { value: ScheduleStart; label: string }[] = [
  { value: "today", label: "Hari ini (otomatis)" },
  { value: "1", label: DAY_LABELS[1] },
  { value: "2", label: DAY_LABELS[2] },
  { value: "3", label: DAY_LABELS[3] },
  { value: "4", label: DAY_LABELS[4] },
  { value: "5", label: DAY_LABELS[5] },
];


const STYLE_OPTIONS: { value: UiStyle; label: string; desc: string }[] = [
  { value: "default", label: "Bawaan", desc: "Bersih dan sederhana." },
  { value: "brutal", label: "Neo-brutalism", desc: "Border tebal, bayangan keras, warna mencolok." },
  { value: "glass", label: "Glassmorphism", desc: "Kaca buram transparan dengan latar gradasi." },
];

/** Miniatur gaya; warna ditulis langsung supaya tidak ikut berubah saat gaya aktif berganti. */
function StylePreview({ kind }: { kind: UiStyle }) {
  const wrap: Record<UiStyle, CSSProperties> = {
    default: { background: "#f5f6fa" },
    brutal: { background: "#fff4cc", backgroundImage: "radial-gradient(rgba(17,17,17,.2) 1px, transparent 1px)", backgroundSize: "10px 10px" },
    glass: {
      background:
        "radial-gradient(60% 80% at 10% 0%, #7ee0d0, transparent 65%), radial-gradient(60% 80% at 100% 20%, #ffb59e, transparent 60%), radial-gradient(60% 80% at 50% 110%, #a9b8ff, transparent 60%), #e6f0f3",
    },
  };
  const card: Record<UiStyle, CSSProperties> = {
    default: { background: "#fff", border: "1px solid #dee1e8", borderRadius: 8 },
    brutal: { background: "#fff", border: "2px solid #111", borderRadius: 0, boxShadow: "3px 3px 0 #111" },
    glass: {
      background: "rgba(255,255,255,.5)",
      border: "1px solid rgba(255,255,255,.8)",
      borderRadius: 14,
      boxShadow: "0 6px 18px rgba(31,60,135,.15)",
      backdropFilter: "blur(6px)",
    },
  };
  const bar: Record<UiStyle, CSSProperties> = {
    default: { background: "#12786b", borderRadius: 4 },
    brutal: { background: "#12786b", border: "2px solid #111", borderRadius: 0 },
    glass: { background: "rgba(18,120,107,.85)", borderRadius: 8 },
  };
  return (
    <div aria-hidden="true" className="flex h-20 items-center justify-center overflow-hidden rounded-md" style={wrap[kind]}>
      <div className="w-24 space-y-1.5 p-2" style={card[kind]}>
        <div className="h-1.5 w-12" style={{ background: "#9aa3b2", borderRadius: kind === "brutal" ? 0 : 3 }} />
        <div className="h-3.5 w-full" style={bar[kind]} />
      </div>
    </div>
  );
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return "tidak diketahui";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={
            "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " +
            (value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-foreground/70 hover:bg-accent hover:text-accent-foreground")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-mono text-sm text-muted-foreground">// {title}</h2>
      <Card className="rounded-lg shadow-none">
        <CardContent className="space-y-6 p-5">{children}</CardContent>
      </Card>
    </section>
  );
}

function PengaturanPage() {
  const { theme, setTheme } = useTheme();
  const prefs = usePrefs();
  const [countdownMode] = useCountdownMode();
  const pwa = usePwaInstall();

  const [online, setOnline] = useState(true);
  const [stats, setStats] = useState<{ files: number; bytes: number | null; swActive: boolean } | null>(null);
  const [clearing, setClearing] = useState(false);

  const refreshStats = useCallback(async () => setStats(await getOfflineStats()), []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    void refreshStats();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [refreshStats]);

  const clearOffline = async () => {
    if (!confirm("Hapus semua data offline di perangkat ini? Halaman akan diunduh ulang saat kamu membukanya lagi.")) return;
    setClearing(true);
    try {
      await clearAllOfflineCaches();
      await refreshStats();
      toast.success("Data offline dihapus.");
    } catch {
      toast.error("Gagal menghapus data offline.");
    } finally {
      setClearing(false);
    }
  };

  const resetAll = () => {
    if (!confirm("Kembalikan semua pengaturan ke bawaan?")) return;
    resetPrefs();
    setCountdownMode("day");
    setTheme("light");
    toast.success("Pengaturan dikembalikan ke bawaan.");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="mb-10">
        <p className="mb-3 font-mono text-sm text-muted-foreground">// preferensi kamu</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Pengaturan</h1>
        <p className="mt-4 text-muted-foreground">
          Berlaku untuk perangkat ini saja dan tersimpan otomatis. Tidak memengaruhi pengunjung lain.
        </p>
      </Reveal>

      <div className="space-y-8">
        <Section title="tampilan">
          <Row title="Gaya tampilan" hint="Mengubah rupa seluruh web: kartu, tombol, kolom isian, dan latar.">
            <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Gaya tampilan">
              {STYLE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={prefs.uiStyle === o.value}
                  onClick={() => setPref("uiStyle", o.value)}
                  className={
                    "space-y-2 rounded-lg border p-2 text-left transition-colors " +
                    (prefs.uiStyle === o.value ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/60")
                  }
                >
                  <StylePreview kind={o.value} />
                  <div className="px-1 pb-1">
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="text-xs text-muted-foreground">{o.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {prefs.uiStyle === "glass" && (
              <p className="text-xs text-muted-foreground">Efek kaca bisa terasa berat di HP lama. Kalau lag, pilih gaya lain.</p>
            )}
          </Row>
          <Row title="Tema">
            <Segmented
              label="Tema"
              value={theme}
              onChange={setTheme}
              options={[
                { value: "light", label: "Terang" },
                { value: "dark", label: "Gelap" },
                { value: "system", label: "Ikuti sistem" },
              ]}
            />
          </Row>
          <Row title="Ukuran teks" hint="Memperbesar atau memperkecil seluruh teks dan elemen di web ini.">
            <Segmented
              label="Ukuran teks"
              value={prefs.fontScale}
              onChange={(v) => setPref("fontScale", v)}
              options={FONT_SCALES.map((v) => ({ value: v, label: FONT_LABELS[v] }))}
            />
          </Row>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Kurangi animasi</p>
              <p className="text-xs text-muted-foreground">
                Mati = ikuti pengaturan HP kamu. Efek ketik di beranda berhenti setelah halaman dimuat ulang.
              </p>
            </div>
            <Switch
              checked={prefs.reduceMotion}
              onCheckedChange={(v) => setPref("reduceMotion", v)}
              aria-label="Kurangi animasi"
            />
          </div>
        </Section>

        <Section title="countdown & jadwal">
          <Row title="Tampilan countdown acara">
            <Segmented<CountdownMode>
              label="Tampilan countdown"
              value={countdownMode}
              onChange={setCountdownMode}
              options={[
                { value: "day", label: "Per hari" },
                { value: "ms", label: "Live (ms)" },
              ]}
            />
            <p className="font-mono text-xs text-muted-foreground">
              Contoh: {countdownMode === "day" ? "3 hari lagi" : "03:05:12:41:087  (hari:jam:menit:detik:ms)"}
            </p>
          </Row>
          <Row title="Hari yang dibuka pertama di halaman Jadwal">
            <Segmented<ScheduleStart>
              label="Hari awal jadwal"
              value={prefs.scheduleStart}
              onChange={(v) => setPref("scheduleStart", v)}
              options={START_OPTIONS}
            />
          </Row>
        </Section>

        <Section title="data & offline">
          <div className="flex items-start gap-3">
            {online ? (
              <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            ) : (
              <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            )}
            <div className="text-sm">
              <p className="font-medium">{online ? "Online" : "Sedang offline"}</p>
              <p className="text-xs text-muted-foreground">
                {stats === null
                  ? "Memeriksa..."
                  : stats.swActive
                    ? "Mode offline aktif: halaman yang pernah dibuka bisa dibuka tanpa internet."
                    : "Mode offline belum aktif. Muat ulang halaman sekali, lalu cek lagi."}
              </p>
            </div>
          </div>

          <Row
            title="Data offline tersimpan"
            hint={stats ? `${stats.files} file tersimpan · situs ini memakai sekitar ${formatBytes(stats.bytes)}` : "Memeriksa..."}
          >
            <Button type="button" variant="outline" size="sm" disabled={clearing || stats?.files === 0} onClick={() => void clearOffline()}>
              {clearing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
              {clearing ? "Menghapus..." : "Hapus data offline"}
            </Button>
          </Row>

          <Row title="Pasang sebagai aplikasi">
            {pwa.installed ? (
              <p className="text-sm text-muted-foreground">Sudah terpasang di perangkat ini.</p>
            ) : pwa.canPrompt ? (
              <Button type="button" size="sm" onClick={() => void installPwa()}>
                <Download className="mr-1.5 h-4 w-4" />
                Pasang aplikasi
              </Button>
            ) : pwa.iosSafari ? (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Share className="mt-0.5 h-4 w-4 shrink-0" />
                Ketuk Bagikan, lalu Tambah ke Layar Utama.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Buka menu browser (titik tiga), lalu pilih Instal aplikasi atau Tambahkan ke layar utama.
              </p>
            )}
          </Row>
        </Section>

        <Section title="asisten ai">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Tampilkan tombol asisten AI</p>
              <p className="text-xs text-muted-foreground">
                Tombol chat di pojok kanan bawah. Hanya muncul kalau kamu login dan admin menyalakan AI.
              </p>
            </div>
            <Switch
              checked={!prefs.aiHidden}
              onCheckedChange={(v) => setPref("aiHidden", !v)}
              aria-label="Tampilkan tombol asisten AI"
            />
          </div>
        </Section>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={resetAll}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Kembalikan ke bawaan
          </Button>
        </div>
      </div>
    </div>
  );
}
