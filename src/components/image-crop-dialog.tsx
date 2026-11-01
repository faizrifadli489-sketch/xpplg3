import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, FlipHorizontal2, Loader2, RotateCcw, RotateCcwSquare } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  ASPECT_LABELS,
  flipHorizontal,
  imageTransformCss,
  initCrop,
  panBy,
  ratioOf,
  renderCrop,
  resizeFrame,
  rotate90,
  setAspect,
  setStraighten,
  setZoomLevel,
  stageBounds,
  withFrame,
  zoomAt,
  zoomLevel,
  type AspectKey,
  type CropState,
  type Handle,
  type Rect,
  type Vec,
} from "@/lib/image-crop";

const DEFAULT_ASPECTS: AspectKey[] = ["free", "orig", "1:1", "4:3", "16:9"];

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const CURSOR: Record<Handle, string> = {
  nw: "cursor-nwse-resize",
  se: "cursor-nwse-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
};

function handlePos(h: Handle, f: Rect): { left: number; top: number } {
  const left = h.includes("w") ? f.x : h.includes("e") ? f.x + f.w : f.x + f.w / 2;
  const top = h.includes("n") ? f.y : h.includes("s") ? f.y + f.h : f.y + f.h / 2;
  return { left, top };
}

/** Bentuk visual pegangan: siku di sudut, batang pendek di tengah sisi. */
function HandleMark({ h }: { h: Handle }) {
  if (h.length === 1) {
    const horizontal = h === "n" || h === "s";
    return (
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
        style={horizontal ? { width: 28, height: 4 } : { width: 4, height: 28 }}
      />
    );
  }
  const west = h.includes("w");
  const north = h.includes("n");
  return (
    <span
      className="absolute"
      style={{
        width: 20,
        height: 20,
        [west ? "left" : "right"]: 20,
        [north ? "top" : "bottom"]: 20,
        borderColor: "#fff",
        borderStyle: "solid",
        borderWidth: 0,
        [west ? "borderLeftWidth" : "borderRightWidth"]: 4,
        [north ? "borderTopWidth" : "borderBottomWidth"]: 4,
      }}
    />
  );
}

type Props = {
  /** Gambar sumber; null = dialog tertutup. */
  file: Blob | null;
  title?: string;
  /** Pilihan rasio. Satu pilihan saja = rasio dikunci. */
  aspects?: AspectKey[];
  defaultAspect?: AspectKey;
  /** Sisi terpanjang hasil (px). */
  maxSize?: number;
  /** Tampilkan tombol "Pakai tanpa potong". */
  allowSkip?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
  onSkip?: (original: Blob) => Promise<void> | void;
};

