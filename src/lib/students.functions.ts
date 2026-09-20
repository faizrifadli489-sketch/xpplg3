import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const StudentSchema = z.object({
  full_name: z.string().min(1),
  nickname: z.string().optional(),
  nis: z.string().optional(),
  gender: z.enum(["L", "P"]).optional(),
  photo_url: z.string().url().nullable().optional(),
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
        nis: data.nis ?? null,
        gender: data.gender ?? null,
        photo_url: data.photo_url ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
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
      nis?: string | null;
      gender?: "L" | "P" | null;
      photo_url?: string | null;
    } = {};
    if (data.full_name !== undefined) updateData.full_name = data.full_name;
    if (data.nickname !== undefined) updateData.nickname = data.nickname || null;
    if (data.nis !== undefined) updateData.nis = data.nis || null;
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

    return student;
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("students").delete().eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });
