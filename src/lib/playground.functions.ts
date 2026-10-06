import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_FILE_CHARS, MAX_FILES, MAX_TOTAL_CHARS } from "@/lib/ide-files";

const SEGMENT = /^[A-Za-z0-9._-]{1,100}$/;

const FileSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(200)
    .refine(
      (p) => p.split("/").length <= 6 && p.split("/").every((s) => SEGMENT.test(s) && s !== "." && s !== ".."),
      "Nama file tidak valid",
    ),
  content: z.string().max(MAX_FILE_CHARS, "Satu file terlalu panjang (maks 100.000 karakter)"),
});

const FilesSchema = z
  .array(FileSchema)
  .min(1, "Minimal harus ada 1 file")
  .max(MAX_FILES, `Maksimal ${MAX_FILES} file`)
  .superRefine((files, ctx) => {
    const seen = new Set<string>();
    let total = 0;
    for (const f of files) {
      if (seen.has(f.path)) ctx.addIssue({ code: "custom", message: `File ganda: ${f.path}` });
      seen.add(f.path);
      total += f.content.length;
    }
    if (total > MAX_TOTAL_CHARS) ctx.addIssue({ code: "custom", message: "Total isi proyek terlalu besar (maks 300.000 karakter)" });
  });

const CodeSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(100),
  description: z.string().trim().max(500).nullable().optional(),
  files: FilesSchema,
});

