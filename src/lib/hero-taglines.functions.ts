import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TextSchema = z.string().trim().min(1, "Tidak boleh kosong").max(50, "Maksimal 50 karakter");

// Urutan tidak dijaga di sini karena tampilnya diacak di komponen typewriter.
export const listHeroTaglines = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("hero_taglines")
    .select("id, text")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
});

export const createHeroTagline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ text: TextSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("hero_taglines")
      .insert({ text: data.text })
      .select("id, text")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateHeroTagline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), text: TextSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("hero_taglines").update({ text: data.text }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const deleteHeroTagline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("hero_taglines").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
