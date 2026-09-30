// Logika acak siswa. Memakai crypto.getRandomValues supaya benar-benar adil (tanpa bias modulo).

export type Person = { id: string; name: string };

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

/** Bagi rata ke `count` kelompok; selisih anggota antar kelompok maksimal 1. */
export function makeGroups(people: Person[], count: number): RandomResult {
  const n = Math.max(1, Math.min(count, people.length));
  const groups: Person[][] = Array.from({ length: n }, () => []);
  shuffle(people).forEach((p, i) => groups[i % n].push(p));
  groups.forEach((g) => g.sort((a, b) => a.name.localeCompare(b.name, "id")));
  return { mode: "groups", groups, total: people.length };
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
      lines.push(`Kelompok ${i + 1} (${g.length} orang)`);
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
      ? result.groups.map((g, i) => ({ title: `Kelompok ${i + 1} · ${g.length} orang`, names: g.map((p) => p.name) }))
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
