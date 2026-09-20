import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OrgPositionSchema = z.object({
  title: z.string().min(1),
  order_index: z.number().int().default(0),
  student_name: z.string().min(1),
  student_id: z.string().uuid().optional(),
});

const OrgPositionUpdateSchema = OrgPositionSchema.partial().extend({
  id: z.string().uuid(),
});

export const listOrgPositions = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("org_positions")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
});

export const createOrgPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => OrgPositionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: position, error } = await context.supabase
      .from("org_positions")
      .insert({
        title: data.title,
        order_index: data.order_index,
        student_name: data.student_name,
        student_id: data.student_id ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return position;
  });

export const updateOrgPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => OrgPositionUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const updateData: {
      title?: string;
      order_index?: number;
      student_name?: string;
      student_id?: string | null;
    } = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.order_index !== undefined) updateData.order_index = data.order_index;
    if (data.student_name !== undefined) updateData.student_name = data.student_name;
    if (data.student_id !== undefined) updateData.student_id = data.student_id ?? null;

    const { data: position, error } = await context.supabase
      .from("org_positions")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return position;
  });

export const deleteOrgPosition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("org_positions").delete().eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  });
