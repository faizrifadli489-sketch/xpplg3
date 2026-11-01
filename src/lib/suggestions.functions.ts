import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SuggestionSchema = z.object({
  message: z.string().trim().min(5, "Pesan minimal 5 karakter").max(1000, "Pesan maksimal 1000 karakter"),
  category: z.enum(["saran", "kritik", "pertanyaan", "lainnya"]),
  is_anonymous: z.boolean(),
});

// Hanya siswa yang punya akun boleh kirim (dijaga juga oleh RLS + batas 5 pesan/hari di database).
export const sendSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => SuggestionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: studentId, error: idError } = await context.supabase.rpc("current_student_id");
    if (idError) throw new Error(idError.message);
    if (!studentId) throw new Error("Hanya siswa yang punya akun kelas yang bisa mengirim pesan.");

    const { error } = await context.supabase.from("suggestions").insert({
      message: data.message,
      category: data.category,
      is_anonymous: data.is_anonymous,
      student_id: studentId,
    });

    if (error) throw new Error(error.message);
    return { success: true };
  });

// Untuk admin. Pesan anonim dikirim TANPA identitas pengirim ke dashboard.
export const listSuggestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("suggestions")
      .select("id, message, category, is_anonymous, is_read, created_at, students(full_name)")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      message: row.message,
      category: row.category,
      is_anonymous: row.is_anonymous,
      is_read: row.is_read,
      created_at: row.created_at,
      sender_name: row.is_anonymous ? null : (row.students?.full_name ?? "(siswa sudah dihapus)"),
    }));
  });

export const setSuggestionRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), is_read: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("suggestions").update({ is_read: data.is_read }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("suggestions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
