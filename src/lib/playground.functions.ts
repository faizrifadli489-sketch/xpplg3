import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_CODE = 100_000;

const CodeSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(100),
  description: z.string().trim().max(500).nullable().optional(),
  html: z.string().max(MAX_CODE, "HTML terlalu panjang (maks 100.000 karakter)"),
  css: z.string().max(MAX_CODE, "CSS terlalu panjang (maks 100.000 karakter)"),
  js: z.string().max(MAX_CODE, "JS terlalu panjang (maks 100.000 karakter)"),
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

// Satu karya lengkap dengan kodenya. null kalau slug tidak ada.
export const getPortfolioCode = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const { createServerPublicClient } = await import("@/lib/supabase-public.server");
    const supabasePublic = createServerPublicClient();

    const { data: row, error } = await supabasePublic
      .from("portfolio_codes")
      .select("id, slug, title, description, html, css, js, created_at, updated_at, students(id, full_name)")
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
        html: data.html,
        css: data.css,
        js: data.js,
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
        html: data.html,
        css: data.css,
        js: data.js,
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