function slugify(text: string) {
  const base = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "karya"}-${suffix}`;
}

// Daftar publik (tanpa isi kode, supaya ringan).
export const listPortfolioCodes = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("portfolio_codes")
    .select("id, slug, title, description, created_at, updated_at, students(id, full_name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
});

// Satu karya lengkap dengan semua filenya. null kalau slug tidak ada.
export const getPortfolioCode = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const { createServerPublicClient } = await import("@/lib/supabase-public.server");
    const supabasePublic = createServerPublicClient();

    const { data: row, error } = await supabasePublic
      .from("portfolio_codes")
      .select("id, slug, title, description, files, created_at, updated_at, students(id, full_name)")
      .eq("slug", data.slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return row ?? null;
  });

// Publish karya baru atas nama siswa yang login.
export const createPortfolioCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CodeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: studentId, error: idError } = await context.supabase.rpc("current_student_id");
    if (idError) throw new Error(idError.message);
    if (!studentId) throw new Error("Hanya siswa yang punya akun kelas yang bisa mempublikasikan karya.");

    const { data: row, error } = await context.supabase
      .from("portfolio_codes")
      .insert({
        slug: slugify(data.title),
        title: data.title,
        description: data.description || null,
        files: data.files,
        creator_student_id: studentId,
      })
      .select("id, slug")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

// RLS memastikan hanya pemilik atau admin yang bisa mengubah.
export const updatePortfolioCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CodeSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("portfolio_codes")
      .update({
        title: data.title,
        description: data.description || null,
        files: data.files,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select("id, slug")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const deletePortfolioCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("portfolio_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// Proyek tersimpan (terikat akun login). RLS: pemilik penuh, user lain hanya bisa baca yang "open".

const VisibilitySchema = z.enum(["open", "closed"]);
const ProjectNameSchema = z.string().trim().min(1, "Nama proyek wajib diisi").max(100);

// Daftar proyek milik user (tanpa isi file, supaya ringan).
export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("playground_projects")
      .select("id, name, visibility, updated_at")
      .eq("owner_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Daftar proyek open source milik user lain.
export const listOpenProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("playground_projects")
      .select("id, name, updated_at")
      .eq("visibility", "open")
      .neq("owner_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("playground_projects")
      .select("id, owner_id, name, files, visibility, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ name: ProjectNameSchema, visibility: VisibilitySchema, files: FilesSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("playground_projects")
      .insert({ owner_id: context.userId, name: data.name, visibility: data.visibility, files: data.files })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), name: ProjectNameSchema.optional(), visibility: VisibilitySchema.optional(), files: FilesSchema.optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("playground_projects")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", context.userId)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("playground_projects").delete().eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// Menjalankan kode (Python, C, C++, Java, PHP, SQL) lewat server eksekusi luar.
//
// Konfigurasi lewat environment variable (server saja, tidak pernah dikirim ke browser):
//   EXEC_PROVIDER     "judge0" (default) atau "piston"
//   EXEC_API_URL      judge0: default https://ce.judge0.com   |  piston: wajib (mis. http://host:2000/api/v2)
//   EXEC_API_KEY      opsional. judge0: dikirim sebagai X-Auth-Token, atau X-RapidAPI-Key kalau EXEC_API_HOST diisi
//   EXEC_API_HOST     opsional, host RapidAPI (mis. judge0-ce.p.rapidapi.com)
//   EXEC_DAILY_LIMIT  batas jalan per akun per hari (default 40)
//
// Catatan: Judge0 menjalankan SATU file (file yang sedang dibuka). Piston menjalankan semua file proyek.
// ---------------------------------------------------------------------------

const RunSchema = z.object({
  language: z.enum(["python", "c", "cpp", "java", "php", "sqlite"]),
  entry: z.string().min(1).max(200),
  files: FilesSchema,
  stdin: z.string().max(10_000).optional(),
});

type RunOut = {
  language: string;
  status: string;
  stdout: string;
  stderr: string;
  compile: string;
  exitCode: number | null;
  time: string | null;
};

const JUDGE0_ID: Record<string, number> = { python: 71, c: 50, cpp: 54, java: 62, php: 68, sqlite: 82 };
const PISTON_NAME: Record<string, string> = { python: "python", c: "c", cpp: "c++", java: "java", php: "php", sqlite: "sqlite3" };
const LABEL: Record<string, string> = { python: "Python", c: "C", cpp: "C++", java: "Java", php: "PHP", sqlite: "SQL (SQLite)" };

// base64 yang aman untuk UTF-8 dan tidak bergantung pada Buffer.
function b64encode(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64decode(b64: string | null | undefined) {
  if (!b64) return "";
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const clip = (s: string) => (s.length > 20_000 ? s.slice(0, 20_000) + "\n...(dipotong)" : s);

async function runJudge0(input: z.infer<typeof RunSchema>): Promise<RunOut> {
  const base = (process.env["EXEC_API_URL"] || "https://ce.judge0.com").replace(/\/$/, "");
  const key = process.env["EXEC_API_KEY"];
  const host = process.env["EXEC_API_HOST"];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (host && key) {
    headers["X-RapidAPI-Key"] = key;
    headers["X-RapidAPI-Host"] = host;
  } else if (key) {
    headers["X-Auth-Token"] = key;
  }

  const entry = input.files.find((f) => f.path === input.entry);
  if (!entry) throw new Error("File yang dijalankan tidak ditemukan.");

  const fields = "stdout,stderr,compile_output,message,status,time,exit_code";
  const submit = await fetch(`${base}/submissions?base64_encoded=true&wait=false`, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      language_id: JUDGE0_ID[input.language],
      source_code: b64encode(entry.content),
      stdin: b64encode(input.stdin ?? ""),
      cpu_time_limit: 5,
      wall_time_limit: 10,
    }),
  });
  if (!submit.ok) throw new Error(`Server eksekusi menolak permintaan (HTTP ${submit.status}).`);
  const { token } = (await submit.json()) as { token?: string };
  if (!token) throw new Error("Server eksekusi tidak mengembalikan token.");

  // Polling sampai selesai (status id 1 = antre, 2 = diproses), maksimal ± 20 detik.
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, i < 3 ? 600 : 1000));
    const res = await fetch(`${base}/submissions/${token}?base64_encoded=true&fields=${fields}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Gagal mengambil hasil (HTTP ${res.status}).`);
    const j = (await res.json()) as {
      stdout?: string | null;
      stderr?: string | null;
      compile_output?: string | null;
      message?: string | null;
      status?: { id: number; description: string };
      time?: string | null;
      exit_code?: number | null;
    };
    if (j.status && j.status.id <= 2) continue;
    return {
      language: LABEL[input.language],
      status: j.status?.description ?? "Selesai",
      stdout: clip(b64decode(j.stdout)),
      stderr: clip([b64decode(j.stderr), b64decode(j.message)].filter(Boolean).join("\n")),
      compile: clip(b64decode(j.compile_output)),
      exitCode: j.exit_code ?? null,
      time: j.time ?? null,
    };
  }
  throw new Error("Eksekusi terlalu lama. Coba lagi nanti.");
}

async function runPiston(input: z.infer<typeof RunSchema>): Promise<RunOut> {
  const base = process.env["EXEC_API_URL"]?.replace(/\/$/, "");
  if (!base) throw new Error("EXEC_API_URL belum diisi untuk provider Piston.");
  const key = process.env["EXEC_API_KEY"];

  // File yang dijalankan ditaruh paling depan (Piston menjalankan file pertama).
  const ordered = [...input.files].sort((a, b) => (a.path === input.entry ? -1 : b.path === input.entry ? 1 : 0));

  const res = await fetch(`${base}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: key } : {}) },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      language: PISTON_NAME[input.language],
      version: "*",
      files: ordered.map((f) => ({ name: f.path, content: f.content })),
      stdin: input.stdin ?? "",
      compile_timeout: 10_000,
      run_timeout: 5_000,
    }),
  });
  if (!res.ok) throw new Error(`Server eksekusi menolak permintaan (HTTP ${res.status}).`);
  const j = (await res.json()) as {
    run?: { stdout?: string; stderr?: string; code?: number | null; signal?: string | null };
    compile?: { stdout?: string; stderr?: string; code?: number | null };
    message?: string;
  };
  if (j.message && !j.run) throw new Error(j.message);
  const compileFailed = j.compile && j.compile.code !== 0 && j.compile.code != null;
  return {
    language: LABEL[input.language],
    status: compileFailed ? "Compile error" : j.run?.signal ? `Dihentikan (${j.run.signal})` : j.run?.code === 0 ? "Selesai" : "Selesai dengan error",
    stdout: clip(j.run?.stdout ?? ""),
    stderr: clip(j.run?.stderr ?? ""),
    compile: clip([j.compile?.stdout, j.compile?.stderr].filter(Boolean).join("\n")),
    exitCode: j.run?.code ?? null,
    time: null,
  };
}

// Wajib login (menjaga kuota API luar) dan dibatasi per akun per hari.
export const runPlaygroundCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => RunSchema.parse(data))
  .handler(async ({ data, context }): Promise<RunOut> => {
    const limit = Math.max(1, Number(process.env["EXEC_DAILY_LIMIT"]) || 40);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null; error: { message: string } | null }>;
    };
    const { data: allowed, error: usageError } = await admin.rpc("code_run_bump", { _user_id: context.userId, _limit: limit });
    if (usageError) throw new Error("Gagal memeriksa kuota. Coba lagi.");
    if (!allowed) throw new Error(`Batas ${limit} kali jalan hari ini sudah habis. Coba lagi besok ya.`);

    try {
      return process.env["EXEC_PROVIDER"] === "piston" ? await runPiston(data) : await runJudge0(data);
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") throw new Error("Server eksekusi tidak merespons. Coba lagi nanti.");
      throw err;
    }
  });
