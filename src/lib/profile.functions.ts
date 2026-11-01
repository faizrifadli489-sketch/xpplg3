import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: studentId, error: idError } = await context.supabase.rpc("current_student_id");
    if (idError) throw new Error(idError.message);
    if (!studentId) return null;

    const { data: student, error } = await context.supabase
      .from("students")
      .select("id, full_name, nickname, photo_url")
      .eq("id", studentId)
      .single();
    if (error) throw new Error(error.message);

    const { data: account } = await context.supabase
      .from("student_accounts")
      .select("username")
      .eq("student_id", studentId)
      .maybeSingle();

    return { ...student, username: account?.username ?? null };
  });

// Siswa hanya bisa mengubah nama panggilan dan foto miliknya sendiri
// (dibatasi di fungsi database update_my_profile).
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        nickname: z.string().trim().max(30, "Nama panggilan maksimal 30 karakter").nullable().optional(),
        photo_url: z.string().url().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_my_profile", {
      _nickname: data.nickname ?? "",
      _photo_url: data.photo_url ?? "",
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

// Isi QR: 69944965.NISN.Nama Siswa. NISN dibatasi RLS: hanya pemilik (atau admin) yang bisa membaca.
export const getMyQrText = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: studentId } = await context.supabase.rpc("current_student_id");
    if (!studentId) return null;
    const { data: student } = await context.supabase.from("students").select("full_name").eq("id", studentId).single();
    const { data: priv } = await context.supabase
      .from("student_private")
      .select("nisn")
      .eq("student_id", studentId)
      .maybeSingle();
    if (!student || !priv) return { text: null as string | null };
    return { text: `69944965.${priv.nisn}.${student.full_name}` };
  });