export function ImageCropDialog({
  file,
  title = "Potong foto",
  aspects = DEFAULT_ASPECTS,
  defaultAspect,
  maxSize = 1280,
  allowSkip = false,
  onCancel,
  onConfirm,
  onSkip,
}: Props) {
  const [loaded, setLoaded] = useState<{ img: HTMLImageElement; url: string } | null>(null);
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null);
  const [edit, setEdit] = useState<CropState | null>(null);
  const [busy, setBusy] = useState<"apply" | "skip" | null>(null);

  const pointers = useRef(new Map<number, Vec>());
  const pinch = useRef<{ mid: Vec; dist: number } | null>(null);
  const drag = useRef<{ id: number; handle: Handle; start: Rect; from: Vec } | null>(null);

  const startAspect: AspectKey = defaultAspect && aspects.includes(defaultAspect) ? defaultAspect : aspects[0];
  const locked = aspects.length === 1;

  // Muat gambar dari file.
  useEffect(() => {
    setLoaded(null);
    setEdit(null);
    pointers.current.clear();
    pinch.current = null;
    drag.current = null;
    if (!file) return;
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setLoaded({ img, url });
    };
    img.onerror = () => {
      if (cancelled) return;
      toast.error("Gambar tidak bisa dibuka. Coba file lain.");
      onCancel();
    };
    img.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
    // onCancel sengaja tidak jadi dependensi: hanya muat ulang saat file berganti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Ukur panggung (offsetWidth tidak terpengaruh animasi zoom dialog).
  useLayoutEffect(() => {
    if (!stageEl) return;
    const measure = () => {
      const w = stageEl.offsetWidth;
      const h = stageEl.offsetHeight;
      if (w > 0 && h > 0) setStageSize((p) => (p && Math.abs(p.w - w) < 1 && Math.abs(p.h - h) < 1 ? p : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stageEl);
    return () => ro.disconnect();
  }, [stageEl]);

  useEffect(() => {
    if (loaded && stageSize) {
      setEdit(initCrop(loaded.img.naturalWidth, loaded.img.naturalHeight, stageSize, startAspect));
    }
    // startAspect hanya relevan saat pertama dibuka
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, stageSize]);

  const stageSizeRef = useRef(stageSize);
  stageSizeRef.current = stageSize;

  const toStage = (clientX: number, clientY: number): Vec => {
    const el = stageEl;
    const size = stageSizeRef.current;
    if (!el || !size) return [0, 0];
    const r = el.getBoundingClientRect();
    return [(clientX - r.left) * (size.w / r.width), (clientY - r.top) * (size.h / r.height)];
  };

  // Zoom dengan roda mouse (harus non-passive agar halaman tidak ikut scroll).
  useEffect(() => {
    if (!stageEl) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toStage(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0015);
      setEdit((s) => (s ? zoomAt(s, factor, p) : s));
    };
    stageEl.addEventListener("wheel", onWheel, { passive: false });
    return () => stageEl.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageEl]);

  // ----- gestur: geser/cubit di panggung, seret pegangan bingkai -----

  const baseline = () => {
    const pts = [...pointers.current.values()];
    if (pts.length === 1) pinch.current = { mid: pts[0], dist: 0 };
    else if (pts.length >= 2) {
      const [a, b] = pts;
      pinch.current = { mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dist: Math.hypot(a[0] - b[0], a[1] - b[1]) };
    } else pinch.current = null;
  };

  const onStageDown = (e: ReactPointerEvent) => {
    if (drag.current) return;
    stageEl?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toStage(e.clientX, e.clientY));
    baseline();
  };

  const onHandleDown = (e: ReactPointerEvent, handle: Handle) => {
    if (!edit) return;
    e.stopPropagation();
    e.preventDefault();
    stageEl?.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, handle, start: edit.frame, from: toStage(e.clientX, e.clientY) };
  };

  const onStageMove = (e: ReactPointerEvent) => {
    const p = toStage(e.clientX, e.clientY);

    const d = drag.current;
    if (d && d.id === e.pointerId) {
      setEdit((s) => {
        if (!s) return s;
        const ratio = ratioOf(s.aspect, s);
        const next = resizeFrame(d.start, d.handle, p[0] - d.from[0], p[1] - d.from[1], ratio, stageBounds(s.stage));
        return withFrame(s, next);
      });
      return;
    }

    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, p);
    const pts = [...pointers.current.values()];
    const prev = pinch.current;
    if (!prev) return;

    if (pts.length === 1) {
      const dx = p[0] - prev.mid[0];
      const dy = p[1] - prev.mid[1];
      pinch.current = { mid: p, dist: 0 };
      setEdit((s) => (s ? panBy(s, dx, dy) : s));
    } else {
      const [a, b] = pts;
      const mid: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const factor = prev.dist > 0 ? dist / prev.dist : 1;
      pinch.current = { mid, dist };
      setEdit((s) => (s ? panBy(zoomAt(s, factor, mid), mid[0] - prev.mid[0], mid[1] - prev.mid[1]) : s));
    }
  };

  const onStageUp = (e: ReactPointerEvent) => {
    if (drag.current?.id === e.pointerId) drag.current = null;
    pointers.current.delete(e.pointerId);
    baseline();
  };

  // ----- aksi -----
  const apply = async () => {
    if (!loaded || !edit || busy) return;
    setBusy("apply");
    try {
      const blob = await renderCrop(loaded.img, edit, maxSize);
      await onConfirm(blob);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memproses gambar.");
    } finally {
      setBusy(null);
    }
  };

  const skip = async () => {
    if (!file || busy || !onSkip) return;
    setBusy("skip");
    try {
      await onSkip(file);
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    if (loaded && stageSize && edit) {
      setEdit(initCrop(loaded.img.naturalWidth, loaded.img.naturalHeight, stageSize, edit.aspect));
    }
  };

  const f = edit?.frame;
  const imgStyle = useMemo(
    () =>
      edit
        ? {
            position: "absolute" as const,
            left: 0,
            top: 0,
            width: edit.W,
            height: edit.H,
            maxWidth: "none",
            transformOrigin: "0 0",
            transform: imageTransformCss(edit),
            willChange: "transform" as const,
          }
        : undefined,
    [edit],
  );

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 text-white transition-colors hover:bg-neutral-700 disabled:opacity-40";
  const disabled = busy !== null;

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-xl gap-0 overflow-hidden border-neutral-800 bg-neutral-950 p-0 text-white sm:rounded-xl"
      >
        <DialogHeader className="px-4 pb-3 pt-4 pr-12">
          <DialogTitle className="text-base text-white">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3">
          {locked ? (
            <span className="text-xs text-neutral-400">Rasio dikunci {ASPECT_LABELS[aspects[0]]}</span>
          ) : (
            aspects.map((a) => (
              <button
                key={a}
                type="button"
                disabled={disabled || !edit}
                onClick={() => setEdit((s) => (s ? setAspect(s, a) : s))}
                className={
                  "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors " +
                  (edit?.aspect === a
                    ? "bg-sky-200 text-neutral-900"
                    : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700")
                }
              >
                {ASPECT_LABELS[a]}
              </button>
            ))
          )}
        </div>

        <div
          ref={setStageEl}
          className="relative h-[min(50vh,400px)] w-full touch-none select-none overflow-hidden bg-black"
          onPointerDown={onStageDown}
          onPointerMove={onStageMove}
          onPointerUp={onStageUp}
          onPointerCancel={onStageUp}
        >
          {loaded && edit && f ? (
            <>
              <img
                src={loaded.url}
                alt=""
                draggable={false}
                className="pointer-events-none"
                style={imgStyle}
              />
              <div
                className="pointer-events-none absolute border-2 border-white"
                style={{ left: f.x, top: f.y, width: f.w, height: f.h, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)" }}
              >
                {[1, 2].map((i) => (
                  <span key={`v${i}`} className="absolute inset-y-0 w-px bg-white/30" style={{ left: `${(i * 100) / 3}%` }} />
                ))}
                {[1, 2].map((i) => (
                  <span key={`h${i}`} className="absolute inset-x-0 h-px bg-white/30" style={{ top: `${(i * 100) / 3}%` }} />
                ))}
              </div>
              {HANDLES.filter((h) => ratioOf(edit.aspect, edit) === null || h.length === 2).map((h) => {
                const pos = handlePos(h, f);
                return (
                  <div
                    key={h}
                    role="presentation"
                    className={`absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 ${CURSOR[h]}`}
                    style={{ left: pos.left, top: pos.top }}
                    onPointerDown={(e) => onHandleDown(e, h)}
                  >
                    <HandleMark h={h} />
                  </div>
                );
              })}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          )}
        </div>

        <div className="space-y-3 px-4 pt-4">
          <div className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-neutral-400">Zoom</span>
            <Slider
              value={[edit ? zoomLevel(edit) : 0]}
              min={0}
              max={100}
              step={0.5}
              disabled={!edit || disabled}
              onValueChange={([v]) => setEdit((s) => (s ? setZoomLevel(s, v) : s))}
              aria-label="Zoom"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!edit || disabled}
              onClick={() => setEdit((s) => (s ? setStraighten(s, 0) : s))}
              className="w-16 shrink-0 text-left text-xs text-neutral-400 hover:text-white"
              title="Klik untuk mengembalikan ke 0°"
            >
              Luruskan {edit ? `${Math.round(edit.s * 10) / 10}°` : ""}
            </button>
            <Slider
              value={[edit ? edit.s : 0]}
              min={-45}
              max={45}
              step={0.5}
              disabled={!edit || disabled}
              onValueChange={([v]) => setEdit((s) => (s ? setStraighten(s, v) : s))}
              aria-label="Luruskan"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-4">
          <div className="flex items-center gap-2">
            <button type="button" className={iconBtn} disabled={!edit || disabled} onClick={() => setEdit((s) => (s ? rotate90(s) : s))} aria-label="Putar 90°" title="Putar 90°">
              <RotateCcwSquare className="h-5 w-5" />
            </button>
            <button type="button" className={iconBtn} disabled={!edit || disabled} onClick={() => setEdit((s) => (s ? flipHorizontal(s) : s))} aria-label="Cermin" title="Cermin">
              <FlipHorizontal2 className="h-5 w-5" />
            </button>
            <button type="button" className={iconBtn} disabled={!edit || disabled} onClick={reset} aria-label="Atur ulang" title="Atur ulang">
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={onCancel}
              className="rounded-full bg-neutral-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
            >
              Batal
            </button>
            {allowSkip && onSkip && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => void skip()}
                className="flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
              >
                {busy === "skip" && <Loader2 className="h-4 w-4 animate-spin" />}
                Tanpa potong
              </button>
            )}
            <button
              type="button"
              disabled={!edit || disabled}
              onClick={() => void apply()}
              className="flex items-center gap-2 rounded-full bg-sky-200 px-5 py-2.5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-sky-300 disabled:opacity-60"
            >
              {busy === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {busy === "apply" ? "Memproses..." : "Terapkan"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
