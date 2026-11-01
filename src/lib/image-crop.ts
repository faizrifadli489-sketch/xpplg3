// Logika murni editor potong/resize gambar (tanpa DOM, mudah diuji).
//
// Model: bingkai potong (frame) berada di "panggung" (stage); gambar diletakkan di bawahnya dengan
//   titik_stage = pusat + L · (titik_gambar - tengah_gambar),   L = k · R(luruskan) · B
// B = orientasi diskret (putar 90° + cermin), R = rotasi halus, k = skala (px panggung per px gambar).
// Gambar selalu dijaga menutupi seluruh bingkai (tidak ada area kosong).

export type AspectKey = "free" | "orig" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export type Vec = [number, number];
/** Matriks 2x2 baris-utama: x' = a·x + b·y ; y' = c·x + d·y */
export type Mat = [number, number, number, number];
export type Rect = { x: number; y: number; w: number; h: number };

export type CropState = {
  W: number;
  H: number;
  stage: { w: number; h: number };
  B: Mat;
  s: number;
  k: number;
  cx: number;
  cy: number;
  kMax: number;
  frame: Rect;
  aspect: AspectKey;
};

export const ASPECT_LABELS: Record<AspectKey, string> = {
  free: "Bebas",
  orig: "Asli",
  "1:1": "1:1",
  "4:3": "4:3",
  "3:4": "3:4",
  "16:9": "16:9",
  "9:16": "9:16",
};

export const STAGE_MARGIN = 14;
export const MIN_FRAME = 56;
const MAX_ZOOM = 8;

const IDENT: Mat = [1, 0, 0, 1];
const FLIP_X: Mat = [-1, 0, 0, 1];
const ROT_CCW_90: Mat = [0, 1, -1, 0];

const mul = (p: Mat, q: Mat): Mat => [
  p[0] * q[0] + p[1] * q[2],
  p[0] * q[1] + p[1] * q[3],
  p[2] * q[0] + p[3] * q[2],
  p[2] * q[1] + p[3] * q[3],
];
const apply = (m: Mat, v: Vec): Vec => [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
const transpose = (m: Mat): Mat => [m[0], m[2], m[1], m[3]];
export const rot = (deg: number): Mat => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, -s, s, c];
};
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

const frameCenter = (f: Rect): Vec => [f.x + f.w / 2, f.y + f.h / 2];
const frameCorners = (f: Rect): Vec[] => [
  [f.x, f.y],
  [f.x + f.w, f.y],
  [f.x, f.y + f.h],
  [f.x + f.w, f.y + f.h],
];

export function stageBounds(stage: { w: number; h: number }): Rect {
  return { x: STAGE_MARGIN, y: STAGE_MARGIN, w: stage.w - 2 * STAGE_MARGIN, h: stage.h - 2 * STAGE_MARGIN };
}

/** Ukuran gambar setelah orientasi (putar 90° menukar lebar-tinggi). */
export function orientedSize(st: Pick<CropState, "W" | "H" | "B">): { w: number; h: number } {
  const odd = Math.abs(st.B[0]) < 0.5;
  return odd ? { w: st.H, h: st.W } : { w: st.W, h: st.H };
}

/** Rasio lebar/tinggi yang dikunci untuk pilihan aspek; null = bebas. */
export function ratioOf(aspect: AspectKey, st: Pick<CropState, "W" | "H" | "B">): number | null {
  switch (aspect) {
    case "free":
      return null;
    case "orig": {
      const o = orientedSize(st);
      return o.w / o.h;
    }
    case "1:1":
      return 1;
    case "4:3":
      return 4 / 3;
    case "3:4":
      return 3 / 4;
    case "16:9":
      return 16 / 9;
    case "9:16":
      return 9 / 16;
  }
}

/** Bingkai terbesar dengan rasio tertentu (atau rasio gambar kalau null) di tengah panggung. */
function fitFrame(ratio: number | null, st: Pick<CropState, "W" | "H" | "B" | "stage">): Rect {
  const b = stageBounds(st.stage);
  const o = orientedSize(st);
  const r = ratio ?? o.w / o.h;
  let w = b.w;
  let h = w / r;
  if (h > b.h) {
    h = b.h;
    w = h * r;
  }
  return { x: b.x + (b.w - w) / 2, y: b.y + (b.h - h) / 2, w, h };
}

/** Skala minimum agar gambar menutupi seluruh bingkai pada orientasi/putaran saat ini. */
export function minScale(st: CropState): number {
  const Mt = transpose(mul(rot(st.s), st.B));
  const d = frameCorners(st.frame).map((p) => apply(Mt, p));
  const xs = d.map((v) => v[0]);
  const ys = d.map((v) => v[1]);
  return Math.max((Math.max(...xs) - Math.min(...xs)) / st.W, (Math.max(...ys) - Math.min(...ys)) / st.H);
}

