import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProjectSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(100),
  description: z.string().trim().max(500).nullable().optional(),
  project_url: z.string().trim().url("URL tidak valid").nullable().optional().or(z.literal("")),
  image_url: z.string().url().nullable().optional(),
  team_note: z.string().trim().max(150).nullable().optional(),
});

// Dipakai admin untuk menambah/mengedit karya atas nama siswa manapun.
const ProjectAdminSchema = ProjectSchema.extend({
  creator_student_id: z.string().uuid().nullable().optional(),
});

export const listPortfolio = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("portfolio_projects")
    .select("id, title, description, project_url, image_url, team_note, created_at, students(id, full_name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
});

// Siswa menambah karya atas nama akunnya sendiri (RLS memastikan creator_student_id
// harus sama dengan akun yang login, kecuali admin lewat createPortfolioAsAdmin).
export const createMyPortfolioProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProjectSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: studentId, error: idError } = await context.supabase.rpc("current_student_id");
    if (idError) throw new Error(idError.message);
    if (!studentId) throw new Error("Hanya siswa yang punya akun kelas yang bisa menambah karya.");

    const { data: row, error } = await context.supabase
      .from("portfolio_projects")
      .insert({
        title: data.title,
        description: data.description || null,
        project_url: data.project_url || null,
        image_url: data.image_url || null,
        team_note: data.team_note || null,
        creator_student_id: studentId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const updatePortfolioProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProjectAdminSchema.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData["title"] = data.title;
    if (data.description !== undefined) updateData["description"] = data.description || null;
    if (data.project_url !== undefined) updateData["project_url"] = data.project_url || null;
    if (data.image_url !== undefined) updateData["image_url"] = data.image_url || null;
    if (data.team_note !== undefined) updateData["team_note"] = data.team_note || null;
    if (data.creator_student_id !== undefined) updateData["creator_student_id"] = data.creator_student_id || null;

    // RLS: baris ini cuma bisa diupdate kalau pemiliknya sendiri, atau akun admin.
    const { data: row, error } = await context.supabase
      .from("portfolio_projects")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const deletePortfolioProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("portfolio_projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// Admin menambah karya atas nama siswa tertentu (misal input manual dari data lama).
export const createPortfolioAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProjectAdminSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("portfolio_projects")
      .insert({
        title: data.title,
        description: data.description || null,
        project_url: data.project_url || null,
        image_url: data.image_url || null,
        team_note: data.team_note || null,
        creator_student_id: data.creator_student_id || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });
