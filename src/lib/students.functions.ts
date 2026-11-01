import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StudentSchema = z.object({
  full_name: z.string().min(1),
  nickname: z.string().optional(),
  gender: z.enum(["L", "P"]).optional(),
  photo_url: z.string().url().nullable().optional(),
  nisn: z.string().regex(/^[0-9]{5,20}$/, "NISN harus angka (5-20 digit)").optional().or(z.literal("")),
});

const StudentUpdateSchema = StudentSchema.partial().extend({
  id: z.string().uuid(),
});

export const listStudents = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("students")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
});

export const getStudent = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { createServerPublicClient } = await import("@/lib/supabase-public.server");
    const supabasePublic = createServerPublicClient();

    const { data: student, error } = await supabasePublic.from("students").select("*").eq("id", data.id).single();

    if (error) {
      throw new Error(error.message);
    }

    return student;
  });

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => StudentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: student, error } = await context.supabase
      .from("students")
      .insert({
        full_name: data.full_name,
        nickname: data.nickname ?? null,
        gender: data.gender ?? null,
        photo_url: data.photo_url ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (data.nisn) {
      const { error: e2 } = await context.supabase
        .from("student_private")
        .upsert({ student_id: student.id, nisn: data.nisn, updated_at: new Date().toISOString() });
      if (e2) throw new Error(e2.message);
    }

    return student;
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => StudentUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const updateData: {
      full_name?: string;
      nickname?: string | null;
      gender?: "L" | "P" | null;
      photo_url?: string | null;
    } = {};
    if (data.full_name !== undefined) updateData.full_name = data.full_name;
    if (data.nickname !== undefined) updateData.nickname = data.nickname || null;
    if (data.gender !== undefined) updateData.gender = data.gender ?? null;
    if (data.photo_url !== undefined) updateData.photo_url = data.photo_url || null;

    const { data: student, error } = await context.supabase
      .from("students")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (data.nisn !== undefined) {
      const q = data.nisn
        ? context.supabase
            .from("student_private")
            .upsert({ student_id: data.id, nisn: data.nisn, updated_at: new Date().toISOString() })
        : context.supabase.from("student_private").delete().eq("student_id", data.id);
      const { error: e2 } = await q;
      if (e2) throw new Error(e2.message);
    }

    return student;
  });

// Khusus admin (dibatasi RLS): daftar NISN semua siswa untuk form edit.
export const listStudentNisn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("student_private").select("student_id, nisn");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Kalau siswa punya akun login, akun Auth-nya ikut dihapus setelah datanya terhapus.
    const { data: account } = await context.supabase
      .from("student_accounts")
      .select("user_id")
      .eq("student_id", data.id)
      .maybeSingle();

    const { error } = await context.supabase.from("students").delete().eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }

    if (account?.user_id) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.auth.admin.deleteUser(account.user_id);
      } catch (err) {
        console.error("Gagal menghapus akun Auth siswa:", err);
      }
    }

    return { success: true };
  });