/** Pastikan skala & posisi gambar valid: menutupi bingkai penuh dan tidak melewati batas zoom. */
export function enforce(st: CropState): CropState {
  const M = mul(rot(st.s), st.B);
  const Mt = transpose(M);
  const d = frameCorners(st.frame).map((p) => apply(Mt, p));
  const xs = d.map((v) => v[0]);
  const ys = d.map((v) => v[1]);
  const minDx = Math.min(...xs);
  const maxDx = Math.max(...xs);
  const minDy = Math.min(...ys);
  const maxDy = Math.max(...ys);
  const minK = Math.max((maxDx - minDx) / st.W, (maxDy - minDy) / st.H);

  const fc = frameCenter(st.frame);
  let { k, cx, cy } = st;
  const kTop = Math.max(st.kMax, minK);
  const target = clamp(k, minK, kTop);
  if (target !== k) {
    const f = target / k;
    cx = fc[0] + (cx - fc[0]) * f;
    cy = fc[1] + (cy - fc[1]) * f;
    k = target;
  }

  let [mx, my] = apply(Mt, [cx, cy]);
  mx = clamp(mx, maxDx - (k * st.W) / 2, minDx + (k * st.W) / 2);
  my = clamp(my, maxDy - (k * st.H) / 2, minDy + (k * st.H) / 2);
  [cx, cy] = apply(M, [mx, my]);

  return { ...st, k, cx, cy };
}

export function initCrop(
  W: number,
  H: number,
  stage: { w: number; h: number },
  aspect: AspectKey,
): CropState {
  const base = { W, H, stage, B: IDENT, s: 0 } as const;
  const frame = fitFrame(ratioOf(aspect, base), base);
  const first = enforce({
    ...base,
    k: 1e-6,
    cx: stage.w / 2,
    cy: stage.h / 2,
    kMax: Infinity,
    frame,
    aspect,
  });
  return { ...first, kMax: first.k * MAX_ZOOM };
}

export function setAspect(st: CropState, aspect: AspectKey): CropState {
  const ratio = ratioOf(aspect, st);
  if (ratio === null) return { ...st, aspect };
  return enforce({ ...st, aspect, frame: fitFrame(ratio, st) });
}

export function panBy(st: CropState, dx: number, dy: number): CropState {
  return enforce({ ...st, cx: st.cx + dx, cy: st.cy + dy });
}

/** Zoom dengan titik fokus (koordinat panggung) yang tetap diam. */
export function zoomAt(st: CropState, factor: number, focus: Vec): CropState {
  const minK = minScale(st);
  const kNew = clamp(st.k * factor, minK, Math.max(st.kMax, minK));
  const ratio = kNew / st.k;
  return enforce({
    ...st,
    k: kNew,
    cx: focus[0] + (st.cx - focus[0]) * ratio,
    cy: focus[1] + (st.cy - focus[1]) * ratio,
  });
}

/** Tingkat zoom 0..100 (0 = pas menutupi bingkai). */
export function zoomLevel(st: CropState): number {
  const minK = minScale(st);
  const top = Math.max(st.kMax, minK);
  if (top <= minK * 1.0001) return 0;
  return clamp((Math.log(st.k / minK) / Math.log(top / minK)) * 100, 0, 100);
}

export function setZoomLevel(st: CropState, level: number): CropState {
  const minK = minScale(st);
  const top = Math.max(st.kMax, minK);
  const kNew = minK * Math.pow(top / minK, clamp(level, 0, 100) / 100);
  return zoomAt(st, kNew / st.k, frameCenter(st.frame));
}

export function rotate90(st: CropState): CropState {
  const fc = frameCenter(st.frame);
  const v = apply(ROT_CCW_90, [st.cx - fc[0], st.cy - fc[1]]);
  const next: CropState = { ...st, B: mul(ROT_CCW_90, st.B), cx: fc[0] + v[0], cy: fc[1] + v[1] };
  if (next.aspect === "orig") next.frame = fitFrame(ratioOf("orig", next), next);
  return enforce(next);
}

/** Cermin horizontal terhadap tampilan saat ini. */
export function flipHorizontal(st: CropState): CropState {
  const fc = frameCenter(st.frame);
  return enforce({ ...st, B: mul(FLIP_X, st.B), s: -st.s, cx: 2 * fc[0] - st.cx });
}

/** Luruskan: putar halus gambar (derajat) terhadap pusat bingkai. */
export function setStraighten(st: CropState, deg: number): CropState {
  const fc = frameCenter(st.frame);
  const v = apply(rot(deg - st.s), [st.cx - fc[0], st.cy - fc[1]]);
  return enforce({ ...st, s: deg, cx: fc[0] + v[0], cy: fc[1] + v[1] });
}

