import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SetupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const checkNeedsSetup = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message);
  }

  return { needsSetup: (count ?? 0) === 0 };
});

export const setupFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((data) => SetupSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw new Error(countError.message);
    }

    if ((count ?? 0) > 0) {
      throw new Error("Setup has already been completed.");
    }

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (createError || !userData.user) {
      throw new Error(createError?.message ?? "Failed to create admin account.");
    }

    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userData.user.id,
      role: "admin",
    });

    if (roleError) {
      throw new Error(roleError.message);
    }

    return { success: true };
  });
