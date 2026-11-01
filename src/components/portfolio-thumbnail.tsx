import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Crop, ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import { uploadImageBlob } from "@/components/image-upload";
import type { AspectKey } from "@/lib/image-crop";
import { screenshotApiUrl } from "@/lib/screenshot";
import { captureScreenshot } from "@/lib/screenshot.functions";

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const THUMB_ASPECTS: AspectKey[] = ["16:9", "4:3", "1:1", "free"];

type Phase = "idle" | "capturing" | "uploading";

const CAPTURE_STEPS = ["Membuka website...", "Menunggu halaman termuat...", "Mengambil screenshot..."];

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function base64ToBlob(base64: string, type: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

type Props = {
  value: string;
  onChange: (url: string) => void;
  /** Link proyek; dipakai sebagai sumber screenshot. */
  projectUrl: string;
  folder?: string;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
};

export function PortfolioThumbnail({
  value,
  onChange,
  projectUrl,
  folder = "portfolio",
  label = "Thumbnail",
  onBusyChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const captureFn = useServerFn(captureScreenshot);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [justDone, setJustDone] = useState(false);
  // Gambar yang sedang dibuka di editor potong (dari screenshot, file, atau thumbnail lama).
  const [cropSource, setCropSource] = useState<{ blob: Blob; fromShot: boolean } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const busy = phase !== "idle";
  const canCapture = isValidHttpUrl(projectUrl.trim());

  const setBusy = (next: Phase) => {
    setPhase(next);
    onBusyChange?.(next !== "idle");
  };

  // Progress palsu yang melambat mendekati 90% selama screenshot berjalan.
  useEffect(() => {
    if (phase !== "capturing") return;
    const timer = setInterval(() => {
      setProgress((p) => p + (90 - p) * 0.06);
      setStepIndex((i) => Math.min(i + 1, CAPTURE_STEPS.length - 1));
    }, 1400);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (!justDone) return;
    const t = setTimeout(() => setJustDone(false), 1800);
    return () => clearTimeout(t);
  }, [justDone]);

  const finish = (url: string) => {
    setProgress(100);
    onChange(url);
    setJustDone(true);
  };

  const handleScreenshot = async () => {
    const url = projectUrl.trim();
    if (!isValidHttpUrl(url)) {
      toast.error("Isi dulu link proyek yang valid (https://...).");
      return;
    }

    setProgress(6);
    setStepIndex(0);
    setBusy("capturing");
    try {
      let shot: Blob;
      try {
        const res = await fetch(screenshotApiUrl(url));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        shot = await res.blob();
      } catch {
        // Kemungkinan diblokir CORS -> minta server yang mengambil.
        const r = await captureFn({ data: { url } });
        shot = base64ToBlob(r.base64, r.contentType);
      }
      if (!shot.type.startsWith("image/")) throw new Error("Hasil screenshot bukan gambar.");

      setProgress(0);
      setCropSource({ blob: shot, fromShot: true });
    } catch (err) {
      setProgress(0);
      toast.error(err instanceof Error ? err.message : "Gagal mengambil screenshot.");
    } finally {
      setBusy("idle");
    }
  };

  const handleFile = (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("Ukuran file maksimal 15 MB.");
      return;
    }
    setCropSource({ blob: file, fromShot: false });
  };

  // Unggah hasil editor; error dilempar balik supaya dialog tetap terbuka dan bisa dicoba lagi.
  const upload = async (blob: Blob, processed: boolean, message: string) => {
    setProgress(55);
    setBusy("uploading");
    try {
      finish(await uploadImageBlob(blob, folder, processed));
      toast.success(message);
      setCropSource(null);
    } catch (err) {
      setProgress(0);
      throw err;
    } finally {
      setBusy("idle");
    }
  };

  const editExisting = async () => {
    if (!value) return;
    setLoadingExisting(true);
    try {
      const res = await fetch(value);
      if (!res.ok) throw new Error("fetch gagal");
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("bukan gambar");
      setCropSource({ blob, fromShot: false });
    } catch {
      toast.error("Thumbnail ini tidak bisa dibuka untuk diedit. Buat ulang atau upload baru.");
    } finally {
      setLoadingExisting(false);
    }
  };

  const statusText = phase === "capturing" ? CAPTURE_STEPS[stepIndex] : "Mengunggah thumbnail...";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
        {value ? (
          <img
            src={value}
            alt="Pratinjau thumbnail"
            className={
              "h-full w-full object-cover transition duration-500 " + (busy ? "scale-105 blur-sm opacity-60" : "")
            }
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Belum ada thumbnail</span>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 px-6 backdrop-blur-[2px]">
            <div className="thumb-shimmer absolute inset-0" />
            <div className="thumb-scan absolute inset-x-0 h-0.5 bg-primary shadow-[0_0_12px_2px] shadow-primary/60" />
            <Loader2 className="relative h-7 w-7 animate-spin text-primary" />
            <p className="relative text-sm font-medium" aria-live="polite">
              {statusText}
            </p>
            <Progress value={progress} className="relative h-1.5 w-full max-w-[14rem]" />
          </div>
        )}

        {justDone && !busy && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground shadow">
            <CheckCircle2 className="h-3.5 w-3.5" /> Siap
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy || !canCapture} onClick={() => void handleScreenshot()}>
          <Camera className="mr-1 h-4 w-4" />
          {value ? "Screenshot ulang" : "Screenshot dari link"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" />
          Upload manual
        </Button>
        {value && !busy && (
          <Button type="button" variant="outline" size="sm" disabled={loadingExisting} onClick={() => void editExisting()}>
            {loadingExisting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Crop className="mr-1 h-4 w-4" />}
            Potong
          </Button>
        )}
        {value && !busy && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <Trash2 className="mr-1 h-4 w-4 text-destructive" />
            Hapus
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-xs text-muted-foreground">
        {canCapture
          ? "Screenshot otomatis dari link proyek, atau upload gambar sendiri. Hasilnya bisa dipotong dulu."
          : "Isi link proyek di atas untuk pakai screenshot otomatis, atau upload gambar sendiri."}
      </p>

      <ImageCropDialog
        file={cropSource?.blob ?? null}
        title="Potong thumbnail"
        aspects={THUMB_ASPECTS}
        defaultAspect="16:9"
        maxSize={1280}
        allowSkip={cropSource?.fromShot === true}
        onCancel={() => setCropSource(null)}
        onConfirm={(blob) => upload(blob, true, cropSource?.fromShot ? "Thumbnail berhasil dibuat dari website." : "Thumbnail berhasil diunggah.")}
        onSkip={(original) => upload(original, false, "Thumbnail berhasil dibuat dari website.")}
      />
    </div>
  );
}