export function withFrame(st: CropState, frame: Rect): CropState {
  return enforce({ ...st, frame });
}

/** Hitung bingkai baru saat salah satu pegangan diseret (dx, dy relatif terhadap posisi awal). */
export function resizeFrame(
  start: Rect,
  handle: Handle,
  dx: number,
  dy: number,
  ratio: number | null,
  bounds: Rect,
): Rect {
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const west = handle.includes("w");
  const east = handle.includes("e");
  const north = handle.includes("n");
  const south = handle.includes("s");

  if (ratio === null) {
    let nx = start.x;
    let ny = start.y;
    let nr = right;
    let nb = bottom;
    if (west) nx = clamp(start.x + dx, bounds.x, right - MIN_FRAME);
    if (east) nr = clamp(right + dx, start.x + MIN_FRAME, bounds.x + bounds.w);
    if (north) ny = clamp(start.y + dy, bounds.y, bottom - MIN_FRAME);
    if (south) nb = clamp(bottom + dy, start.y + MIN_FRAME, bounds.y + bounds.h);
    return { x: nx, y: ny, w: nr - nx, h: nb - ny };
  }

  // Rasio terkunci: hanya pegangan sudut yang berfungsi; sudut seberangnya menjadi jangkar.
  if (handle.length !== 2) return start;
  const ax = west ? right : start.x;
  const ay = north ? bottom : start.y;
  const sx = west ? -1 : 1;
  const sy = north ? -1 : 1;
  const wFromX = start.w + sx * dx;
  const wFromY = (start.h + sy * dy) * ratio;
  const maxW = Math.min(
    west ? ax - bounds.x : bounds.x + bounds.w - ax,
    (north ? ay - bounds.y : bounds.y + bounds.h - ay) * ratio,
  );
  const minW = Math.max(MIN_FRAME, MIN_FRAME * ratio);
  // Batas atas (muat di panggung) diutamakan; pada gambar sangat panjang/sempit bingkai bisa < MIN_FRAME.
  const nw = Math.min(Math.max((wFromX + wFromY) / 2, minW), maxW);
  const nh = nw / ratio;
  return { x: west ? ax - nw : ax, y: north ? ay - nh : ay, w: nw, h: nh };
}

// ---------- Tampilan & hasil ----------

export function linearOf(st: CropState): Mat {
  const M = mul(rot(st.s), st.B);
  return [M[0] * st.k, M[1] * st.k, M[2] * st.k, M[3] * st.k];
}

/** Nilai CSS transform untuk elemen <img> berukuran asli (W×H, transform-origin 0 0). */
export function imageTransformCss(st: CropState): string {
  const L = linearOf(st);
  const e = st.cx - (L[0] * st.W) / 2 - (L[1] * st.H) / 2;
  const f = st.cy - (L[2] * st.W) / 2 - (L[3] * st.H) / 2;
  return `matrix(${L[0]}, ${L[2]}, ${L[1]}, ${L[3]}, ${e}, ${f})`;
}

/** Ukuran kanvas hasil: tidak diperbesar melebihi resolusi asli, dan dibatasi `maxSize`. */
export function outputSize(st: CropState, maxSize: number): { cw: number; ch: number } {
  const r = Math.min(1 / st.k, maxSize / Math.max(st.frame.w, st.frame.h));
  return { cw: Math.max(1, Math.round(st.frame.w * r)), ch: Math.max(1, Math.round(st.frame.h * r)) };
}

/** Argumen ctx.setTransform(a,b,c,d,e,f) untuk menggambar gambar asli ke kanvas hasil. */
export function canvasMatrix(st: CropState, cw: number, ch: number): [number, number, number, number, number, number] {
  const L = linearOf(st);
  const sx = cw / st.frame.w;
  const sy = ch / st.frame.h;
  const a = sx * L[0];
  const c = sx * L[1];
  const b = sy * L[2];
  const d = sy * L[3];
  const e = sx * (st.cx - st.frame.x) - (a * st.W) / 2 - (c * st.H) / 2;
  const f = sy * (st.cy - st.frame.y) - (b * st.W) / 2 - (d * st.H) / 2;
  return [a, b, c, d, e, f];
}

export async function renderCrop(
  source: CanvasImageSource,
  st: CropState,
  maxSize: number,
  quality = 0.9,
): Promise<Blob> {
  const { cw, ch } = outputSize(st, maxSize);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(...canvasMatrix(st, cw, ch));
  ctx.drawImage(source, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar."))), "image/jpeg", quality),
  );
}
