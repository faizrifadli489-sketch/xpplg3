import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEYS = ["visi", "misi", "motto", "motto_arti"] as const;

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic.from("site_content").select("key, value");
  if (error) throw new Error(error.message);

  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value])) as Record<string, string>;
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        visi: z.string().trim().max(1000),
        misi: z.string().trim().max(2000),
        motto: z.string().trim().max(150),
        motto_arti: z.string().trim().max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const rows = KEYS.map((key) => ({ key, value: data[key] }));
    const { error } = await context.supabase.from("site_content").upsert(rows, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { success: true };
  });
