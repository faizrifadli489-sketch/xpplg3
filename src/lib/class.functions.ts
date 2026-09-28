import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TimeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format jam tidak valid");
const DaySchema = z.number().int().min(1).max(5);

const ScheduleSchema = z.object({
  day_of_week: DaySchema,
  start_time: TimeSchema,
  end_time: TimeSchema,
  subject: z.string().trim().min(1).max(100),
  teacher: z.string().trim().max(100).nullable().optional(),
  room: z.string().trim().max(50).nullable().optional(),
});

const ScheduleUpdateSchema = ScheduleSchema.partial().extend({ id: z.string().uuid() });

const EventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
  event_time: TimeSchema.nullable().optional(),
  category: z.enum(["ujian", "tugas", "event", "libur"]),
  show_countdown: z.boolean(),
});

const EventUpdateSchema = EventSchema.partial().extend({ id: z.string().uuid() });

const IdSchema = z.object({ id: z.string().uuid() });

// ---------- Publik (dibaca siapa saja) ----------

export const listSchedule = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("schedule_entries")
    .select("*")
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listPiket = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("piket_assignments")
    .select("id, day_of_week, student_id, students(full_name, nickname)")
    .order("day_of_week", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listEvents = createServerFn({ method: "GET" }).handler(async () => {
  const { createServerPublicClient } = await import("@/lib/supabase-public.server");
  const supabasePublic = createServerPublicClient();

  const { data, error } = await supabasePublic
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true, nullsFirst: true });

  if (error) throw new Error(error.message);
  return data ?? [];
});

// ---------- Admin (dijaga RLS: hanya role admin yang lolos) ----------

export const createScheduleEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ScheduleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("schedule_entries")
      .insert({
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        subject: data.subject,
        teacher: data.teacher || null,
        room: data.room || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const updateScheduleEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ScheduleUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const updateData: {
      day_of_week?: number;
      start_time?: string;
      end_time?: string;
      subject?: string;
      teacher?: string | null;
      room?: string | null;
    } = {};
    if (data.day_of_week !== undefined) updateData.day_of_week = data.day_of_week;
    if (data.start_time !== undefined) updateData.start_time = data.start_time;
    if (data.end_time !== undefined) updateData.end_time = data.end_time;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.teacher !== undefined) updateData.teacher = data.teacher || null;
    if (data.room !== undefined) updateData.room = data.room || null;

    const { data: row, error } = await context.supabase
      .from("schedule_entries")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const deleteScheduleEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => IdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("schedule_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const addPiket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ day_of_week: DaySchema, student_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("piket_assignments")
      .insert({ day_of_week: data.day_of_week, student_id: data.student_id });

    if (error) {
      if (error.code === "23505") throw new Error("Siswa ini sudah terdaftar piket di hari tersebut.");
      throw new Error(error.message);
    }
    return { success: true };
  });

export const removePiket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => IdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("piket_assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => EventSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("events")
      .insert({
        title: data.title,
        description: data.description || null,
        event_date: data.event_date,
        event_time: data.event_time || null,
        category: data.category,
        show_countdown: data.show_countdown,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const updateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => EventUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const updateData: {
      title?: string;
      description?: string | null;
      event_date?: string;
      event_time?: string | null;
      category?: string;
      show_countdown?: boolean;
    } = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.event_date !== undefined) updateData.event_date = data.event_date;
    if (data.event_time !== undefined) updateData.event_time = data.event_time || null;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.show_countdown !== undefined) updateData.show_countdown = data.show_countdown;

    const { data: row, error } = await context.supabase
      .from("events")
      .update(updateData)
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => IdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });
