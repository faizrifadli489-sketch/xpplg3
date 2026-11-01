// Logika acak siswa. Memakai crypto.getRandomValues supaya benar-benar adil (tanpa bias modulo).

export type Gender = "L" | "P";
export type Person = { id: string; name: string; gender: Gender | null };

export function genderCounts(people: Person[]) {
  let l = 0;
  let p = 0;
  for (const x of people) {
    if (x.gender === "L") l++;
    else if (x.gender === "P") p++;
  }
  return { l, p, hasGender: l + p > 0 };
}

export type RandomResult =
  | { mode: "groups"; groups: Person[][]; total: number }
  | { mode: "pick"; picked: Person[]; total: number };

function randInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % maxExclusive;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/** Bagi `total` ke `n` bagian yang selisihnya maksimal 1; bagian mana yang lebih besar diacak. */
function evenSizes(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const sizes = Array.from({ length: n }, () => base);
  shuffle(range(n))
    .slice(0, total % n)
    .forEach((i) => (sizes[i] += 1));
  return sizes;
}

/** Bulatkan angka desimal jadi bilangan bulat dengan jumlah tepat `target` (sisa dibagi acak). */
function roundToTotal(values: number[], target: number): number[] {
  const out = values.map((v) => Math.floor(v + 1e-9));
  const order = shuffle(range(values.length)).sort((a, b) => values[b] - out[b] - (values[a] - out[a]));
  let remaining = target - out.reduce((x, y) => x + y, 0);
  for (let i = 0; remaining > 0; i++, remaining--) out[order[i % out.length]]++;
  for (let i = 0; remaining < 0 && i < out.length * 4; i++) {
    const idx = order[order.length - 1 - (i % order.length)];
    if (out[idx] > 0) {
      out[idx]--;
      remaining++;
    }
  }
  return out;
}

function sliceGroups(order: Person[], sizes: number[]): Person[][] {
  let cursor = 0;
  return sizes.map((size) => {
    const g = order.slice(cursor, cursor + size);
    cursor += size;
    return g;
  });
}

/**
 * Bagi ke `count` kelompok (ukuran selisih maksimal 1, kecuali pada mode sejenis penuh).
 *
 * `genderMix` (0-100) mengatur komposisi gender per kelompok:
 *   0   = acak biasa, gender tidak dipertimbangkan
 *   50  = seimbang: tiap kelompok punya perbandingan cowok:cewek yang sama
 *   100 = tiap kelompok hanya berisi satu gender
 * Nilai di antaranya digeser secara bertahap (0-50: acak -> seimbang, 50-100: seimbang -> sejenis).
 *
 * Nama di dalam kelompok tidak diurutkan A-Z, dan kelompok yang kebagian anggota lebih diacak.
 */
export function makeGroups(people: Person[], count: number, genderMix = 0): RandomResult {
  const n = Math.max(1, Math.min(count, people.length));
  const mix = Math.max(0, Math.min(100, genderMix));
  const males = people.filter((p) => p.gender === "L");
  const females = people.filter((p) => p.gender === "P");
  const unknown = people.filter((p) => !p.gender);
  const M = males.length;
  const F = females.length;
  const K = M + F;

  if (mix === 0 || n < 2 || M === 0 || F === 0 || K < n) {
    const groups = sliceGroups(shuffle(people), evenSizes(people.length, n));
    return { mode: "groups", groups, total: people.length };
  }

  const s0 = evenSizes(K, n);

  // Tata letak acak murni (R): jumlah cewek per kelompok dari pengocokan biasa.
  const dealt = sliceGroups(shuffle([...males, ...females]), s0);
  const fR = dealt.map((g) => g.filter((p) => p.gender === "P").length);

  // Tata letak seimbang (B): jumlah cewek per kelompok proporsional dengan ukurannya.
  const fB = roundToTotal(
    s0.map((sz) => (sz * F) / K),
    F,
  );

  let sizes = s0;
  let fem: number[];

  if (mix <= 50) {
    const t = mix / 50;
    fem = roundToTotal(
      fR.map((v, g) => (1 - t) * v + t * fB[g]),
      F,
    );
  } else {
    const t = (mix - 50) / 50;

    // Tata letak sejenis (H): sebagian kelompok khusus cowok, sisanya khusus cewek.
    let best: number[] = [];
    let bestDiff = Infinity;
    for (let km = Math.max(1, n - F); km <= Math.min(M, n - 1); km++) {
      const diff = Math.abs(M / km - F / (n - km));
      if (diff < bestDiff - 1e-9) {
        bestDiff = diff;
        best = [km];
      } else if (Math.abs(diff - bestDiff) < 1e-9) best.push(km);
    }
    const km = best[randInt(best.length)];
    const kf = n - km;
    const femaleSizes = evenSizes(F, kf);
    const maleSizes = evenSizes(M, km);

    // Kelompok yang di tata letak seimbang paling banyak ceweknya dijadikan kelompok cewek (agar peralihan halus).
    const idx = shuffle(range(n)).sort((a, b) => fB[b] / s0[b] - fB[a] / s0[a]);
    const sH = Array.from({ length: n }, () => 0);
    const fH = Array.from({ length: n }, () => 0);
    idx.forEach((g, i) => {
      if (i < kf) {
        sH[g] = femaleSizes[i];
        fH[g] = femaleSizes[i];
      } else {
        sH[g] = maleSizes[i - kf];
      }
    });

    sizes = roundToTotal(
      s0.map((v, g) => (1 - t) * v + t * sH[g]),
      K,
    );
    fem = roundToTotal(
      fB.map((v, g) => (1 - t) * v + t * fH[g]),
      F,
    );
  }

  // Pastikan jumlah cewek tidak melebihi ukuran kelompok (efek pembulatan).
  for (let g = 0; g < n; g++) {
    while (fem[g] > sizes[g]) {
      const h = shuffle(range(n)).find((x) => fem[x] < sizes[x]);
      if (h === undefined) break;
      fem[g]--;
      fem[h]++;
    }
  }

  const femaleQueue = shuffle(females);
  const maleQueue = shuffle(males);
  const groups = sizes.map((size, g) => {
    const fs = femaleQueue.splice(0, fem[g]);
    const ms = maleQueue.splice(0, Math.max(0, size - fem[g]));
    return [...fs, ...ms];
  });

  // Siswa tanpa data gender ditaruh di kelompok yang paling sedikit anggotanya.
  for (const u of shuffle(unknown)) {
    const smallest = Math.min(...groups.map((g) => g.length));
    const candidates = range(n).filter((g) => groups[g].length === smallest);
    groups[candidates[randInt(candidates.length)]].push(u);
  }

  return { mode: "groups", groups: groups.map((g) => shuffle(g)), total: people.length };
}

/** Ambil `count` siswa secara acak; urutan hasil = urutan terpilih. */
export function pickPeople(people: Person[], count: number): RandomResult {
  const n = Math.max(1, Math.min(count, people.length));
  return { mode: "pick", picked: shuffle(people).slice(0, n), total: people.length };
}

export function resultToText(result: RandomResult, dateLabel: string): string {
  if (result.mode === "groups") {
    const lines = [`Pembagian Kelompok X PPLG 3 (${dateLabel})`, ""];
    result.groups.forEach((g, i) => {
      const gc = genderCounts(g);
      lines.push(
        `Kelompok ${i + 1} (${g.length} orang${gc.hasGender ? `: ${gc.l} cowok, ${gc.p} cewek` : ""})`,
      );
      g.forEach((p, j) => lines.push(`${j + 1}. ${p.name}`));
      lines.push("");
    });
    return lines.join("\n").trim();
  }
  const lines = [`Siswa Terpilih X PPLG 3 (${dateLabel})`, ""];
  result.picked.forEach((p, i) => lines.push(`${i + 1}. ${p.name}`));
  return lines.join("\n");
}

// ---------- Gambar hasil (canvas, tanpa library) ----------

const TEAL = "#12786b";
const INK = "#16302c";
const MUTED = "#5b706c";
const BG = "#f6f8f7";
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

export function renderResultImage(result: RandomResult, dateLabel: string): Promise<Blob> {
  const W = 1080;
  const PAD = 48;
  const GAP = 24;
  const LINE = 44;
  const HEAD = 64;
  const title = result.mode === "groups" ? "Pembagian Kelompok" : "Siswa Terpilih";

  const cards: { title: string; names: string[] }[] =
    result.mode === "groups"
      ? result.groups.map((g, i) => {
          const gc = genderCounts(g);
          return {
            title: `Kelompok ${i + 1} · ${g.length} orang${gc.hasGender ? ` · ${gc.l}L ${gc.p}P` : ""}`,
            names: g.map((p) => p.name),
          };
        })
      : [{ title: `${result.picked.length} siswa terpilih`, names: result.picked.map((p) => p.name) }];

  const cols = result.mode === "groups" ? 2 : 1;
  const cardW = (W - PAD * 2 - GAP * (cols - 1)) / cols;
  const cardH = (c: { names: string[] }) => HEAD + 20 + c.names.length * LINE + 16;

  const rows: number[] = [];
  for (let i = 0; i < cards.length; i += cols) {
    rows.push(Math.max(...cards.slice(i, i + cols).map(cardH)));
  }
  const headerH = 170;
  const footerH = 80;
  const H = headerH + rows.reduce((a, b) => a + b + GAP, 0) + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas tidak didukung."));

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = "#fff";
  ctx.font = `700 46px ${FONT}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(title, PAD, 62);
  ctx.font = `400 26px ${FONT}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText(`X PPLG 3 · ${dateLabel}`, PAD, 102);
  ctx.globalAlpha = 1;

  // Kartu
  let y = headerH - 20;
  cards.forEach((c, i) => {
    const col = i % cols;
    const rowIdx = Math.floor(i / cols);
    if (col === 0 && i > 0) y += rows[rowIdx - 1] + GAP;
    const x = PAD + col * (cardW + GAP);
    const h = rows[rowIdx];

    ctx.fillStyle = "#fff";
    roundRect(ctx, x, y, cardW, h, 20);
    ctx.fill();
    ctx.strokeStyle = "#dbe5e2";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cardW, h, 20);
    ctx.stroke();

    ctx.save();
    roundRect(ctx, x, y, cardW, h, 20);
    ctx.clip();
    ctx.fillStyle = TEAL;
    ctx.fillRect(x, y, cardW, HEAD);
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font = `700 28px ${FONT}`;
    ctx.fillText(fit(ctx, c.title, cardW - 40), x + 20, y + 42);

    ctx.font = `400 28px ${FONT}`;
    c.names.forEach((n, j) => {
      const ly = y + HEAD + 20 + j * LINE + 30;
      ctx.fillStyle = MUTED;
      ctx.fillText(`${j + 1}.`, x + 20, ly);
      ctx.fillStyle = INK;
      ctx.fillText(fit(ctx, n, cardW - 92), x + 72, ly);
    });
  });

  ctx.fillStyle = MUTED;
  ctx.font = `400 22px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("xpplg3.vercel.app/acak", W / 2, H - 30);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar."))), "image/png"),
  );
}
